# Fase 5 — AWS WAF sobre CloudFront

> Diseño para una **tarea de la Fase 5** (Seguridad, observabilidad y *hardening*). Objetivo: proteger las superficies públicas del proyecto con **AWS WAF** (reglas administradas + *rate limiting*), sin introducir falsos positivos sobre el tráfico legacy del rehost.
>
> Fecha: 2026-08-04. Contexto del plan: `plan-trabajo-app-ventas-aws.md` §Fase 5 (`- [ ] AWS WAF sobre CloudFront/API`).

---

## 1. Motivación

Las superficies públicas del proyecto (Angular 20, Angular 14 legacy, APIs Node del rehost, páginas PHP server-rendered) están hoy expuestas solo con autenticación de aplicación (Cognito JWT / Basic Auth). No hay una capa de red que filtre patrones de ataque conocidos, IPs maliciosas ni abuso por volumen. WAF agrega esa capa **antes** de que el request llegue al origen.

## 2. Restricción arquitectónica clave

**AWS WAF no soporta API Gateway HTTP API (v2).** `AssociateWebACL` solo admite CloudFront, ALB, API Gateway **REST** (v1), AppSync, Cognito user pool y App Runner. Ambas HTTP APIs del proyecto (la Cognito de la app nueva y la Node del rehost) son **v2**, así que WAF solo puede aplicarse donde un recurso soportado las fronte.

Referencias:
- `AssociateWebACL` (recursos soportados): https://docs.aws.amazon.com/waf/latest/APIReference/API_AssociateWebACL.html
- WAF + API Gateway es solo REST: https://docs.amazonaws.cn/en_us/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html

Mapa de superficies:

| Superficie | ¿WAF-adjuntable? | Vía |
|---|---|---|
| `Frontend` CloudFront (Angular 20 nuevo) | ✅ | Web ACL scope CLOUDFRONT |
| `RehostRouter` CloudFront (fronte node API `/api/node/*`, `/sales`, `/orders` + PHP `/Distribuidor*`, `/SerfelWeb*` vía ALB) | ✅ | Web ACL scope CLOUDFRONT |
| `RehostLegacyFrontend` CloudFront (StaticSite Angular 14; es el origen `/*` del Router pero su distribución propia es públicamente alcanzable) | ✅ | Web ACL scope CLOUDFRONT |
| ALB interno del rehost | ✅ (REGIONAL) | **No se usa** — ya queda cubierto por el WAF del Router que lo fronte |
| **HTTP API Cognito de la app nueva** (`apiUrl`, llamada directa por Angular) | ❌ | No está detrás de CloudFront → WAF no la alcanza |

### 2.1 Decisión sobre la API nueva sin cobertura WAF

La HTTP API de la app nueva se llama directamente en su URL `execute-api` (`apps/frontend` usa `APP_API_URL = apiUrl` crudo). WAF no tiene dónde adjuntarse. **Decisión (brainstorming 2026-08-04):** se deja **sin WAF por ahora**; sigue protegida por el autorizador Cognito JWT. Se documenta como *carry-forward* de prod: si en Fase 6 se quiere WAF sobre esa API, la opción es frontearla con CloudFront (que además cerraría el *carry-forward* de CORS de la Fase 3, dejándola *same-origin*). Fuera del alcance de esta tarea.

## 3. Arquitectura

Un **único `aws.wafv2.WebAcl`** (recurso Pulumi crudo) con `scope: "CLOUDFRONT"`, creado en `us-east-1` (donde ya vive todo el stack — los Web ACL de CloudFront **deben** crearse en `us-east-1`). Vive en un archivo nuevo `infra/waf.ts` que exporta `webAclArn`.

- **Acción por defecto:** `Allow` (solo se bloquea ante *match* de regla).
- **Tag:** `serfel:stack = serfel-shared` — es infraestructura de seguridad transversal a las dos apps, consistente con `docs/superpowers/specs/2026-08-02-phase5-resource-tagging-design.md` (los recursos compartidos llevan `serfel-shared`).
- **Orden de importación en `sst.config.ts`:** `infra/waf` se importa **antes** de `infra/frontend` y `infra/rehost/cdn`, para que ambos puedan leer `webAclArn`. El módulo no tiene dependencias, así que puede importarse temprano (p. ej. justo después de `oidc`).

### 3.1 Mecanismo de adjunción

El componente `Cdn` de SST expone un input de primera clase `webAclArn` (`.sst/platform/src/components/aws/cdn.ts:255`) que mapea al campo `webAclId` de la distribución (`cdn.ts:417`). Tanto `StaticSite` como `Router` exponen `transform.cdn`, que recibe los args del componente `Cdn`. Se adjunta el ACL fijando `args.webAclArn = webAclArn` en el `transform.cdn` de cada distribución.

**No** se usa un recurso de asociación aparte: para scope CLOUDFRONT la asociación **es** el `webAclId` en la distribución, no la API `AssociateWebACL` (esa es solo para recursos REGIONAL como ALB). El campo `webAclArn` es distinto del mecanismo de `tags` que falló para las StaticSite en la tarea de etiquetado, así que aquí no hay *workaround*.

Se adjunta el **mismo** Web ACL a las **tres** distribuciones (asociaciones múltiples de un solo ACL, sin costo adicional por asociación):

| Distribución | Archivo | Cómo |
|---|---|---|
| `Frontend` | `infra/frontend.ts` | agregar `transform.cdn` → `args.webAclArn = webAclArn` |
| `RehostRouter` | `infra/rehost/cdn.ts` | en el `transform.cdn` existente, agregar `args.webAclArn = webAclArn` |
| `RehostLegacyFrontend` | `infra/rehost/legacy-frontend.ts` | agregar `transform.cdn` → `args.webAclArn = webAclArn` |

Adjuntar el ACL a `RehostLegacyFrontend` cierra el *bypass*: su distribución propia es públicamente alcanzable en su URL, saltándose el WAF del Router si no se cubre.

## 4. Reglas

Evaluadas en orden de prioridad; acción por defecto del ACL: `Allow`.

| Prio | Regla | Tipo | Acción |
|---|---|---|---|
| 0 | `AWSManagedRulesAmazonIpReputationList` | grupo administrado AWS | Block (defaults del vendor) |
| 1 | `AWSManagedRulesKnownBadInputsRuleSet` | grupo administrado AWS | Block (defaults del vendor) |
| 2 | `serfel-rate-limit` | *rate-based* | **Block**, `limit: 1000` por ventana deslizante de 5 min, agregación por IP de origen |

- Cada regla con `visibilityConfig`: **CloudWatch metrics on** + **sampled requests on** (ambos integrados, sin costo extra).
- **Sin Core Rule Set (CRS)** — decisión deliberada. Evita que `SizeRestrictions_BODY` (bloquea cuerpos >8 KB) y las reglas XSS-sobre-JSON generen falsos positivos en los *POST* de formularios PHP y en la node API del rehost.
- **Block desde el día uno** — riesgo de *lockout* bajo: máximo 5 usuarios comparten la IP de la oficina; el resto usa datos móviles (IPs individuales). 5 usuarios tendrían que promediar ~200 req/min cada uno, sostenido, para gatillar el límite de 1000/5 min. (Caveat menor: CGNAT de operadores móviles puede agrupar varios teléfonos tras pocas IPs, pero el *userbase* es pequeño y los *pools* rotan — no es exposición real a esta escala.)

### 4.1 Logging

**Full WAF logging** (a un log group de CloudWatch / Firehose) queda **apagado** por ahora. Los *sampled requests* (últimas ~3 h, gratis) dan visibilidad suficiente para validar reglas. El *logging* completo es un *add-on* pagado que encaja mejor en la sub-tarea de **Observabilidad** de la Fase 5; se deja como *hook* para ese trabajo.

## 5. Stage / despliegue

El módulo corre en **todos los stages** (sin *gating*): despliega a `dev` ahora y a `prod` en la Fase 6. Motivo: validar las reglas contra tráfico real del rehost y de la app nueva **antes** del *go-live*.

**Rollback** si alguna vez se bloquea a la oficina: cambiar la *rate rule* a `Count` (o remover la asociación) — cambio de una línea en IaC, redeploy.

## 6. Costo (dev, recurrente)

| Ítem | Costo |
|---|---|
| Web ACL | ~USD 5/mes |
| `AmazonIpReputationList` (grupo administrado) | ~USD 1/mes |
| `KnownBadInputsRuleSet` (grupo administrado) | ~USD 1/mes |
| Regla *rate-based* + reglas custom | USD 0 (incluidas) |
| Requests | ~USD 0,60 / millón |
| **Total** | **~USD 7/mes** + requests |

Las tres asociaciones de distribución **no** multiplican el costo (es un solo ACL). Coincide con la estimación de ~USD 6–9/mes del plan.

## 7. Verificación

- `aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 ...` muestra las 3 reglas.
- Consola **WAF → Web ACLs → Associated resources** lista las 3 distribuciones (`Frontend`, `RehostRouter`, `RehostLegacyFrontend`).
- *Smoke*:
  - Un request benigno sigue devolviendo 200.
  - Una sonda que matchea `KnownBadInputs` (p. ej. header estilo Log4j `${jndi:...}`) devuelve 403.
  - Martillar >1000 req/5 min desde una IP empieza a devolver 403.
- El panel de *sampled requests* confirma qué regla hizo *match*.

## 8. Alcance (qué NO incluye)

- **No** protege la HTTP API Cognito de la app nueva (no está detrás de CloudFront; ver §2.1). *Carry-forward* de prod.
- **No** incluye el Core Rule Set (decisión deliberada, §4).
- **No** activa *full WAF logging* (queda para la sub-tarea de Observabilidad, §4.1).
- **No** agrega un Web ACL REGIONAL sobre el ALB del rehost (redundante: el ALB ya queda tras el WAF del `RehostRouter`).
- **No** toca la política de tags existente ni `defaultTags`; el Web ACL solo agrega su propio `serfel:stack=serfel-shared`.

## 9. Entregable

Un Web ACL `scope=CLOUDFRONT` en `us-east-1` con IpReputation + KnownBadInputs + *rate-limit* (1000/5 min por IP), en modo Block, asociado a las tres distribuciones CloudFront públicas del proyecto, desplegado en `dev` (y en `prod` en Fase 6), verificado por *smoke* y consola. La HTTP API Cognito de la app nueva queda documentada como *carry-forward* sin cobertura WAF.

## 10. Checklist de la tarea (para el plan de la Fase 5)

- [ ] Crear `infra/waf.ts`: `aws.wafv2.WebAcl` scope CLOUDFRONT (us-east-1), default `Allow`, tag `serfel:stack=serfel-shared`, reglas IpReputation (prio 0) + KnownBadInputs (prio 1) + rate-based 1000/5min por IP (prio 2), `visibilityConfig` con metrics + sampled on. Exportar `webAclArn`.
- [ ] Importar `infra/waf` en `sst.config.ts` antes de `frontend` y `rehost/cdn`.
- [ ] `infra/frontend.ts`: agregar `transform.cdn` con `args.webAclArn = webAclArn`.
- [ ] `infra/rehost/cdn.ts`: en el `transform.cdn` existente, fijar `args.webAclArn = webAclArn`.
- [ ] `infra/rehost/legacy-frontend.ts`: agregar `transform.cdn` con `args.webAclArn = webAclArn`.
- [ ] `pnpm sst:deploy` a `dev`; confirmar 3 asociaciones en consola WAF.
- [ ] *Smoke*: benigno→200, sonda KnownBadInputs→403, flood >1000/5min→403; revisar *sampled requests*.
- [ ] Documentar en README/runbook el *rollback* (rate rule → Count) y el *carry-forward* de la API Cognito sin WAF.

## 11. Verificación del deploy a `dev` (2026-08-05)

Desplegado a `dev` (cuenta 146476548567) vía `./scripts/sst-deploy.sh --stage dev` (Node 22). Resultado:

- **Web ACL creado:** `serfel-dev-waf`, ARN `arn:aws:wafv2:us-east-1:146476548567:global/webacl/serfel-dev-waf/99644a4e-d03d-4e50-94a8-e3ee1a4eee82`, con las 3 reglas en orden (`AmazonIpReputationList` 0, `KnownBadInputs` 1, `RateLimit` 2).
- **Asociaciones (3/3):** las tres distribuciones CloudFront del proyecto llevan `WebACLId` = ese ARN:
  - `ddq2gwitful2l.cloudfront.net` — Frontend (app nueva)
  - `d3k1mbba3zd3qv.cloudfront.net` — RehostLegacyFrontend
  - `d2f6f0amgzurw.cloudfront.net` — RehostRouter
- **Smoke:** benigno `GET /` → 200. Sonda KnownBadInputs (`User-Agent: ${jndi:ldap://x/a}` y `/?x=${jndi:...}`) → **bloqueada** en las tres (confirmado por `get-sampled-requests`, acción `BLOCK`).

### 11.1 Hallazgo importante: en las StaticSite el bloqueo WAF se ve como HTTP 404, no 403

En las distribuciones **StaticSite** (Frontend, RehostLegacyFrontend) un bloqueo de WAF **no llega al cliente como 403**. SST configura `CustomErrorResponses` para el fallback SPA que mapea **403 → 404 → `/index.html`** (y `404 → 404 → /index.html`). Por eso una petición bloqueada por WAF devuelve **404 con el cuerpo de `index.html`** (`server: AmazonS3`, `content-length` = tamaño de index.html), en vez del 403 crudo. El bloqueo **sí ocurre** (verificado en los *sampled requests* de la regla). El **RehostRouter** no tiene ese mapeo SPA, así que ahí el bloqueo se ve como **403 crudo** (`server: CloudFront`).

Implicación para verificar/monitorear: no usar el status HTTP del cliente como prueba de bloqueo en las StaticSite; usar los **sampled requests** / **métricas `BlockedRequests`** de WAF. Este 403→404 es el mismo *carry-forward* de `errorPage` de SST ya anotado en el plan (Fase 5): si en el futuro se mapea a 200, el bloqueo WAF también cambiará de forma.

Nota operativa: la asociación WAF puede tardar unos minutos en activarse en todos los POPs de CloudFront tras el deploy (las StaticSite se despliegan sin *deployment waiter*, a diferencia del Router). Durante ese lapso una petición puede alcanzar el origen antes de que el bloqueo esté activo en ese POP.

### 11.2 Rollback

Si alguna vez se bloquea a usuarios legítimos (p. ej. la oficina tras la NAT): en `infra/waf.ts` cambiar la acción de la regla `RateLimit` de `action: { block: {} }` a `action: { count: {} }` (o quitar la asignación `args.webAclArn` de la distribución afectada) y `./scripts/sst-deploy.sh --stage dev`.

### 11.3 Carry-forward

La HTTP API Cognito de la app nueva (`kov4mkjgnd.execute-api...`) **no** está cubierta por WAF (HTTP API v2 + no está detrás de CloudFront). Revisar en Fase 6 con front-door CloudFront + lockdown de origen `X-Origin-Verify` (ver §2.1).
