# Plan de trabajo — App web de ventas en AWS (serverless)

> Documento de planificación para **migrar y desplegar en AWS** una aplicación web de ventas existente: frontend Angular, backend en PHP 5.6 y microservicios Node/Express, hacia una arquitectura serverless con Lambdas, API Gateway y base de datos MariaDB. La migración se trata como un **rediseño de dominio**, no como una transliteración de código.
>
> *Precios y datos de Free Tier verificados a junio de 2026. AWS ajusta tarifas y condiciones; confirmar siempre en la calculadora oficial (`calculator.aws`) antes de comprometer presupuesto.*

---

## 1. Arquitectura objetivo (visión de alto nivel)

```
                       ┌─────────────────────────────┐
   Usuario  ──HTTPS──> │  CloudFront (CDN + WAF)      │
                       └──────────────┬──────────────┘
                          │                        │
              estáticos   │                        │  /api/*
                          ▼                        ▼
                 ┌──────────────┐        ┌───────────────────┐
                 │  S3 (Angular)│        │  API Gateway       │
                 │  privado vía │        │  (HTTP API)        │
                 │  OAC         │        └─────────┬─────────┘
                 └──────────────┘                  │
                                          autorización (JWT)
                                          ┌────────▼────────┐
                                          │  Amazon Cognito │
                                          └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Lambdas (ARM)  │
                                          │  Node/TS o Py   │
                                          └────────┬────────┘
                                          (dentro de VPC, subred privada)
                                                   │ conexión reutilizada
                                          ┌────────▼────────┐
                                          │  RDS MariaDB    │
                                          │  db.t4g.micro   │
                                          │  Single-AZ      │
                                          │  (subred priv.) │
                                          └─────────────────┘

   Transversal: Secrets Manager · CloudWatch + X-Ray · SQS/EventBridge (async) · IaC
```

La idea central: **el frontend es estático** (Angular compilado, servido por CDN) y **el backend es 100% serverless** (sin servidores que administrar, se paga por uso). La base de datos relacional es lo único "siempre encendido", por lo que es el principal foco de costo y de diseño de conexiones.

> **Arquitectura objetivo vs. arquitectura de transición.** El diagrama anterior es el **estado final** (pure serverless). Durante la migración, la realidad es **híbrida**: hay que rehospedar apps legacy que no conviene reescribir aún (2 apps PHP 5.6). La **Fase 3.5** introduce una arquitectura de transición donde conviven lo rehospedado (PHP en **ECS Fargate**) y lo serverless (Lambdas nuevas y portadas), aplicando el patrón **strangler-fig**: las Fases 4+ reemplazan módulos legacy uno a uno hasta poder descomisionarlos y converger al diagrama de arriba. Ver §Fase 3.5 y `docs/superpowers/specs/2026-07-18-phase3.5-legacy-rehost-design.md`.

---

## 2. Decisiones tecnológicas clave (recomendaciones)

### 2.1 Cuenta AWS y gobernanza

| Tema | Recomendación |
|------|---------------|
| Plan de cuenta | Desde el **15 de julio de 2025** las cuentas nuevas usan un modelo de **créditos**: USD 100 al registrarse + hasta USD 100 adicionales completando tareas de onboarding (EC2, RDS, Lambda, Bedrock, Budgets), total **hasta USD 200**. El **Free Plan** caduca a los 6 meses o al agotar créditos y **restringe servicios costosos**. Para un proyecto productivo real, conviene **elegir el Paid Plan** al registrarse: igual recibes los créditos, pero sin restricciones de servicios. |
| Organización | Usar **AWS Organizations** y separar al menos dos cuentas: `dev/staging` y `prod`. Aísla riesgos y costos. (Si el equipo es muy pequeño, se puede empezar con una sola cuenta y entornos separados por *stage*.) |
| Identidades | **No usar el usuario root** salvo para tareas iniciales. Activar **MFA en root**, crear **IAM Identity Center (SSO)** para personas y roles IAM para servicios. Principio de **mínimo privilegio**. |
| Costos | Activar **AWS Budgets** con alertas (p. ej. al 50/80/100% del presupuesto) y **Cost Anomaly Detection** desde el día 1. Etiquetado (tagging) obligatorio por entorno y componente. |

### 2.2 Frontend (Angular)

- **Hosting recomendado:** Angular compilado a estáticos → **S3 (bucket privado) + CloudFront** con **Origin Access Control (OAC)**. CloudFront da HTTPS, caché global y baja latencia (relevante por la latencia desde Chile a regiones de EE. UU.).
- **Alternativa más simple:** **AWS Amplify Hosting**, que integra build + CDN + CI/CD con muy poca configuración. Buen punto de partida para equipos pequeños; luego se puede migrar a S3+CloudFront para más control.
- **Frameworks/UI:** Angular 18+ con **standalone components** y *signals*. Para UI: **Angular Material** o **PrimeNG**. Para estado: **NgRx** (si la app crece) o *signals* + servicios para algo más liviano.
- **Routing SPA:** configurar CloudFront para devolver `index.html` en rutas no encontradas (error 403/404 → 200 `/index.html`).

### 2.3 API Gateway

- Usar **HTTP API**, no REST API, salvo necesidad específica. HTTP API cuesta **USD 1,00 por millón** de solicitudes frente a **USD 3,50 por millón** de REST API (~71% más barato), y soporta integración proxy con Lambda, autorizadores JWT y CORS, que cubre la mayoría de casos.
- Elegir **REST API** solo si necesitas: *usage plans* + API keys, transformación de request/response, caché por *stage* o integración directa con AWS WAF a nivel de API.

### 2.4 Cómputo (Lambdas)

- **Runtime:** Node.js/TypeScript (excelente DX y arranque rápido) o Python. Evitar runtimes con cold starts altos (JVM/.NET) para endpoints sensibles a latencia.
- **Arquitectura ARM/Graviton:** ~20% más barata que x86 con igual o mejor rendimiento. Usarla por defecto.
- **Memoria:** afinar memoria es la palanca de costo/rendimiento más importante; más memoria = más CPU = ejecución más rápida. Suele convenir 256–512 MB sobre 128 MB. Usar **AWS Lambda Power Tuning** para optimizar.
- **Cold starts:** mantener paquetes pequeños, *tree-shaking*, y considerar **Provisioned Concurrency** solo en endpoints críticos (tiene costo extra).
- **Patrón:** funciones pequeñas y enfocadas; lógica de dominio compartida en *layers* o paquetes internos.

### 2.5 Base de datos (MariaDB) — **decisión cerrada**

**Contexto del proyecto:** tráfico **estable**, máximo **~30 usuarios concurrentes**, y se toleran un par de minutos de indisponibilidad ante una caída de AWS. A esta escala, lo más simple es lo correcto.

**Decisión: RDS MariaDB `db.t4g.micro`, Single-AZ, provisionada (siempre caliente), sin RDS Proxy.**

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Motor | **RDS MariaDB** (no Aurora Serverless v2) | La elasticidad de Aurora no aporta nada con carga estable; mantenerla caliente costaría ~USD 43/mes mínimo. Para latencia baja la base debe estar siempre encendida, y la instancia provisionada lo logra al menor costo. |
| Instancia | **`db.t4g.micro`** (ARM/Graviton) | Sobra para 30 concurrentes. Si se quiere holgura, `db.t4g.small` (~USD 24/mes) duplica memoria. |
| Alta disponibilidad | **Single-AZ** | El negocio tolera un par de minutos de caída; Multi-AZ duplicaría el cómputo sin necesitarse. Mitigar con backups automáticos + *point-in-time recovery*. |
| RDS Proxy | **No (al inicio)** | El Proxy resuelve el agotamiento de conexiones bajo alta concurrencia, que no ocurre con ~30 usuarios. Cuesta ~USD 21/mes (más que la propia base) y añade un salto de latencia. Se puede agregar después si surgieran errores de conexión; es un cambio aislado. |

- **Higiene de conexiones en Lambda (clave al ir sin Proxy):** declarar el *pool*/conexión **fuera del handler** para reutilizarlo entre invocaciones del mismo entorno caliente; `connectionLimit` bajo por función (1–2); `wait_timeout` razonable en la base para reciclar conexiones ociosas; reintentos con *backoff*.
- **Red:** la base **siempre en subred privada** dentro de una VPC, sin acceso público. Lambdas en subred privada para alcanzarla. Cifrado en reposo (KMS) y en tránsito (TLS) activado.
- **Descartado:** Aurora Serverless v2 — su escalado a 0 implica ~15 s de reanudación (inaceptable para latencia), y mantenerla caliente sale más caro sin beneficio a esta escala.

### 2.6 Autenticación

- **Amazon Cognito** para registro/login de usuarios y emisión de **JWT** que el **autorizador del HTTP API** valida automáticamente. Evita construir autenticación propia.

### 2.6b Acceso a datos (ORM)

Para Lambda + MariaDB en TypeScript, la elección es **Drizzle ORM**:

| ORM | Pros | Contras |
|-----|------|---------|
| **Drizzle ORM** ✓ | TypeScript-first, bundle liviano, sin cliente pesado, SQL legible e inspeccionable, manejo de conexiones explícito — ideal para Lambda | Ecosistema más joven que Prisma |
| Prisma | DX excelente, muy maduro | Cliente pesado, gestión de conexiones problemática en Lambda sin workarounds |
| Knex | Flexible, maduro | Sin tipos automáticos desde el esquema |

El esquema Drizzle vive en `packages/db` y sus tipos se exportan a `packages/shared`, disponibles tanto en las Lambdas como en el frontend Angular sin duplicar definiciones.

### 2.7 Infraestructura como código (IaC)

| Herramienta | Perfil |
|-------------|--------|
| **AWS CDK (TypeScript)** | Recomendada si el equipo ya usa TS. Define toda la infra en código tipado, con buenas abstracciones (constructs). |
| **SST (v3 / Ion)** | Excelente DX específica para apps serverless full-stack (Lambda + API + frontend + DB). Acelera mucho el desarrollo y el *live debugging*. Muy buena opción para este caso. |
| **Terraform** | Si se quiere multi-nube o el equipo ya lo domina. |
| **AWS SAM** | Más simple, centrado en serverless, pero menos flexible que CDK/SST. |

**Recomendación:** **SST v3** o **AWS CDK** en TypeScript, alineados con un frontend Angular en TS (un solo lenguaje para todo el stack reduce fricción).

### 2.7b Estructura del repositorio (monorepo con pnpm workspaces)

TypeScript en todo el stack solo rinde frutos si los tipos se comparten. Sin monorepo, el frontend y las Lambdas duplican DTOs y el principio de "un solo lenguaje" no aporta valor concreto.

```
repo/
├── apps/
│   └── frontend/          ← Angular 18+ (standalone + signals)
├── packages/
│   ├── shared/            ← tipos DTO + schemas Zod compartidos entre frontend y Lambdas
│   └── db/                ← schema Drizzle ORM + migraciones
├── lambdas/               ← funciones Lambda por dominio (catálogo, órdenes, pagos, usuarios…)
└── infra/                 ← SST v3 o CDK (TypeScript)
```

- **Gestor de paquetes:** `pnpm workspaces` (liviano, rápido, hoist configurable).
- **Prerequisito antes de crear nada en AWS:** definir el esquema Drizzle (`packages/db`) y los tipos DTO en `packages/shared`. Estos guían el diseño de Lambdas y la integración Angular desde el inicio.
- **Zod** para validación de entrada en Lambdas (y reutilizado en el frontend para formularios): un esquema, dos usos.

### 2.8 CI/CD

- **GitHub Actions** (o GitLab CI) con despliegue vía IaC. Pipelines separados por entorno. *Nota:* AWS CodeCommit ya **no admite clientes nuevos**, así que usar GitHub/GitLab para el repositorio.
- Flujo: PR → tests → deploy a `dev` → aprobación → deploy a `prod`.

### 2.9 Mensajería y procesos asíncronos

- Para tareas que no deben bloquear la respuesta (envío de correos, generación de facturas, integración con pasarela de pago): **SQS** (colas) y **EventBridge** (eventos). Mejora resiliencia y desacopla.

---

## 3. Stack recomendado (resumen)

- **Frontend:** Angular 18+ (standalone + signals) + Angular Material/PrimeNG → S3 + CloudFront (o Amplify Hosting).
- **API:** API Gateway **HTTP API** + autorizador JWT.
- **Cómputo:** Lambda en **Node.js/TypeScript**, **ARM/Graviton**.
- **Auth:** Amazon Cognito.
- **DB:** RDS **MariaDB** `db.t4g.micro`, Single-AZ, sin RDS Proxy (con buena reutilización de conexiones en Lambda).
- **IaC:** **SST v3** o **AWS CDK** (TypeScript).
- **CI/CD:** GitHub Actions.
- **Async:** SQS + EventBridge.
- **Secretos:** AWS Secrets Manager / SSM Parameter Store.
- **Observabilidad:** CloudWatch (logs/metrics/alarms) + AWS X-Ray (tracing).
- **Seguridad de borde:** AWS WAF sobre CloudFront/API.

---

## 4. Plan de trabajo por fases

> Estimaciones de duración para un equipo pequeño (1–3 personas). Ajustar a la realidad del equipo.
>
> **Estado (2026-07-18):** Fases 0–3 **completadas** (cuenta y gobernanza; VPC + CI/CD con SST v3; RDS MariaDB `serfel-dev-db` con esquema y datos legacy importados, Drizzle en `packages/db`; PoC vertical del mantenedor de productos desplegado en `dev`). Las Fases 3 y 4 se reestructuraron: en lugar de "todo el backend" y luego "todo el frontend", se avanza por **cortes verticales por módulo** (UI + API + Lambda + DB de un dominio a la vez).
>
> **Reordenamiento (2026-07-18):** se inserta la **Fase 3.5 — Rehost del stack legacy** *antes* de la Fase 4. Motivo: el hosting anterior se descontinúa y las apps legacy (2 PHP 5.6 + 2 Node/Express + 1 Angular 14) deben correr en AWS **ya**, sin esperar la reescritura módulo a módulo. Es un **lift-and-shift** (PHP como está en Fargate; Node portado al patrón Lambda de la Fase 3; Angular 14 estático) que habilita apagar el hosting viejo y arranca el patrón **strangler-fig**: la Fase 4+ reemplaza módulos legacy hasta descomisionarlos.

### Fase 0 — Fundaciones de la cuenta AWS y gobernanza · (2–4 días) ✅
- [x] Crear cuenta AWS eligiendo **Paid Plan** (recibir créditos, sin restricciones).
- [x] Asegurar root: MFA, sin uso cotidiano, sin access keys.
- [x] Configurar **AWS Organizations** y cuentas `dev`/`prod` (o entornos separados si se empieza con una cuenta).
- [x] Configurar **IAM Identity Center (SSO)**, roles y mínimo privilegio.
- [x] Activar **AWS Budgets** + alertas y **Cost Anomaly Detection**.
- [x] Definir política de **etiquetado** (entorno, proyecto, componente, owner).
- [x] Elegir **región** (ver §6).

**Entregable:** cuenta(s) segura(s), gobernanza de identidades y alarmas de costo activas.

### Fase 1 — Infraestructura base e IaC · (3–5 días) ✅
- [x] Repositorio Git (monorepo recomendado: frontend + infra + servicios).
- [x] Inicializar **SST v3 / CDK**; definir *stacks* por entorno.
- [x] Diseñar **VPC**: subredes públicas/privadas, *security groups*, *NAT* (o endpoints VPC para reducir costo de NAT).
- [x] Configurar **GitHub Actions** con despliegue por IaC.
- [x] Bootstrap de observabilidad (log groups, dashboards base).

**Entregable:** infraestructura reproducible y pipeline de despliegue funcionando contra `dev`.

### Fase 2 — Capa de datos · (3–5 días) ✅
- [x] Provisionar **RDS MariaDB `db.t4g.micro`, Single-AZ**, privada y cifrada, vía IaC.
- [x] Definir esquema inicial y estrategia de **migraciones** (p. ej. Flyway, Prisma Migrate o Knex).
- [x] Credenciales en **Secrets Manager**, rotación habilitada.
- [x] Configurar **backups automáticos + point-in-time recovery** (sustituye a Multi-AZ como red de seguridad).
- [x] Datos de prueba (*seed*) para `dev`.

**Entregable:** base de datos operativa, versionada, con respaldos y accesible solo desde la VPC.

### Fase 3 — PoC vertical: mantenedor de productos · (1–2 semanas) ✅

> Corte vertical completo de **un solo módulo** que fija el patrón para todos los demás. Diseño detallado en `docs/superpowers/specs/2026-07-16-phase3-products-maintainer-poc-design.md`. Referencia visual aprobada: `prototipes/prototype-3-bold-vibrant-table.html`. **Completada 2026-07-17** — desplegada en `dev`, CI verde (typecheck+tests+deploy+migrate), `api-smoke.sh` 8/8. Frontend `https://ddq2gwitful2l.cloudfront.net`, API `https://kov4mkjgnd.execute-api.us-east-1.amazonaws.com`.

- [x] **Cognito**: user pool + app client (sin auto-registro; usuarios creados por admin, atributo `custom:id_usuario` mapea al usuario legacy). Nunca leer/loggear `10_m_usuario.password`. *(Autorizador valida el **ID token**, no el access token — Cognito solo incluye atributos custom en el ID token.)*
- [x] **HTTP API** con autorizador JWT de Cognito sobre todas las rutas.
- [x] **Lambda `products`** (una Lambda por dominio, router interno Hono): CRUD de `20_m_producto` + lookups (marcas, tipos, UM). Pool mysql2 a nivel de módulo (`connectionLimit` 1), ARM64, subred privada, TLS a RDS.
- [x] Reglas de negocio: `cod_serfel` y `nom_producto` únicos entre productos **activos**; eliminación = *soft delete* vía `id_estado` + acción de restaurar.
- [x] Migración de esquema: `20_m_producto.id_producto` pasa a **AUTO_INCREMENT** (migración Drizzle versionada; el código nunca asigna ids). *(El id asignado se lee de `ResultSetHeader.insertId` — el `$returningId()` de Drizzle no funciona con el estilo de PK a nivel de tabla de este esquema.)*
- [x] Portabilidad: todo reproducible desde el repo (IaC + migraciones versionadas + seeds/scripts), sin hardcodear cuenta/ARNs en código de aplicación — el proyecto se moverá a la **cuenta AWS de producción del cliente** (ver Fase 6).
- [x] **Zod** en `packages/shared` (validación en Lambda, reutilizada en formularios Angular); errores estructurados; conectar `relations.ts` al cliente Drizzle. *(`idTipoProducto` acepta 0: la única fila de `20_p_tipo_producto` en legacy es id 0 "SIN TIPO".)*
- [x] **Angular** (standalone + signals, SCSS propio según prototipo aprobado, sin librería de componentes): login propio (`aws-amplify/auth`), pantalla de productos (tabla, filtros, stats, modal crear/editar, CSV, estados activo/inactivo).
- [x] Despliegue del frontend como **SST StaticSite** (S3 + CloudFront, fallback SPA) integrado a `deploy-dev.yml`.
- [x] Pruebas unitarias (Vitest, 32 tests) + suite de integración on-demand contra `dev` (`scripts/api-smoke.sh`).

**Entregable:** mantenedor de productos funcionando end-to-end en `dev` (login → CRUD real contra MariaDB), patrón replicable para el resto de módulos. **Pendiente:** smoke manual en navegador (login + CRUD visual en la URL de CloudFront) — no automatizable, queda para el usuario.

> **Carry-forwards de la revisión final de Fase 3** (ver §5/§4):
> - *(Fase 4)* `productQuery` usa `INNER JOIN` a marca/UM/tipo, y `20_m_producto` no tiene FKs a esas lookups en legacy: un producto con un `id_marca`/`id_UM`/`id_tipo_producto` colgante desaparece del listado sin señal. Antes de replicar este query en otros dominios, decidir `LEFT JOIN` + nombres coalesced o validar ids de lookup → 400. Es la consulta plantilla que copiará cada mantenedor.
> - *(Fase 5)* Unicidad activa (`assertUnique`) es un SELECT sin bloqueo antes del write: dos creates concurrentes con el mismo `cod_serfel` desde Lambdas distintas podrían pasar ambos. Riesgo casi nulo con un solo admin; endurecer con `SELECT … FOR UPDATE` / SERIALIZABLE / índice único filtrado por activo.

### Fase 3.5 — Rehost del stack legacy (lift-and-shift + strangler) · (1–2 semanas)

> Diseño detallado en `docs/superpowers/specs/2026-07-18-phase3.5-legacy-rehost-design.md`. **Aditiva**: no toca el PoC de la Fase 3, que sigue con su propia distribución CloudFront y su HTTP API con Cognito. Sin deadline duro → rehost limpio. Todas las apps legacy usan la **misma** RDS ya migrada (`serfel-dev-db`).

**Objetivo:** correr las 5 apps legacy en AWS **como están** para poder apagar el hosting anterior, conviviendo con el stack nuevo y abriendo el camino strangler.

- [x] **PHP 5.6 (×2) → ECS Fargate**: imagen `php:5.6-apache` por app en **ECR**, un **service Fargate por app** (1 task), subred privada. Creds de DB desde **Secrets Manager** (nunca en la imagen); sesiones PHP file-based (mover a store compartido solo si se escala a >1 task). *APIs + páginas server-rendered se conservan tal cual.*
- [x] **Node/Express (×2) → Lambda** portadas al **patrón de la Fase 3** (Hono, pool mysql2 `connectionLimit:1`, ARM64, VPC privada, TLS a RDS). Se porta la lógica de negocio con tipos TS explícitos; se descarta la capa HTTP de Express. DTOs/Zod en `packages/shared`.
- [x] **Auth de transición — Basic Auth**: **Lambda authorizer** (REQUEST) valida `Authorization: Basic` con las credenciales que ya usan las apps Node (desde Secrets Manager). El Angular 14 legacy queda **sin cambios**. Es **temporal**: el strangler migra a Cognito después (§8.4). HTTP API **separada** de la del PoC para teardown limpio.
- [x] **Angular 14 legacy → S3 estático** detrás de **CloudFront propio del rehost**. Solo se ajusta `environment.ts` para apuntar a rutas **same-origin** (sin cambios de código).
- [x] **Front door — Opción A (CloudFront multi-origin por path)**: `/*`→S3 (Angular 14, fallback SPA), `/api/node/*`→HTTP API (Lambdas Node, sin caché, forward `Authorization`), `/php-app-1/*` y `/php-app-2/*`→**ALB interno**→Fargate (sin caché, forward headers/cookies/query para sesiones PHP). Same-origin ⇒ sin CORS.
- [x] **Red**: compute en la VPC existente, subredes privadas, SGs hacia `serfel-dev-db` (espejo del acceso de la Lambda `products`). **ALB interno + CloudFront VPC origin** (fallback: ALB internet-facing restringido al prefix-list de CloudFront + header secreto). VPC endpoints (ECR, Secrets Manager, S3) sobre NAT para bajar costo.
- [x] **IaC**: todo en la app **SST v3** existente, desplegado a `dev` por `deploy-dev.yml`, nombres `serfel-<stage>-rehost-*` parametrizados por stage. Fuente PHP en `legacy-php/*` para build reproducible en CI.
- [x] **Pruebas y cutover**: `scripts/rehost-smoke.sh` (PHP: login/sesión + read/write DB + una página server-rendered; Node: Basic Auth 200/401; Angular: smoke manual en navegador). Descomisionar el hosting viejo **solo** tras pasar smoke de las 5 apps en AWS.

**Entregable:** las 5 apps legacy (2 PHP, 2 Node, 1 Angular 14) corriendo en AWS `dev` contra la RDS migrada, conviviendo con el PoC de la Fase 3, listas para apagar el hosting anterior. **Costo añadido:** ~USD 35–42/mes (ALB + 2 tasks Fargate always-on) que **decrece** a medida que el strangler retira apps PHP (ver §6 y el design doc).

> **Carry-forwards de la Fase 3.5** (resolver al implementar):
> - Confirmar rutas/hostnames que hoy llama el Angular 14 (para los patrones de CloudFront y su `environment.ts`).
> - Enumerar extensiones PHP por app (para el Dockerfile) y de dónde leen hoy las apps Node sus credenciales Basic Auth (para moverlas a Secrets Manager).
> - Verificar disponibilidad de **CloudFront VPC origin** en la versión de SST en uso; si no, usar el fallback de ALB internet-facing restringido.

### Fase 4 — Módulos restantes (cortes verticales) · (1–2 semanas por módulo)

Cada módulo repite el patrón de la Fase 3: tipos/Zod en `packages/shared` → Lambda de dominio → pantalla Angular → deploy. Orden sugerido (ajustar por prioridad de negocio):

- [ ] Pedidos (`30_*`)
- [ ] Ventas / documentos (`40_*`) — resolver aquí el carry-forward de `40_p_forma_pago` (tabla vacía en legacy; sembrarla o tratarla como enum de aplicación, sin depender del FK `fk_pago_tipo_docto`)
- [ ] Bodega / inventario (`50_*`)
- [ ] Usuarios y mantenedores de lookups (marcas, tipos, UM) (`10_*`, `20_p_*`)
- [ ] Reportes / dashboard
- [ ] Procesos asíncronos (SQS/EventBridge) para correos/facturación cuando exista el primer caso real

**Entregable:** aplicación completa módulo a módulo, cada uno probado y desplegado en `dev` antes de pasar al siguiente.

### Fase 5 — Seguridad, observabilidad y *hardening* · (3–5 días)
- [ ] **AWS WAF** sobre CloudFront/API (reglas administradas, *rate limiting*).
- [ ] **X-Ray** para *tracing* end-to-end; *dashboards* y **alarmas** clave (errores 5xx, latencia, errores de Lambda, conexiones DB).
- [ ] Revisión de IAM (mínimo privilegio real).
- [ ] Cifrado en reposo/tránsito verificado en todos los componentes.
- [x] **Etiquetado por stack de aplicación (`serfel:stack`)** — cada recurso declara si pertenece a la app nueva (`serfel-aws`), al rehost legacy (`serfel-rehost`: PHP + Node + Angular 14 + ALB) o a la infraestructura compartida (`serfel-shared`: VPC, RDS, NAT, secretos, OIDC). Habilita atribución de costos por app y descomisionado programático del rehost conforme avanza el *strangler*. La capa global (`Project`/`Owner`/`Environment`) ya la cubre `defaultTags` en `sst.config.ts`; esta tarea agrega el eje que falta, por módulo. Incluye activación manual de *cost allocation tags* en Billing y `scripts/tag-audit.sh` para verificar cumplimiento. Diseño: `docs/superpowers/specs/2026-08-02-phase5-resource-tagging-design.md`.
- [ ] Revisión con el **AWS Well-Architected Framework** (ver §5).
- [ ] **Carry-forwards de Fase 3:** CORS del HTTP API pasa de `*` al origen de CloudFront (el *preflight* ya funciona: se registran rutas por método GET/POST/PUT/DELETE en vez de `ANY`, dejando `OPTIONS` sin ruta para que API Gateway lo responda sin auth — 2026-07-17); race TOCTOU de unicidad activa (ver Fase 3); `errorPage` de SST devuelve el fallback SPA con status 404 (cuerpo correcto) → mapear a 200 con custom-error-response de CloudFront; bundle Angular ~800 kB (code-split/lazy-load de Amplify); nombres de recursos `serfel-dev-*` parametrizados por *stage* antes del movimiento a la cuenta del cliente.

**Entregable:** sistema endurecido, observable y auditado.

### Fase 6 — Despliegue a producción y *go-live* · (2–4 días)

> Producción vivirá en la **cuenta AWS propia del cliente** (no en la cuenta dev 146476548567): desplegar el stack completo desde el repo (IaC + migraciones), migrar los datos (dump/restore o snapshot compartido) y recrear el user pool de Cognito con sus usuarios (las contraseñas no se exportan).

- [ ] Dominio en **Route 53** + certificado **ACM** (HTTPS).
- [ ] Promoción de IaC a `prod`, datos productivos, *smoke tests*.
- [ ] Plan de *rollback* y *runbook* de incidentes.
- [ ] Pruebas de carga básicas.

**Entregable:** aplicación en producción con dominio propio y plan operativo.

### Fase 7 — Operación y optimización de costos · (continuo)
- [ ] Revisión mensual de costos por etiqueta; *right-sizing* de Lambda y DB.
- [ ] Considerar **Reserved Instances / Savings Plans** para la DB si la carga es estable (hasta ~35–69% de ahorro).
- [ ] Apagar/escalar a 0 entornos no productivos fuera de horario.
- [ ] Revisión periódica de seguridad y dependencias.

---

## 5. Buenas prácticas de arquitectura (Well-Architected)

AWS define 6 pilares; aplicarlos como checklist vivo:

1. **Excelencia operacional:** todo en IaC, despliegues automatizados, *runbooks*, observabilidad desde el día 1.
2. **Seguridad:** mínimo privilegio, MFA, secretos en Secrets Manager (nunca en código ni variables en texto plano sensibles), cifrado en reposo y tránsito, WAF, DB privada.
3. **Fiabilidad:** Multi-AZ en producción, reintentos con *backoff*, colas (SQS) con *dead-letter queues*, *health checks*.
4. **Eficiencia de rendimiento:** caché en CloudFront, afinado de memoria de Lambda, índices en la DB, RDS Proxy para conexiones.
5. **Optimización de costos:** serverless (pago por uso), ARM/Graviton, HTTP API en lugar de REST, escalado a 0 en dev, alarmas de presupuesto, *right-sizing*.
6. **Sostenibilidad:** apagar recursos ociosos, regiones eficientes, dimensionar a la demanda real.

Otras prácticas concretas:
- **Separación de entornos** (`dev`/`staging`/`prod`) por cuenta o, como mínimo, por *stack*.
- **Costos ocultos del serverless:** el grueso de la factura suele venir de **API Gateway, CloudWatch Logs, NAT Gateway y transferencia de datos**, no solo de Lambda. Vigilar el volumen de logs (definir retención, p. ej. 14–30 días) y preferir **VPC Endpoints** sobre NAT cuando sea posible.
- **Idempotencia** en operaciones de pago/órdenes para evitar duplicados ante reintentos.

---

## 6. Estimación de costos

### 6.1 Región
- **`us-east-1` (Virginia):** la más barata y con más servicios; mayor latencia desde Chile, mitigada por CloudFront para el frontend.
- **`sa-east-1` (São Paulo):** menor latencia para Chile, pero **tarifas más altas**.
- **Recomendación:** evaluar `us-east-1` por costo (con CloudFront el usuario final igual obtiene baja latencia en estáticos) o `sa-east-1` si la latencia de las APIs es crítica para la experiencia.

### 6.2 Tarifas de referencia (us-east-1, junio 2026)

| Servicio | Tarifa | Free Tier "siempre gratis" |
|----------|--------|----------------------------|
| Lambda (x86) | USD 0,20 / millón req + USD 0,0000166667 / GB-seg. ARM ~20% menos | 1M req + 400.000 GB-seg/mes (no expira) |
| API Gateway HTTP API | USD 1,00 / millón req (primeros 300M) | 1M req/mes durante 12 meses |
| API Gateway REST API | USD 3,50 / millón req | — |
| RDS MariaDB `db.t4g.micro` | ~USD 12–13/mes + ~USD 0,115/GB-mes SSD | 750 h/mes + 20 GB (solo cuentas legacy pre-jul-2025) |
| CloudFront | Transferencia variable | 1 TB salida/mes (siempre gratis) |
| S3 estándar | ~USD 0,023/GB-mes | 5 GB (límites de cuenta) |
| Route 53 | USD 0,50 / zona alojada / mes | — |
| Secrets Manager | USD 0,40 / secreto / mes | — |
| WAF | ~USD 5/mes por Web ACL + USD 1/regla + USD 0,60/millón req | — |
| Cognito | Capa gratuita generosa para MAU | Sí (verificar límites vigentes) |

### 6.3 Escenario del proyecto (tráfico estable, ~30 usuarios concurrentes)

Supuesto: carga estable y baja, Lambdas livianas, 1 base de datos `db.t4g.micro` Single-AZ siempre encendida, sin RDS Proxy.

| Componente | Costo mensual aprox. |
|------------|----------------------|
| Lambda | ~USD 0 (dentro de capa "siempre gratis") |
| API Gateway HTTP API | ~USD 0–1 |
| CloudFront + S3 (frontend) | ~USD 1–5 |
| **RDS MariaDB `db.t4g.micro` Single-AZ + 20 GB** | **~USD 15** |
| Route 53 + Secrets Manager + CloudWatch | ~USD 2–5 |
| WAF (opcional pero recomendado en prod) | ~USD 6–10 |
| **Total estimado** | **~USD 18–35/mes** (sin WAF: ~USD 18–25; con WAF: ~USD 24–35) |

Con `db.t4g.small` (holgura de memoria) el total sube ~USD 12. Los **USD 200 en créditos** de la cuenta nueva cubren cómodamente los primeros **6–10 meses** a esta escala.

Los **USD 200 en créditos** cubren holgadamente los primeros meses. La **base de datos** es el costo dominante: optimizarla (escalar a 0 en dev, considerar Aurora Serverless v2 o Reserved Instances en prod) es la mayor palanca de ahorro.

> Estos números son aproximados y dependen de región, tráfico real y configuración. Modelar el caso concreto en `calculator.aws` antes de presupuestar.

---

## 7. Riesgos y recomendaciones finales

- **Conexiones DB desde Lambda:** a ~30 concurrentes no es un riesgo real, pero depende de la **higiene de conexiones** (pool fuera del handler, `connectionLimit` bajo). Si aparecieran errores de "too many connections", la solución incremental es añadir **RDS Proxy** sin rediseñar.
- **Disponibilidad (Single-AZ):** ante una falla de zona de AWS habrá unos minutos de indisponibilidad mientras se recupera — asumido como aceptable por el negocio. La red de seguridad son los **backups automáticos + point-in-time recovery**; verificar que estén activos y probar una restauración.
- **Cold starts** en endpoints sensibles: medir y, si es necesario, usar Provisioned Concurrency selectiva.
- **Costos ocultos** (logs, NAT, transferencia): instrumentar alarmas y retención de logs desde el inicio.
- **Caducidad del Free Plan a 6 meses:** si se elige Free Plan, planificar la migración a Paid Plan antes de que expire; mejor elegir Paid Plan de entrada para producción.
- **Pagos:** si la app procesa pagos reales, integrar una pasarela (Stripe, Mercado Pago, Transbank en Chile) y **no** almacenar datos de tarjetas (cumplir PCI delegando en el proveedor).
- **Un solo lenguaje (TypeScript)** para frontend, backend e IaC reduce la curva de aprendizaje y el costo de mantenimiento. El beneficio real se materializa solo con monorepo y tipos compartidos (ver §2.7b).

---

## 8. Estrategia de migración (PHP 5.6 + Node/Express → Lambda TypeScript)

> **Nota (2026-07-18) — Rehost primero.** Esta sección describe el **rediseño** (estado final). Antes de rediseñar, la **Fase 3.5** rehospeda el stack legacy tal cual (PHP en Fargate, Node portado a Lambda con Basic Auth, Angular 14 estático) para poder apagar el hosting anterior sin esperar la reescritura. El rediseño de dominio de abajo se aplica luego, módulo a módulo (strangler), reemplazando lo rehospedado. Es decir: **rehost (3.5) → strangler/rediseño (4+)**.

### 8.1 Principio rector: rediseño de dominio, no transliteración

Migrar PHP 5.6 línea a línea a TypeScript solo exporta la deuda técnica a otro lenguaje. La migración es la oportunidad de hacer bien lo que el código original hacía de cualquier manera. **Esto aplica a la reescritura (Fase 4+), no al rehost (Fase 3.5), que deliberadamente conserva el código legacy como está.**

### 8.2 Mapa de migración por capa

| Capa actual | Qué hace hoy | Reemplazado por |
|-------------|-------------|-----------------|
| Auth PHP (sesiones, login) | Gestión de sesiones y usuarios | **Amazon Cognito** — no se migra, se elimina |
| SQL raw en PHP | Acceso a MariaDB sin tipos | **Drizzle ORM** en `packages/db` |
| Lógica de negocio PHP | Reglas de dominio (órdenes, catálogo, pagos) | Lambda TypeScript por dominio |
| Routing Express | `app.get('/ruta', handler)` | **API Gateway HTTP API** — no se migra, se elimina |
| Middleware auth Express | Verificación de tokens/sesiones | **Autorizador JWT** de API Gateway + Cognito |
| Handlers Express | Lógica dentro de cada endpoint | Lambda handler — **esto sí se porta**, con refactor |
| Envío de correos / tareas async | Llamadas síncronas dentro del request | **SQS + EventBridge** + Lambda async |

### 8.3 Consideraciones por origen

**PHP 5.6:**
- No tiene tipos explícitos: definir los tipos en `packages/shared` antes de escribir código Lambda, no después.
- El código mezcla HTML, SQL y lógica: extraer solo la lógica de negocio, descartar la capa de presentación (la hace Angular) y la capa de datos (la hace Drizzle).
- Las sesiones PHP desaparecen: Cognito emite JWT; las Lambdas son stateless por diseño.
- Priorizar cobertura de tests antes o durante la migración, no después — el PHP probablemente no tiene tests, es el momento de escribirlos.

**Node/Express microservicios:**
- La capa HTTP (routing, middleware) la absorbe API Gateway: no se migra, se elimina.
- La lógica de negocio dentro de cada handler sí es portable con mínimos cambios.
- Agregar tipos TypeScript explícitos al portar (no usar `any`).
- Eliminar la dependencia de Express del bundle de Lambda.

### 8.4 Orden de migración sugerido

1. **Auth primero:** reemplazar sesiones PHP por Cognito antes de tocar lógica de negocio. Desbloquea el resto.
2. **Schema de DB:** definir el esquema Drizzle desde la DB existente (puede inferirse con `drizzle-kit introspect`). Es la fuente de verdad de tipos compartidos.
3. **Dominio por dominio:** migrar catálogo → usuarios → órdenes → pagos. Cada uno es una Lambda independiente.
4. **Async al final:** correos, notificaciones y tareas de fondo se conectan a SQS/EventBridge una vez que los dominios principales funcionan.
5. **Descomisionar PHP y Express** solo cuando cada dominio tiene cobertura y smoke tests en `dev`.

---

*Próximos pasos sugeridos:* empezar por la Fase 0 y, en paralelo, montar un "hola mundo" end-to-end (Angular en S3 → HTTP API → Lambda → MariaDB) con IaC para validar el pipeline completo antes de invertir en lógica de negocio.
