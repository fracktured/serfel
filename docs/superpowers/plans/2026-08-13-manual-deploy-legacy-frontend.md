# Manual Deploy for Legacy Angular 14 Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the legacy Angular 14 frontend (serfel + coproad) deploy manually — SST owns empty S3 buckets, content is pushed on-demand — and remove its build from push-to-`main` CI, with zero visible downtime on `dev`.

**Architecture:** Convert the two `sst.aws.StaticSite` components to bare `sst.aws.Bucket` resources routed by the existing rehost `sst.aws.Router`, with per-route CloudFront viewer-request functions for SPA deep-link fallback. A `workflow_dispatch` GitHub Action (plus documented local commands) builds and syncs the content. Migration is two deploys (add buckets alongside StaticSites and pre-sync; then flip the Router and remove the StaticSites) so `/*` never serves an empty bucket.

**Tech Stack:** SST v3 (Ion/Pulumi), Angular 14 (Node 16 toolchain), CloudFront, S3, GitHub Actions, AWS CLI.

## Global Constraints

- SST resource identity is by **logical name**; changing a resource's component type under the same name forces replacement. New buckets use **new** logical names (`RehostLegacyFrontendBucket`, `RehostCoproadFrontendBucket`).
- Region is `us-east-1`; dev AWS account is `146476548567`.
- The rehost `Router` (`infra/rehost/cdn.ts`) keeps its logical name `RehostRouter`, type, and `serfel-${stage}-rehost-router` CloudFront comment — it must update in place, never be replaced. The ALB origin splice and its behaviors (`/Distribuidor*`, `/SerfelWeb*`, `/coproad/Coproad*`, `/coproad/CoproadWeb*`) stay byte-for-byte unchanged.
- `infra/rehost/legacy-frontend.ts` and `infra/rehost/cdn.ts` are imported only when `SST_SKIP_CLOUDFRONT` is unset (see `sst.config.ts`). No `sst.config.ts` change is needed.
- Angular build specifics (copy verbatim from current CI): run from `apps/legacy-frontend`; defensively delete stray `sst-env.d.ts` before building; use `npm install` (not `npm ci`); build **both** `--configuration production` (output `dist/serfel-ang`) and `--configuration coproad` (output `dist/coproad-ang/coproad`, base-href `/coproad/`).
- Do not commit to `main`. Work on a branch. Deploys to `dev` are operator actions (CI on merge, or manual) — this plan produces code and documents the deploy/verify steps; it does not itself deploy.
- No em dashes in AWS resource names or descriptions.

---

## Phase A — Deploy 1: add empty buckets alongside the StaticSites (no user-visible change)

### Task 1: Add the two `sst.aws.Bucket` resources (keep the StaticSites)

**Files:**
- Modify: `infra/rehost/legacy-frontend.ts`
- Modify: `infra/rehost/coproad-frontend.ts`

**Interfaces:**
- Consumes: `stackTags` from `../tags`.
- Produces: `export const legacyBucket` (an `sst.aws.Bucket`) from `legacy-frontend.ts`; `export const coproadBucket` (an `sst.aws.Bucket`) from `coproad-frontend.ts`. Consumed by Task 3.

- [ ] **Step 1: Add `legacyBucket` to `infra/rehost/legacy-frontend.ts`**

Append below the existing `legacyFrontendUrl` export (do NOT remove the StaticSite yet):

```ts
// Manual-deploy migration (Deploy 1): SST owns this empty bucket; content is
// pushed manually (see apps/legacy-frontend/README.md). The Router flips its
// `/*` route from the StaticSite to this bucket in Deploy 2. `access: cloudfront`
// grants the CloudFront service principal GetObject via the Router's OAC.
export const legacyBucket = new sst.aws.Bucket("RehostLegacyFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
    },
  },
});
```

- [ ] **Step 2: Add `coproadBucket` to `infra/rehost/coproad-frontend.ts`**

Append below the existing `coproadFrontendUrl` export:

```ts
// Manual-deploy migration (Deploy 1): empty bucket for the coproad variant.
// Built with base-href /coproad/ and nested under a coproad/ dir, so synced
// objects live at coproad/index.html, coproad/main.js, ... matching the routed
// /coproad/* prefix. The Router flips to this bucket in Deploy 2.
export const coproadBucket = new sst.aws.Bucket("RehostCoproadFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
    },
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors). The new exports are unused so far, which is fine.

- [ ] **Step 4: Commit**

```bash
git add infra/rehost/legacy-frontend.ts infra/rehost/coproad-frontend.ts
git commit -m "feat(rehost): add empty S3 buckets for manual legacy-frontend deploy"
```

---

### Task 2: Add the manual `workflow_dispatch` deploy workflow

**Files:**
- Create: `.github/workflows/deploy-legacy-frontend.yml`

**Interfaces:**
- Consumes: buckets created in Task 1 (discovered at runtime by name prefix) and the `RehostRouter` distribution (discovered by its `serfel-dev-rehost-router` comment). OIDC role `arn:aws:iam::146476548567:role/serfel-github-actions-role` (reused from `deploy-dev.yml`).
- Produces: a manually triggered pipeline that builds Angular and syncs both buckets. Referenced by the README (Task 8).

- [ ] **Step 1: Create the workflow file**

```yaml
name: Deploy legacy frontend (manual)

# Manual-only. The legacy Angular 14 app (serfel + coproad) is NOT built or
# deployed on push to main. Trigger this from the Actions tab -> "Run workflow".
# Job 1 builds (Node 16); Job 2 syncs the pre-built dist to the SST-owned S3
# buckets and invalidates the rehost CloudFront distribution.
on:
  workflow_dispatch:
    inputs:
      deploy:
        description: "Sync + invalidate after building (uncheck for build-only)"
        type: boolean
        default: true

permissions:
  id-token: write
  contents: read

jobs:
  build:
    name: Build Angular 14 (serfel + coproad)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 16 (Angular 14 toolchain)
        uses: actions/setup-node@v4
        with:
          node-version: "16"

      - name: Build both configurations
        working-directory: apps/legacy-frontend
        run: |
          # SST regenerates sst-env.d.ts and it breaks the Angular tsc build.
          find . -name "sst-env.d.ts" -not -path "./node_modules/*" -delete || true
          # npm install (not npm ci): this vendored app's lockfile is rejected by
          # npm ci; npm install reconciles it. Output is content-hash stable.
          npm install
          npx ng build --configuration production
          npx ng build --configuration coproad

      - name: Upload dist artifact
        uses: actions/upload-artifact@v4
        with:
          name: legacy-frontend-dist
          path: apps/legacy-frontend/dist
          retention-days: 1

  deploy:
    name: Sync to S3 + invalidate CloudFront
    if: ${{ inputs.deploy }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download dist artifact
        uses: actions/download-artifact@v4
        with:
          name: legacy-frontend-dist
          path: dist

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::146476548567:role/serfel-github-actions-role
          aws-region: us-east-1

      - name: Discover buckets + distribution
        id: disc
        run: |
          SERFEL_BUCKET=$(aws s3api list-buckets \
            --query "Buckets[?starts_with(Name, 'serfel-dev-rehostlegacyfrontendbucket-')].Name | [0]" \
            --output text)
          COPROAD_BUCKET=$(aws s3api list-buckets \
            --query "Buckets[?starts_with(Name, 'serfel-dev-rehostcoproadfrontendbucket-')].Name | [0]" \
            --output text)
          DIST_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Comment=='serfel-dev-rehost-router'].Id | [0]" \
            --output text)
          if [ "$SERFEL_BUCKET" = "None" ] || [ "$COPROAD_BUCKET" = "None" ] || [ "$DIST_ID" = "None" ]; then
            echo "::error::Could not resolve buckets or distribution. Run 'sst deploy' (Deploy 1) first."
            exit 1
          fi
          echo "serfel_bucket=$SERFEL_BUCKET" >> "$GITHUB_OUTPUT"
          echo "coproad_bucket=$COPROAD_BUCKET" >> "$GITHUB_OUTPUT"
          echo "dist_id=$DIST_ID" >> "$GITHUB_OUTPUT"

      - name: Sync serfel
        run: aws s3 sync dist/serfel-ang "s3://${{ steps.disc.outputs.serfel_bucket }}" --delete

      - name: Sync coproad
        run: aws s3 sync dist/coproad-ang "s3://${{ steps.disc.outputs.coproad_bucket }}" --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id "${{ steps.disc.outputs.dist_id }}" --paths "/*"
```

- [ ] **Step 2: Validate YAML parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-legacy-frontend.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Review the discovery query prefixes**

Confirm the prefixes are lowercased (S3 names are lowercase): `serfel-dev-rehostlegacyfrontendbucket-` and `serfel-dev-rehostcoproadfrontendbucket-`. These match `serfel` app + `dev` stage + the Task 1 logical names lowercased. (Actual bucket names are verified against reality in the Phase A checkpoint.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-legacy-frontend.yml
git commit -m "ci: add manual workflow_dispatch to build+deploy legacy frontend"
```

---

### Phase A checkpoint (operator actions — not code)

These run against `dev` after Phase A is merged. Do not proceed to Phase B until they pass.

- [ ] **A1:** Merge Phase A to `main` (or run `AWS_PROFILE=admin-christian ./scripts/sst-deploy.sh --stage dev` with Node 22). `sst deploy` creates the two empty buckets. The Router still points at the StaticSites, so nothing user-visible changes.
- [ ] **A2:** Confirm the real bucket names match the workflow prefixes:
  `aws s3api list-buckets --query "Buckets[?contains(Name, 'rehostlegacyfrontendbucket') || contains(Name, 'rehostcoproadfrontendbucket')].Name" --output text --region us-east-1`
  If the actual prefix differs from the assumption in Task 2 Step 3, update the two `starts_with(...)` queries in the workflow and the README, then re-commit.
- [ ] **A3:** Trigger the manual workflow (Actions -> "Deploy legacy frontend (manual)" -> Run workflow, `deploy` checked). It builds and pre-populates BOTH new buckets.
- [ ] **A4:** Confirm content landed:
  `aws s3 ls s3://<serfel-bucket>/index.html` and `aws s3 ls s3://<coproad-bucket>/coproad/index.html`
  Expected: both objects listed. (The buckets are not yet reachable via CloudFront — that is Deploy 2. This only pre-stages content so `/*` never serves empty.)

---

## Phase B — Deploy 2: flip the Router to the buckets and remove the StaticSites

### Task 3: Route `/*` and `/coproad/*` to the buckets with SPA fallback

**Files:**
- Modify: `infra/rehost/cdn.ts`

**Interfaces:**
- Consumes: `legacyBucket` (from `./legacy-frontend`), `coproadBucket` (from `./coproad-frontend`), and the unchanged `nodeApiUrl`, `albDnsName`, `originVerifySecret`, `stackTags`, `webAclArn`.
- Produces: `export const rehostCdnUrl` (unchanged export name).

- [ ] **Step 1: Swap the imports**

Replace line `import { legacySite } from "./legacy-frontend";` with:
```ts
import { legacyBucket } from "./legacy-frontend";
```
Replace line `import { coproadSite } from "./coproad-frontend";` with:
```ts
import { coproadBucket } from "./coproad-frontend";
```

- [ ] **Step 2: Replace the two S3 routes with bucket routes + SPA functions**

In the `routes` object, replace `"/coproad/*": coproadSite.url,` with:
```ts
    "/coproad/*": {
      bucket: coproadBucket,
      // SPA deep-link fallback, scoped to THIS behavior only (a distribution-wide
      // customErrorResponses would also rewrite PHP/ALB 404s). Extensionless
      // paths (e.g. /coproad/ruta/1) -> the coproad index; real files pass through.
      edge: {
        viewerRequest: {
          injection: `if (event.request.uri.split('/').pop().indexOf('.') === -1) { event.request.uri = '/coproad/index.html'; }`,
        },
      },
    },
```
and replace `"/*": legacySite.url,` with:
```ts
    "/*": {
      bucket: legacyBucket,
      // SPA deep-link fallback for serfel, scoped to the default S3 behavior.
      edge: {
        viewerRequest: {
          injection: `if (event.request.uri.split('/').pop().indexOf('.') === -1) { event.request.uri = '/index.html'; }`,
        },
      },
    },
```
Leave every other route (`/coproad/sales/*`, `/coproad/orders/*`, `/api/node/*`, `/sales/*`, `/orders/*`) and the entire `transform.cdn` block (ALB origin + behaviors + comment + tags + webAclArn) unchanged.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Verify no stale StaticSite references remain in cdn.ts**

Run: `grep -n "legacySite\|coproadSite" infra/rehost/cdn.ts`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add infra/rehost/cdn.ts
git commit -m "feat(rehost): route legacy frontend to S3 buckets with SPA fallback"
```

---

### Task 4: Remove the two `StaticSite` components

**Files:**
- Modify: `infra/rehost/legacy-frontend.ts`
- Modify: `infra/rehost/coproad-frontend.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: each file now exports only its `*Bucket` (from Task 1). `legacySite`/`legacyFrontendUrl`/`coproadSite`/`coproadFrontendUrl` are removed (they are defined-but-unused after Task 3).

- [ ] **Step 1: Reduce `infra/rehost/legacy-frontend.ts` to only the bucket**

The file should contain only the imports it still needs plus the `legacyBucket` export. Final content:
```ts
import { stackTags } from "../tags";

// SST owns this empty bucket; the legacy Angular 14 serfel app (dist/serfel-ang)
// is pushed manually — see apps/legacy-frontend/README.md. The rehost Router
// (infra/rehost/cdn.ts) serves it at `/*` with a per-route SPA fallback.
export const legacyBucket = new sst.aws.Bucket("RehostLegacyFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
    },
  },
});
```
(The `webAclArn` import is no longer used here — it was only on the StaticSite cdn transform — so drop it.)

- [ ] **Step 2: Reduce `infra/rehost/coproad-frontend.ts` to only the bucket**

Final content:
```ts
import { stackTags } from "../tags";

// SST owns this empty bucket; the coproad variant (dist/coproad-ang, nested
// under coproad/) is pushed manually — see apps/legacy-frontend/README.md. The
// rehost Router serves it at `/coproad/*` with a per-route SPA fallback.
export const coproadBucket = new sst.aws.Bucket("RehostCoproadFrontendBucket", {
  access: "cloudfront",
  transform: {
    bucket: (bArgs) => {
      bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
    },
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Verify the StaticSites and unused exports are gone repo-wide**

Run: `grep -rn "RehostLegacyFrontend\"\|RehostCoproadFrontend\"\|legacySite\|coproadSite\|legacyFrontendUrl\|coproadFrontendUrl" infra/ sst.config.ts`
Expected: no output (only the new `RehostLegacyFrontendBucket` / `RehostCoproadFrontendBucket` names remain, which this pattern does not match).

- [ ] **Step 5: Commit**

```bash
git add infra/rehost/legacy-frontend.ts infra/rehost/coproad-frontend.ts
git commit -m "refactor(rehost): drop legacy-frontend StaticSites (buckets only now)"
```

---

### Task 5: Remove the Angular build from push-to-`main` CI

**Files:**
- Modify: `.github/workflows/deploy-dev.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a `deploy-dev.yml` that no longer sets up Node 16 or builds Angular.

- [ ] **Step 1: Delete the legacy Angular build block**

Remove the whole block from the `# --- Legacy Angular 14 build (Fase 3.5 rehost) ---` comment through the `npx ng build --configuration coproad` step and its trailing blank line (currently lines 19-48), so the `Checkout` step is followed directly by `# --- Main toolchain: Node 22 + pnpm (SST) ---`.

- [ ] **Step 2: Verify the build steps are gone but the pipeline is intact**

Run: `grep -n "legacy-frontend\|configuration production\|configuration coproad\|Setup Node 16" .github/workflows/deploy-dev.yml`
Expected: no output.
Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-dev.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "ci: stop building legacy Angular frontend on push to main"
```

---

### Task 6: Document the manual deploy process in the README

**Files:**
- Modify: `apps/legacy-frontend/README.md`

**Interfaces:**
- Consumes: the workflow from Task 2; the discovery queries from Task 2.
- Produces: operator documentation (both GitHub Action and local paths), mirroring `legacy-php/README.md`.

- [ ] **Step 1: Append a "Deploy manual a AWS" section**

Append to `apps/legacy-frontend/README.md`:

````markdown
---

## Deploy manual a AWS (Fase 3.5 rehost)

La app Angular 14 legada (variantes **serfel** y **coproad**) se despliega de
forma **manual**, igual que la imagen PHP legada (`legacy-php/README.md`): SST
administra la infraestructura (dos buckets S3 vacios + el CloudFront del
`RehostRouter`), y subir contenido nuevo es un paso manual bajo demanda.

### Por que se despliega manualmente

- El codigo del frontend legado cambia poco.
- Se compila con Node 16 (toolchain distinto al monorepo Node 22), lo que hacia
  lento el CI en cada push.
- `sst deploy` administra los buckets y el Router, pero **nunca** sube contenido
  Angular: un `sst.aws.Bucket` no sube archivos. El contenido lo sube este
  proceso manual.

### Cuando ejecutarlo

Cada vez que cambies codigo bajo `apps/legacy-frontend/` y quieras publicarlo.

### Opcion A: GitHub Action (recomendado)

Actions -> **"Deploy legacy frontend (manual)"** -> **Run workflow**. El job
`build` compila con Node 16 (serfel + coproad) y el job `deploy` sincroniza los
buckets e invalida CloudFront. Desmarca `deploy` para solo compilar.

### Opcion B: Local

Requiere Node 16 y AWS CLI autenticado a la cuenta `146476548567` (`us-east-1`).
Ejecutar desde `apps/legacy-frontend/`.

```bash
# 1. Compilar ambas configuraciones (Node 16).
find . -name "sst-env.d.ts" -not -path "./node_modules/*" -delete || true
npm install
npx ng build --configuration production   # -> dist/serfel-ang
npx ng build --configuration coproad      # -> dist/coproad-ang/coproad (base-href /coproad/)

# 2. Descubrir los buckets (nombre generado por SST) y la distribucion.
SERFEL_BUCKET=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'serfel-dev-rehostlegacyfrontendbucket-')].Name | [0]" --output text)
COPROAD_BUCKET=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'serfel-dev-rehostcoproadfrontendbucket-')].Name | [0]" --output text)
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='serfel-dev-rehost-router'].Id | [0]" --output text)

# 3. Subir (--delete elimina archivos viejos con hash antiguo).
aws s3 sync dist/serfel-ang  "s3://$SERFEL_BUCKET"  --delete
aws s3 sync dist/coproad-ang "s3://$COPROAD_BUCKET" --delete

# 4. Invalidar CloudFront.
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

### Verificar

Tras invalidar, abre la URL del `RehostRouter`: la app serfel carga en `/` y la
coproad en `/coproad/`. Refrescar una ruta profunda (p. ej. `/rutas/1` o
`/coproad/rutas/1`) debe seguir cargando la app (fallback SPA por funcion
viewer-request). El PHP legado (`/Distribuidor`, `/SerfelWeb`) no se ve afectado.

### Limpieza unica de recursos huerfanos (solo la primera vez)

Al migrar de `StaticSite` a `Bucket`, los buckets S3 anteriores y sus
distribuciones CloudFront internas quedan **retenidos** (politica `retain` de
`dev`), no borrados. Una sola vez, tras confirmar que los buckets nuevos sirven
bien: deshabilita y borra esas 2 distribuciones CloudFront huerfanas y vacia +
borra los 2 buckets huerfanos.
````

- [ ] **Step 2: Verify the section renders and links are consistent**

Run: `grep -n "Deploy manual a AWS\|rehostlegacyfrontendbucket\|serfel-dev-rehost-router" apps/legacy-frontend/README.md`
Expected: the new section and the same discovery identifiers used in Task 2.

- [ ] **Step 3: Commit**

```bash
git add apps/legacy-frontend/README.md
git commit -m "docs(legacy-frontend): document manual AWS deploy (serfel + coproad)"
```

---

### Phase B checkpoint (operator actions — not code)

- [ ] **B1:** Merge Phase B to `main` (or `sst deploy` to `dev`). The Router updates in place (same distribution/domain) to serve the pre-synced buckets; the StaticSites are removed. Because the buckets were populated in A3, `/*` and `/coproad/*` serve content immediately — no gap.
- [ ] **B2:** Smoke test: open the `RehostRouter` URL — serfel at `/`, coproad at `/coproad/`; refresh a deep link on each and confirm the SPA loads; confirm `/Distribuidor` and `/SerfelWeb` (PHP) still respond.
- [ ] **B3:** One-time orphan cleanup (per README): delete the 2 orphaned StaticSite CloudFront distributions and empty + delete the 2 orphaned S3 buckets, after B2 passes.

---

## Self-Review

**Spec coverage:**
- StaticSite -> Bucket (both variants) — Tasks 1, 4. ✅
- Router bucket routes + scoped SPA fallback — Task 3. ✅
- Remove Angular build from push CI — Task 5. ✅
- Manual `workflow_dispatch` (build + deploy jobs) — Task 2. ✅
- README with local + coproad steps — Task 6. ✅
- Zero-downtime two-step (pre-sync before flip) — Phase A/B split + checkpoints. ✅
- Orphaned-resource one-time cleanup — README (Task 6) + checkpoint B3. ✅
- PHP/ALB path untouched — enforced by Global Constraints + Task 3 Step 2. ✅

**Placeholder scan:** none — all steps carry concrete code/commands.

**Type/name consistency:** `legacyBucket`/`coproadBucket` produced in Task 1, consumed in Task 3, sole exports after Task 4. Logical names `RehostLegacyFrontendBucket`/`RehostCoproadFrontendBucket` and the lowercased discovery prefixes match across Tasks 1, 2, 4, 6. Router export `rehostCdnUrl` and comment `serfel-${stage}-rehost-router` unchanged.
