# Manual deploy for the legacy Angular 14 frontend

Date: 2026-08-13

## Goal

Make the legacy Angular 14 frontend (serfel + coproad variants) deploy
**manually**, the same operational model as the legacy PHP rehost image: SST owns
the AWS infrastructure, and pushing new **content** is a manual, on-demand step.
Remove the legacy Angular build from the push-to-`main` CI pipeline.

## Why

Today `apps/legacy-frontend` is served by two `sst.aws.StaticSite` components
(`infra/rehost/legacy-frontend.ts`, `infra/rehost/coproad-frontend.ts`). A
`StaticSite` couples **build** and **S3 upload** into `sst deploy`, and the
rehost Router (`infra/rehost/cdn.ts`) consumes their `.url` as CloudFront
origins. Consequences:

- Every push to `main` rebuilds Angular 14 with Node 16 (a separate toolchain
  from the Node 22 monorepo), slowing CI and cluttering logs.
- The legacy frontend code changes rarely, so rebuilding on every push is waste.
- This mirrors the legacy PHP image, which is already deployed manually
  (`legacy-php/README.md`): SST owns ECS/ECR, the image push is manual.

## Approach

Convert the two `StaticSite` components to bare `sst.aws.Bucket` resources that
SST always creates but never populates. The Router routes to the buckets. The
Angular build + S3 upload + CloudFront invalidation become a manual step, run
either from a `workflow_dispatch` GitHub Action or locally.

### Why bucket routes, not StaticSite

- A bare `sst.aws.Bucket` uploads nothing, so `sst deploy` on every push no
  longer needs `dist/` to exist and never touches frontend content.
- SST is declarative and keyed by logical name: the bucket is created once and
  is a no-op on every subsequent deploy. Running `sst deploy` N times yields
  **one** bucket, not N. Push-to-`main` only ever reconciles the empty bucket
  resource; the synced `dist/` is never wiped.
- The Router (`sst.aws.Router("RehostRouter")`) keeps its logical name and type,
  so it updates **in place** (same distribution, domain, DNS). The ALB/PHP
  origin splice and its behaviors are unchanged, so the PHP rehost path is not
  affected.

### SPA deep-link fallback, scoped to S3

`StaticSite` auto-configures a 404 -> `index.html` fallback so refreshing a
client-side route (e.g. `/ruta/123`) still loads the app. CloudFront
`customErrorResponses` are **distribution-wide**, so re-creating the fallback
that way would also rewrite PHP/ALB 404s — wrong. Instead, use the Router's
**per-route** `edge.viewerRequest.injection` (a CloudFront Function attached only
to the S3 behaviors) to rewrite extensionless request paths to the variant
index. This is scoped to `/*` (serfel) and `/coproad/*` (coproad) only; the
PHP/ALB, `/api/node`, `/sales`, `/orders` routes are untouched.

## Zero-downtime two-step migration

Converting `StaticSite` -> `Bucket` under the **same** logical name is a resource
**replacement**: SST destroys/orphans the old bucket and creates a new **empty**
one, leaving `/*` pointing at an empty bucket until the first manual sync. To
avoid any visible frontend gap on `dev` (currently acting as temp-prod), the
migration uses **new logical names** and two deploys.

The PHP rehost path is unaffected throughout; only the Angular S3 side moves.

### Deploy 1 — add new buckets alongside the existing StaticSites

- Add new `sst.aws.Bucket` resources with **new logical names**
  (`RehostLegacyFrontendBucket`, `RehostCoproadFrontendBucket`), each with
  `access: "cloudfront"` and the existing tag transform.
- Leave both `StaticSite` components in place; the Router still points at their
  `.url`. No user-visible change.
- Add the manual deploy workflow (`.github/workflows/deploy-legacy-frontend.yml`).
- CI (`deploy-dev.yml`) is **unchanged** — the StaticSites still exist and still
  need `dist/`, so the Node-16 Angular build stays for now.
- After deploy: run the manual deploy to populate the two new buckets.

### Deploy 2 — flip the Router and remove the StaticSites

- Router (`cdn.ts`): route `/*` -> new legacy bucket and `/coproad/*` -> new
  coproad bucket, each with the `edge.viewerRequest` SPA-fallback function. Keep
  the `/coproad/sales/*`, `/coproad/orders/*` -> node API routes, the ALB origin
  splice, and all ALB behaviors exactly as they are.
- Remove the two `StaticSite` components and their imports.
- Remove the Node-16 setup + "Build legacy Angular frontend" steps from
  `deploy-dev.yml`.
- Add the deploy README (see below).
- After deploy: the old StaticSite buckets + their inner CloudFront distributions
  are **orphaned** (retained under `dev`'s `retain` removal policy). One-time
  manual cleanup — see "Orphaned resources" below.

At no point is `/*` served from an empty bucket.

## Components changed

| File | Change |
| --- | --- |
| `infra/rehost/legacy-frontend.ts` | `StaticSite` -> `Bucket` (new logical name), export the bucket. |
| `infra/rehost/coproad-frontend.ts` | `StaticSite` -> `Bucket` (new logical name), export the bucket. |
| `infra/rehost/cdn.ts` | Routes `/*` and `/coproad/*` -> buckets + per-route SPA `viewerRequest` function. |
| `.github/workflows/deploy-dev.yml` | Remove Node-16 setup + Angular build steps (Deploy 2). |
| `.github/workflows/deploy-legacy-frontend.yml` | New `workflow_dispatch` build + deploy workflow. |
| `apps/legacy-frontend/README.md` | Add "Deploy manual a AWS" section (serfel + coproad). |

## Manual deploy workflow (`deploy-legacy-frontend.yml`)

`workflow_dispatch` with an `action` input: `build-and-deploy` (default),
`build-only`, `deploy-only`.

- **build job:** Node 16 -> `npm install` -> `ng build --configuration production`
  (serfel, `dist/serfel-ang`) + `ng build --configuration coproad` (coproad,
  `dist/coproad-ang/coproad`, base-href `/coproad/`). Uploads `dist/` as a
  workflow artifact. Mirrors the current CI build (defensive `sst-env.d.ts`
  delete; `npm install` not `npm ci`).
- **deploy job:** OIDC into AWS (account 146476548567), download the artifact,
  discover the two buckets (by name prefix) and the Router distribution (by its
  `serfel-dev-rehost-router` CloudFront comment), `aws s3 sync --delete` each
  dist to its bucket, then `aws cloudfront create-invalidation`.

Resources are discovered at runtime (bucket name prefix + distribution comment),
so no SST state plumbing is needed in the workflow.

## Local deploy (README, equivalent to the workflow)

Documented in `apps/legacy-frontend/README.md`, mirroring `legacy-php/README.md`
(Spanish, same section structure: what it is, why manual, when, requirements,
steps, verify): `ng build` both configurations -> `aws s3 sync --delete` to each
bucket -> `aws cloudfront create-invalidation`, with the coproad variant spelled
out. Requires Node 16 and AWS CLI authenticated to account 146476548567.

## Orphaned resources (one-time cleanup)

After Deploy 2 removes the StaticSites, their old S3 buckets and inner CloudFront
distributions are retained (not deleted) because `dev` uses `removal: "retain"`.
These are one-time leftovers (exactly one set per variant), not per-deploy
sprawl. Cleanup: disable + delete the two orphaned StaticSite CloudFront
distributions and empty + delete the two orphaned buckets, once, after
confirming the new buckets serve correctly. Documented in the README and
surfaced to the user at the end of the work.

## Out of scope

- The main Angular 20 frontend (`infra/frontend.ts`) — unchanged.
- The legacy PHP image deploy — already manual, unchanged.
- Any Angular source changes.
