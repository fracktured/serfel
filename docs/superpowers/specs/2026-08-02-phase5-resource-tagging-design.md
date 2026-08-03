# Fase 5 — Etiquetado por stack de aplicación (`serfel:stack`)

> Diseño para una **nueva tarea de la Fase 5** (Seguridad, observabilidad y *hardening*). Objetivo: que **todo recurso AWS** del proyecto declare a qué grupo de aplicación pertenece, para gobernanza de costos, inventario y descomisionado limpio del stack legacy conforme avanza el *strangler-fig*.
>
> Fecha: 2026-08-02. Contexto del plan: `plan-trabajo-app-ventas-aws.md` §Fase 5.

---

## 1. Motivación

El proyecto corre **tres grupos de aplicación** conviviendo en la misma cuenta y VPC:

1. **App nueva serverless** (Fase 3+): Angular 20 en S3/CloudFront, HTTP API con autorizador Cognito, Lambdas de dominio.
2. **Rehost legacy** (Fase 3.5): 2 PHP en Fargate, 2 Node portadas a Lambda, autorizador Basic Auth, ALB interno, CloudFront propio, Angular 14 estático.
3. **Infraestructura compartida**: VPC, subredes, NAT, RDS MariaDB, secretos, rol OIDC de CI.

Sin una etiqueta que distinga estos grupos:

- **Costos** no se pueden atribuir por app en Cost Explorer (¿cuánto cuesta el rehost vs. la app nueva?), lo que impide medir el ahorro a medida que el *strangler* retira apps PHP.
- El **descomisionado** del legacy es a ojo: no hay forma programática de listar "todo lo que pertenece al rehost" para apagarlo.
- El **inventario** y las auditorías de seguridad no tienen un eje de agrupación por responsabilidad.

## 2. Estado actual del etiquetado

`sst.config.ts` ya define `defaultTags` en el provider de AWS, que Pulumi aplica automáticamente a **todo recurso etiquetable** (incluidos los hijos de componentes SST):

```ts
providers: {
  aws: {
    region: "us-east-1",
    defaultTags: {
      tags: {
        Project: "serfel-ventas",
        Owner: "christian",
        Environment: input?.stage ?? "dev",
      },
    },
  },
},
```

Esto cubre parcialmente la política de la Fase 0 (`proyecto`, `owner`, `entorno`; falta `componente`). La capa **global ya existe**: la tarea nueva **no** reintroduce estos tags, solo agrega el eje que falta.

Los recursos individuales hoy pasan `tags: { Name: "serfel-dev-*" }`. Pulumi **fusiona** `defaultTags` con los tags a nivel de recurso (el recurso gana ante conflicto de clave), así que agregar una clave nueva por recurso coexiste sin romper nada.

## 3. Esquema de tags

Una sola clave nueva, sobre las tres existentes:

| Clave | Valores | Aplicada por |
|-------|---------|--------------|
| `serfel:stack` | `serfel-aws` · `serfel-rehost` · `serfel-shared` | **por módulo (nuevo)** |
| `Project` | `serfel-ventas` | `defaultTags` (existente) |
| `Owner` | `christian` | `defaultTags` (existente) |
| `Environment` | `dev` \| `prod` (stage) | `defaultTags` (existente) |

**Decisiones de nomenclatura (cerradas en brainstorming 2026-08-02):**

- **Clave `serfel:stack`** (namespaced). El prefijo `serfel:` evita colisiones con conceptos internos de SST/CloudFormation y con el prefijo reservado `aws:`. Los dos puntos son válidos en claves de tag de AWS.
- **Tres valores, no cinco.** El rehost se trata como **una sola unidad** (`serfel-rehost`) porque se despliega, se prueba y se descomisionará en bloque; separar PHP / Node / Angular 14 añade granularidad que nadie va a consultar. La app nueva es `serfel-aws`. Lo transversal es `serfel-shared`.

## 4. Clasificación por archivo

Los recursos ya viven en archivos que agrupan limpiamente. La clasificación es **por archivo**, no por recurso individual:

| `serfel:stack` | Archivos | Recursos principales |
|----------------|----------|----------------------|
| `serfel-aws` | `infra/api.ts`, `infra/auth.ts`, `infra/frontend.ts` | HTTP API, Lambda `products`, Cognito user pool, StaticSite Angular 20 |
| `serfel-rehost` | `infra/rehost/*` (todos) | Fargate PHP ×2, ECR, ALB interno, Lambdas Node ×2, autorizador Basic Auth, CloudFront rehost, Angular 14, red y VPC endpoints del rehost |
| `serfel-shared` | `infra/vpc.ts`, `infra/database.ts`, `infra/bastion.ts`, `infra/migrate.ts`, `infra/db-guard.ts`, `infra/oidc.ts` | VPC, subredes, NAT, SGs, RDS MariaDB, subnet group, bastión, Lambda de migración, db-guard, rol OIDC de CI |

**Justificación de los casos de borde compartidos:**

- `oidc.ts` — rol de CI que despliega **todo**; no pertenece a una app.
- `bastion.ts` — acceso operativo a la RDS compartida.
- `migrate.ts` / `db-guard.ts` — operan sobre la RDS compartida; son herramientas de la capa de datos, no de una app concreta.

## 5. Mecanismo de aplicación

Helper mínimo (ubicación sugerida: `infra/tags.ts`):

```ts
export function stackTags(stack: "serfel-aws" | "serfel-rehost" | "serfel-shared") {
  return { "serfel:stack": stack };
}
```

Se fusiona en el objeto `tags` de cada recurso:

- **Recursos Pulumi crudos** (`new aws.ec2.Vpc(...)`, `new aws.rds.Instance(...)`, etc.): `tags: { Name: "...", ...stackTags("serfel-shared") }`.
- **Componentes SST de nivel superior** (`sst.aws.StaticSite`, `sst.aws.Function`, `sst.aws.ApiGatewayV2`): inyectar vía la prop `transform` sobre el recurso hijo etiquetable alcanzable (p. ej. el bucket y la distribución de `StaticSite`, la función de `Function`).

No se usa un único `$transform` global ni una `registerStackTransformation` de Pulumi para el valor de stack: el valor **varía por app** y una transformación global no puede saber a qué app pertenece un recurso sin heurísticas frágiles sobre nombres/URN. La aplicación por módulo es explícita, *greppeable* y verificable.

## 6. Caveats conocidos (documentados, no ocultos)

1. **Hijos anidados de componentes SST / recursos auto-creados por AWS.** Algunos recursos no son alcanzables por la prop `transform` por-módulo y quedan solo con los tres tags de `defaultTags`, sin `serfel:stack`. Son de **costo ~cero**, así que la atribución de costos no se ve afectada. Están en `scripts/tag-audit-allowlist.txt`. **Lista confirmada tras el deploy a `dev` (2026-08-02):**
   - Distribuciones **CloudFront de las dos `StaticSite`** (Frontend, RehostLegacyFrontend) — sin transform de tags en esta versión de SST. *(La distribución del `Router` del rehost SÍ se etiqueta vía `cdn.ts`.)*
   - **Log groups de acceso de las HTTP API** (`/aws/vendedlogs/apis/*`), auto-creados por SST.
   - **Stages `$default` de las HTTP API** — el recurso `Api` sí se etiqueta (`transform.api`); el tag a nivel de stage no aporta a la atribución de costos.
   - **Volumen EBS raíz** auto-creado con la instancia bastión (la instancia sí está etiquetada).
   - **Revisiones ECS task-definition superseded** — la revisión **activa** lleva `serfel:stack=serfel-rehost`; solo las revisiones viejas aparecen hasta ser dadas de baja.
   - **Cognito user pool *clients*** — no etiquetables (el user *pool* sí).
   - *Nota de implementación:* el bucket S3 de cada `StaticSite` **sí** se etiqueta, pero requiere transform **anidado** (`transform.assets.transform.bucket`), no `transform.assets` directo — este último opera sobre los args del *componente* Bucket y es un no-op sobre el `s3.BucketV2` subyacente.
2. **Activación de cost allocation tags es semi-manual.** Para que `serfel:stack` (y `Project`) aparezcan en Cost Explorer hay que **activarlos como user-defined cost allocation tags** (nivel cuenta payer, `us-east-1`). Se puede por CLI: `aws ce update-cost-allocation-tags-status --cost-allocation-tags-status 'TagKey=serfel:stack,Status=Active'`. **Estado 2026-08-02:** `Project` **activado**; `serfel:stack` devolvió `404 tag key missing` porque AWS tarda hasta ~24 h en registrar una clave de tag nueva para asignación de costos — reintentar el comando al día siguiente. La IaC **no** puede hacer esto (es API de facturación, no de recursos).

## 7. Verificación y enforcement

`scripts/tag-audit.sh`:

- Usa `aws resourcegroupstaggingapi get-resources` para listar recursos etiquetables.
- Reporta cualquier recurso **sin** la clave `serfel:stack`, cruzando contra la lista conocida de excepciones del caveat 1 (para no generar ruido con los hijos de componentes SST).
- Sale con código ≠ 0 si aparecen recursos inesperados sin etiquetar, de modo que pueda invocarse manualmente tras cada deploy (opcionalmente en CI más adelante).

Verificación complementaria: **Resource Groups → Tag Editor** en la consola para inspección visual por `serfel:stack`.

## 8. Alcance (qué NO incluye)

- **No** agrega el tag `Component`/`componente` fino de la Fase 0 (queda como mejora opcional futura; el eje que aporta valor inmediato es `serfel:stack`).
- **No** reescribe los tags `Name` existentes ni toca `defaultTags`.
- **No** automatiza la activación de cost allocation tags (imposible por IaC; se documenta como paso manual).
- **No** aplica enforcement en CI de entrada (el script existe y se corre manual; integrarlo a CI es opcional posterior).

## 9. Entregable

Todo recurso etiquetable del proyecto declara `serfel:stack ∈ {serfel-aws, serfel-rehost, serfel-shared}` (salvo las excepciones documentadas de costo ~cero), la etiqueta está activada para asignación de costos en Billing, y `scripts/tag-audit.sh` verifica el cumplimiento. Habilita atribución de costos por app y descomisionado programático del rehost.

## 10. Checklist de la tarea (para el plan de la Fase 5)

- [ ] Crear helper `infra/tags.ts` con `stackTags()` y los tres valores tipados.
- [ ] Aplicar `serfel:stack=serfel-shared` en `infra/{vpc,database,bastion,migrate,db-guard,oidc}.ts`.
- [ ] Aplicar `serfel:stack=serfel-aws` en `infra/{api,auth,frontend}.ts` (recursos crudos + `transform` de componentes SST).
- [ ] Aplicar `serfel:stack=serfel-rehost` en `infra/rehost/*`.
- [ ] `pnpm sst:deploy` a `dev`; confirmar tags en consola (Tag Editor).
- [ ] Activar `serfel:stack` y `Project` como **cost allocation tags** en Billing (manual, documentar en runbook).
- [ ] `scripts/tag-audit.sh`: reporta recursos sin `serfel:stack` (con lista de excepciones conocidas).
- [ ] Documentar en el design/README las excepciones de hijos SST sin `serfel:stack`.
