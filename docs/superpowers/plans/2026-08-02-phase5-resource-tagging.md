# Phase 5 Resource Tagging (`serfel:stack`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag every taggable AWS resource in the SST stack with `serfel:stack ∈ {serfel-aws, serfel-rehost, serfel-shared}` so costs can be attributed per application group and the legacy rehost can be inventoried/decommissioned programmatically.

**Architecture:** The AWS provider `defaultTags` in `sst.config.ts` already applies `Project`/`Owner`/`Environment` globally to every taggable resource — this plan does **not** touch that. It adds a single per-app tag key, `serfel:stack`, applied **per infra module** because its value varies by resource group. Raw Pulumi resources get the tag spread into their `tags` object; top-level SST components (`Function`, `ApiGatewayV2`, `StaticSite`, `Router`) get it via their `transform` prop. A shell audit script (`scripts/tag-audit.sh`) is the verification harness: it lists project resources missing `serfel:stack`.

**Tech Stack:** SST v3 (Pulumi/Ion), `@pulumi/aws`, TypeScript, AWS CLI (`resourcegroupstaggingapi`), bash, jq.

## Global Constraints

- Node >=22, pnpm workspaces. Run all commands from repo root unless noted.
- Tag key is exactly `serfel:stack` (lowercase, colon-namespaced). Do **not** rename or duplicate the existing `Project` / `Owner` / `Environment` tags.
- The three allowed values are exactly `serfel-aws`, `serfel-rehost`, `serfel-shared` — no other values.
- Do **not** modify `defaultTags` in `sst.config.ts`.
- Region is `us-east-1`, stage is `dev`. Resource names are `serfel-<stage>-*`.
- No em dashes in any AWS resource name, description, or tag value — use hyphens.
- Non-taggable resources are skipped on purpose (see the "Non-taggable — skip" lists). Do not invent a `tags` field on them; `sst deploy` will error.

**Classification map (which file → which value):**

| `serfel:stack` | Files |
|----------------|-------|
| `serfel-shared` | `infra/vpc.ts`, `infra/database.ts`, `infra/bastion.ts`, `infra/migrate.ts`, `infra/db-guard.ts`, `infra/oidc.ts` |
| `serfel-aws` | `infra/api.ts`, `infra/auth.ts`, `infra/frontend.ts` |
| `serfel-rehost` | `infra/rehost/network.ts`, `infra/rehost/vpc-endpoints.ts`, `infra/rehost/ecr.ts`, `infra/rehost/alb.ts`, `infra/rehost/fargate.ts`, `infra/rehost/basic-auth.ts`, `infra/rehost/node-api.ts`, `infra/rehost/legacy-frontend.ts`, `infra/rehost/cdn.ts` |

**Edit rules (referenced by every tagging task):**

- **Rule R (raw resource, already has `tags: { Name: ... }`)** — add the spread: `tags: { Name: "...", ...stackTags("<value>") }`.
- **Rule N (raw resource, no `tags` field, but taggable)** — add `tags: stackTags("<value>")`.
- **Rule F (SST `sst.aws.Function`)** — in `transform`, add `tags` to `function` (and, when a `logGroup` transform already exists in that resource, to `logGroup` too): `transform: { function: { name: "...", tags: stackTags("<value>") } }`.
- **Rule A (SST `sst.aws.ApiGatewayV2`)** — in `transform`, add `tags` to `api`: `transform: { api: { name: "...", tags: stackTags("<value>") } }`.
- **Rule S (SST `sst.aws.StaticSite`)** — add a `transform.assets` callback tagging the S3 bucket: `transform: { assets: (args) => { args.tags = { ...(args.tags as Record<string, string> | undefined), ...stackTags("<value>") }; } }`. The CloudFront distribution created by StaticSite is a documented exception (keeps only `defaultTags`) — see Task 6.
- **Rule C (SST `sst.aws.Router`, cdn transform)** — inside the existing `transform.cdn` callback, add `args.tags = { ...(args.tags as Record<string, string> | undefined), ...stackTags("<value>") };` to tag the CloudFront distribution.

`stackTags` is defined in Task 1 and imported as `import { stackTags } from "./tags";` (root `infra/*`) or `import { stackTags } from "../tags";` (`infra/rehost/*`).

---

### Task 1: Tag helper

**Files:**
- Create: `infra/tags.ts`

**Interfaces:**
- Produces: `stackTags(stack: StackTag): { "serfel:stack": StackTag }` where `type StackTag = "serfel-aws" | "serfel-rehost" | "serfel-shared"`. Every later task imports `stackTags`.

- [ ] **Step 1: Create the helper**

Create `infra/tags.ts`:

```ts
/** Application group a resource belongs to, surfaced as the `serfel:stack` tag. */
export type StackTag = "serfel-aws" | "serfel-rehost" | "serfel-shared";

/**
 * Per-module tag identifying the app group. Merge into a resource's `tags`
 * (raw Pulumi resources) or inject via a component's `transform` (SST
 * components). The global Project/Owner/Environment tags come from
 * `defaultTags` in sst.config.ts and are NOT repeated here.
 */
export function stackTags(stack: StackTag): { "serfel:stack": StackTag } {
  return { "serfel:stack": stack };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS (no errors). If `infra/` is not covered by the root tsconfig, instead run `npx tsc --noEmit infra/tags.ts` and expect no output.

- [ ] **Step 3: Commit**

```bash
git add infra/tags.ts
git commit -m "feat(infra): add stackTags helper for serfel:stack tagging"
```

---

### Task 2: Tag-audit script (verification harness)

**Files:**
- Create: `scripts/tag-audit.sh`
- Create: `scripts/tag-audit-allowlist.txt`

**Interfaces:**
- Produces: `scripts/tag-audit.sh` — lists every resource tagged `Project=serfel-ventas` that is **missing** the `serfel:stack` key, minus ARN substrings listed in the allowlist. Exits non-zero when unexpected offenders remain. This is the "test" the tagging tasks make pass.

- [ ] **Step 1: Write the allowlist (known non-taggable / SST-child exceptions)**

Create `scripts/tag-audit-allowlist.txt`. Substring match against resource ARNs; one per line, `#` comments allowed. Seed it with the CloudFront distributions created by StaticSite/Router (Rule S/C caveat) and Cognito user-pool clients (not taggable). ARNs are discovered on first run; start with the resource-type markers we already know will appear:

```
# Resources that legitimately carry only defaultTags (no serfel:stack).
# StaticSite/Router CloudFront distributions expose no tag transform in this SST version.
:cloudfront::
# Cognito user pool CLIENTS are not taggable (the user POOL is tagged).
:userpoolclient/
```

- [ ] **Step 2: Write the audit script**

Create `scripts/tag-audit.sh`:

```bash
#!/usr/bin/env bash
# Lists project resources (Project=serfel-ventas) missing the serfel:stack tag.
# Exits 1 if any offender is not in scripts/tag-audit-allowlist.txt.
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ALLOWLIST="$(dirname "$0")/tag-audit-allowlist.txt"

# All taggable resources in this project, via the Resource Groups Tagging API.
resources_json="$(aws resourcegroupstaggingapi get-resources \
  --region "$REGION" \
  --tag-filters Key=Project,Values=serfel-ventas \
  --output json)"

# ARNs whose tag set lacks the serfel:stack key.
missing="$(echo "$resources_json" | jq -r '
  .ResourceTagMappingList[]
  | select(any(.Tags[]; .Key == "serfel:stack") | not)
  | .ResourceARN')"

# Drop allowlisted ARNs (substring match).
offenders=""
while IFS= read -r arn; do
  [ -z "$arn" ] && continue
  skip=""
  while IFS= read -r pat; do
    case "$pat" in ""|\#*) continue;; esac
    if [[ "$arn" == *"$pat"* ]]; then skip="yes"; break; fi
  done < "$ALLOWLIST"
  [ -z "$skip" ] && offenders="${offenders}${arn}"$'\n'
done <<< "$missing"

offenders="$(echo "$offenders" | sed '/^$/d')"

if [ -n "$offenders" ]; then
  echo "Resources missing serfel:stack (not allowlisted):"
  echo "$offenders"
  exit 1
fi
echo "OK: every non-allowlisted resource carries serfel:stack."
```

- [ ] **Step 3: Make it executable and run it against the current (untagged) stack**

Run:
```bash
chmod +x scripts/tag-audit.sh
./scripts/tag-audit.sh || true
```
Expected: prints a list of offender ARNs and (without `|| true`) would exit 1 — because nothing is tagged with `serfel:stack` yet. This confirms the harness detects the gap. (Requires AWS credentials for the `dev` account; if unavailable in this environment, note that and defer the run to Task 6.)

- [ ] **Step 4: Commit**

```bash
git add scripts/tag-audit.sh scripts/tag-audit-allowlist.txt
git commit -m "test(infra): add tag-audit script for serfel:stack coverage"
```

---

### Task 3: Tag `serfel-shared` resources

**Files:**
- Modify: `infra/vpc.ts`, `infra/database.ts`, `infra/bastion.ts`, `infra/migrate.ts`, `infra/db-guard.ts`, `infra/oidc.ts`

**Interfaces:**
- Consumes: `stackTags` from Task 1.

- [ ] **Step 1: `infra/vpc.ts` — add import and apply Rule R to every tagged resource**

Add at top: `import { stackTags } from "./tags";`

Apply **Rule R** (spread `...stackTags("serfel-shared")` into the existing `tags` object) to each of: `vpc`, `igw`, `publicSubnet1a`, `publicSubnet1b`, `privateSubnet1a`, `privateSubnet1b`, `publicRt`, `privateRt`, `sgEndpoints`, `sgRds`, `sgLambda`, the `s3-gw-endpoint`, and the interface endpoint created in the `for` loop.

Example (vpc):
```ts
const vpc = new aws.ec2.Vpc("vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "serfel-dev-vpc", ...stackTags("serfel-shared") },
});
```
Example (loop endpoint):
```ts
    tags: { Name: `serfel-dev-${service}-endpoint`, ...stackTags("serfel-shared") },
```
**Non-taggable — skip:** the four `RouteTableAssociation` and the `rds-from-lambda` `SecurityGroupRule`.

- [ ] **Step 2: `infra/database.ts`**

Add `import { stackTags } from "./tags";`. Apply **Rule R** to `dbSubnets`, `dbParams`, `db`. Apply **Rule N** to `dbSecret` (it has no `tags` today):
```ts
const dbSecret = new aws.secretsmanager.Secret("db-secret", {
  name: "serfel-dev-db-credentials",
  description: "Serfel dev RDS MariaDB master credentials",
  tags: stackTags("serfel-shared"),
});
```
**Skip:** `SecretVersion` (not taggable), `RandomPassword` (not an AWS resource).

- [ ] **Step 3: `infra/bastion.ts`**

Add `import { stackTags } from "./tags";`. Apply **Rule R** to `sgBastion` and the `bastion` instance. Apply **Rule N** to `bastionRole` and `bastionProfile`:
```ts
const bastionRole = new aws.iam.Role("bastion-role", {
  name: "serfel-dev-bastion-role",
  assumeRolePolicy: JSON.stringify({ /* unchanged */
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }],
  }),
  tags: stackTags("serfel-shared"),
});
```
```ts
const bastionProfile = new aws.iam.InstanceProfile("bastion-profile", {
  name: "serfel-dev-bastion-profile",
  role: bastionRole.name,
  tags: stackTags("serfel-shared"),
});
```
**Skip:** `bastion-ssm-core` `RolePolicyAttachment`, `rds-from-bastion` `SecurityGroupRule`, the `getAmiOutput` lookup.

- [ ] **Step 4: `infra/migrate.ts` — Rule F**

Add `import { stackTags } from "./tags";`. This `sst.aws.Function` already has both a `function` and `logGroup` transform; add `tags` to both:
```ts
  transform: {
    function: { name: "serfel-dev-migrate", tags: stackTags("serfel-shared") },
    logGroup: { name: "/aws/lambda/serfel-dev-migrate", tags: stackTags("serfel-shared") },
  },
```

- [ ] **Step 5: `infra/db-guard.ts` — Rule F + Rule N**

Add `import { stackTags } from "./tags";`. Apply **Rule F** to `guardFn` (both `function` and `logGroup` transforms exist):
```ts
  transform: {
    function: { name: "serfel-dev-db-guard", tags: stackTags("serfel-shared") },
    logGroup: { name: "/aws/lambda/serfel-dev-db-guard", tags: stackTags("serfel-shared") },
  },
```
Apply **Rule N** to the `db-autostart-rule` `EventRule`:
```ts
const rule = new aws.cloudwatch.EventRule("db-autostart-rule", {
  name: "serfel-dev-db-autostart-guard",
  description: "Re-stop serfel-dev-db when AWS force-starts it after 7 days stopped",
  eventPattern: JSON.stringify({ /* unchanged */
    source: ["aws.rds"],
    "detail-type": ["RDS DB Instance Event"],
    detail: { SourceIdentifier: [dbInstanceIdentifier], EventID: ["RDS-EVENT-0154"] },
  }),
  tags: stackTags("serfel-shared"),
});
```
**Skip:** `EventTarget`, the `lambda.Permission`.

- [ ] **Step 6: `infra/oidc.ts` — Rule N**

Add `import { stackTags } from "./tags";`. Apply **Rule N** to `githubOidcProvider` and `githubActionsRole`:
```ts
const githubOidcProvider = new aws.iam.OpenIdConnectProvider("github-oidc", {
  url: "https://token.actions.githubusercontent.com",
  clientIdLists: ["sts.amazonaws.com"],
  thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
  tags: stackTags("serfel-shared"),
});
```
```ts
const githubActionsRole = new aws.iam.Role("github-actions-role", {
  name: "serfel-github-actions-role",
  assumeRolePolicy,
  tags: stackTags("serfel-shared"),
});
```
**Skip:** the `RolePolicyAttachment`.

- [ ] **Step 7: Verify typecheck and review the diff**

Run: `pnpm typecheck` (expect PASS). Then `git diff --stat infra/` and confirm only the six shared files changed, and every change is an added import or an added `serfel-shared` tag — no logic or name changes.

- [ ] **Step 8: Commit**

```bash
git add infra/tags.ts infra/vpc.ts infra/database.ts infra/bastion.ts infra/migrate.ts infra/db-guard.ts infra/oidc.ts
git commit -m "feat(infra): tag shared resources serfel:stack=serfel-shared"
```

---

### Task 4: Tag `serfel-aws` resources

**Files:**
- Modify: `infra/api.ts`, `infra/auth.ts`, `infra/frontend.ts`

**Interfaces:**
- Consumes: `stackTags` from Task 1.

- [ ] **Step 1: `infra/api.ts` — Rule F + Rule A**

Add `import { stackTags } from "./tags";`. Apply **Rule F** to `productsFn` and `rutasFn` (they have only a `function` transform; add `tags` there):
```ts
  transform: {
    function: { name: "serfel-dev-products", tags: stackTags("serfel-aws") },
  },
```
```ts
  transform: {
    function: { name: "serfel-dev-rutas", tags: stackTags("serfel-aws") },
  },
```
Apply **Rule A** to the `api` `ApiGatewayV2`:
```ts
  transform: { api: { name: "serfel-dev-api", tags: stackTags("serfel-aws") } },
```
**Note:** the auto-created Lambda log groups for these functions have no `transform` here and will keep only `defaultTags` — that is the accepted Rule-F-without-logGroup caveat (near-zero cost); it is recorded in Task 6.

- [ ] **Step 2: `infra/auth.ts` — Rule R**

Add `import { stackTags } from "./tags";`. Apply **Rule R** to `userPool`:
```ts
  tags: { Name: "serfel-dev-users", ...stackTags("serfel-aws") },
```
**Skip:** `userPoolClient` (`aws.cognito.UserPoolClient` is not taggable — leave it; it is allowlisted in Task 2).

- [ ] **Step 3: `infra/frontend.ts` — Rule S**

Add `import { stackTags } from "./tags";`. Add a `transform.assets` callback to the `Frontend` StaticSite tagging its S3 bucket:
```ts
new sst.aws.StaticSite("Frontend", {
  path: "apps/frontend",
  build: { command: "pnpm run build", output: "dist/frontend/browser" },
  environment: {
    APP_API_URL: apiUrl,
    APP_USER_POOL_ID: userPoolId,
    APP_USER_POOL_CLIENT_ID: userPoolClientId,
  },
  errorPage: "index.html",
  transform: {
    assets: (args) => {
      args.tags = { ...(args.tags as Record<string, string> | undefined), ...stackTags("serfel-aws") };
    },
  },
});
```
**Caveat:** the CloudFront distribution this StaticSite creates keeps only `defaultTags` (allowlisted `:cloudfront::` in Task 2).

- [ ] **Step 4: Verify typecheck and review the diff**

Run: `pnpm typecheck` (expect PASS). `git diff infra/api.ts infra/auth.ts infra/frontend.ts` — confirm only tag additions.

- [ ] **Step 5: Commit**

```bash
git add infra/api.ts infra/auth.ts infra/frontend.ts
git commit -m "feat(infra): tag new-app resources serfel:stack=serfel-aws"
```

---

### Task 5: Tag `serfel-rehost` resources

**Files:**
- Modify: `infra/rehost/network.ts`, `infra/rehost/vpc-endpoints.ts`, `infra/rehost/ecr.ts`, `infra/rehost/alb.ts`, `infra/rehost/fargate.ts`, `infra/rehost/basic-auth.ts`, `infra/rehost/node-api.ts`, `infra/rehost/legacy-frontend.ts`, `infra/rehost/cdn.ts`

**Interfaces:**
- Consumes: `stackTags` from Task 1 (import path `../tags` in this directory).

- [ ] **Step 1: `infra/rehost/network.ts` — Rule R**

Add `import { stackTags } from "../tags";`. Apply **Rule R** to `sgAlb` and `sgFargate`:
```ts
  tags: { Name: "serfel-dev-rehost-alb", ...stackTags("serfel-rehost") },
```
```ts
  tags: { Name: "serfel-dev-rehost-fargate", ...stackTags("serfel-rehost") },
```
**Skip:** both `SecurityGroupRule`s and the two managed-prefix-list lookups.

- [ ] **Step 2: `infra/rehost/vpc-endpoints.ts` — Rule R**

Add `import { stackTags } from "../tags";`. Apply **Rule R** to `sgEcr` and the endpoint in the `for` loop:
```ts
  tags: { Name: "serfel-dev-rehost-ecr-endpoints", ...stackTags("serfel-rehost") },
```
```ts
    tags: { Name: `serfel-dev-rehost-${svc}`, ...stackTags("serfel-rehost") },
```

- [ ] **Step 3: `infra/rehost/ecr.ts` — Rule R (in the factory)**

Add `import { stackTags } from "../tags";`. Apply **Rule R** inside the `repo()` factory so both repos are covered:
```ts
    tags: { Name: `serfel-dev-rehost-${name}`, ...stackTags("serfel-rehost") },
```

- [ ] **Step 4: `infra/rehost/alb.ts` — Rule R + Rule N**

Add `import { stackTags } from "../tags";`. Apply **Rule R** to `alb` (`LoadBalancer`) and `phpApp1Tg` (`TargetGroup`). Apply **Rule N** to `listener` (`aws.lb.Listener`) and the `rehost-php-rule` `ListenerRule`:
```ts
const listener = new aws.lb.Listener("rehost-alb-listener", {
  loadBalancerArn: alb.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [{
    type: "fixed-response",
    fixedResponse: { contentType: "text/plain", messageBody: "no route", statusCode: "404" },
  }],
  tags: stackTags("serfel-rehost"),
});
```
```ts
new aws.lb.ListenerRule("rehost-php-rule", {
  listenerArn: listener.arn,
  priority: 10,
  conditions: [
    { pathPattern: { values: ["/Distribuidor*", "/SerfelWeb*"] } },
    { httpHeader: { httpHeaderName: "X-Origin-Verify", values: [originVerify.result] } },
  ],
  actions: [{ type: "forward", targetGroupArn: phpApp1Tg.arn }],
  tags: stackTags("serfel-rehost"),
});
```
**Skip:** the `RandomPassword`.

- [ ] **Step 5: `infra/rehost/fargate.ts` — Rule R + Rule N**

Add `import { stackTags } from "../tags";`. Apply **Rule R** to `cluster` and the `rehost-php1-svc` `Service`. Apply **Rule N** to `execRole` (`aws.iam.Role`), `logGroup` (`aws.cloudwatch.LogGroup`), and `taskDef` (`aws.ecs.TaskDefinition`):
```ts
const logGroup = new aws.cloudwatch.LogGroup("rehost-php1-logs", {
  name: "/ecs/serfel-dev-rehost-php-app-1",
  retentionInDays: 14,
  tags: stackTags("serfel-rehost"),
});
```
Add `tags: stackTags("serfel-rehost"),` as a top-level property to `execRole` and to `taskDef` (the `TaskDefinition` — add it alongside `family`, not inside `containerDefinitions`).
**Skip:** `RolePolicyAttachment`, the inline `RolePolicy`, the `RandomPassword` (`ciKey`).

- [ ] **Step 6: `infra/rehost/basic-auth.ts` — Rule N + Rule F**

Add `import { stackTags } from "../tags";`. Apply **Rule N** to `basicAuthSecret`:
```ts
const basicAuthSecret = new aws.secretsmanager.Secret("rehost-basic-auth", {
  name: "serfel-dev-rehost-basic-auth",
  description: "Basic Auth credentials for rehosted node APIs",
  tags: stackTags("serfel-rehost"),
});
```
Apply **Rule F** to `basicAuthorizerFn`:
```ts
  transform: { function: { name: "serfel-dev-rehost-basic-auth", tags: stackTags("serfel-rehost") } },
```
**Skip:** `SecretVersion`.

- [ ] **Step 7: `infra/rehost/node-api.ts` — Rule F + Rule A**

Add `import { stackTags } from "../tags";`. Apply **Rule F** to `healthFn`, `salesFn`, `ordersFn`:
```ts
  transform: { function: { name: "serfel-dev-rehost-health", tags: stackTags("serfel-rehost") } },
```
```ts
  transform: { function: { name: "serfel-dev-rehost-sales", tags: stackTags("serfel-rehost") } },
```
```ts
  transform: { function: { name: "serfel-dev-rehost-orders", tags: stackTags("serfel-rehost") } },
```
Apply **Rule A** to `nodeApi`:
```ts
  transform: { api: { name: "serfel-dev-rehost-node-api", tags: stackTags("serfel-rehost") } },
```

- [ ] **Step 8: `infra/rehost/legacy-frontend.ts` — Rule S**

Add `import { stackTags } from "../tags";`. Add a `transform.assets` callback tagging the bucket:
```ts
export const legacySite = new sst.aws.StaticSite("RehostLegacyFrontend", {
  path: "apps/legacy-frontend/dist/serfel-ang",
  errorPage: "index.html",
  transform: {
    assets: (args) => {
      args.tags = { ...(args.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
    },
  },
});
```
**Caveat:** its CloudFront distribution keeps only `defaultTags` (allowlisted).

- [ ] **Step 9: `infra/rehost/cdn.ts` — Rule C**

Add `import { stackTags } from "../tags";`. Inside the existing `transform.cdn` callback, after the `args.comment = ...` line, add:
```ts
      args.tags = { ...(args.tags as Record<string, string> | undefined), ...stackTags("serfel-rehost") };
```
This tags the rehost CloudFront distribution `serfel-rehost` — so it does **not** need the `:cloudfront::` allowlist. (The two StaticSite distributions still do.)

- [ ] **Step 10: Verify typecheck and review the diff**

Run: `pnpm typecheck` (expect PASS). `git diff --stat infra/rehost/` — confirm all nine files changed with tag additions only.

- [ ] **Step 11: Commit**

```bash
git add infra/rehost/
git commit -m "feat(infra): tag rehost resources serfel:stack=serfel-rehost"
```

---

### Task 6: Deploy, audit, activate cost allocation tags, document exceptions

**Files:**
- Modify: `scripts/tag-audit-allowlist.txt` (finalize with real ARNs discovered on deploy)
- Modify: `docs/superpowers/specs/2026-08-02-phase5-resource-tagging-design.md` (record confirmed exceptions)

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Deploy to dev**

Run: `pnpm sst:deploy` (or `npx sst deploy --stage dev`).
Expected: succeeds; the plan/diff shows `serfel:stack` tag additions across resources, no replacements. (RDS/SG description immutability is untouched — only tags change, which update in place.)

- [ ] **Step 2: Run the audit**

Run: `./scripts/tag-audit.sh`
Expected: either `OK: every non-allowlisted resource carries serfel:stack.`, or a short list of offenders that are all legitimately non-taggable / SST children.

- [ ] **Step 3: Finalize the allowlist**

For each remaining offender that is genuinely non-taggable or an unreachable SST child (e.g. a StaticSite CloudFront distribution, a Lambda@Edge function, an auto-created log group with no transform), append its stable ARN substring to `scripts/tag-audit-allowlist.txt` with a one-line `#` reason. Re-run `./scripts/tag-audit.sh` until it exits 0. If an offender is actually taggable and just missed, go back and tag it instead of allowlisting it.

- [ ] **Step 4: Activate cost allocation tags (manual, Billing console)**

In the AWS **Billing and Cost Management** console (account-level, `us-east-1`) → **Cost allocation tags** → **User-defined cost allocation tags**, activate `serfel:stack` **and** `Project` if not already active. (This cannot be done via IaC.) Note in the design doc that activation takes up to ~24h to appear in Cost Explorer, and that a per-`serfel:stack` grouping in Cost Explorer is how rehost-vs-new-app spend is compared.

- [ ] **Step 5: Verify tags in the console**

Open **Resource Groups → Tag Editor**, region `us-east-1`, filter by tag `serfel:stack`. Confirm three groups appear (`serfel-aws`, `serfel-rehost`, `serfel-shared`) and spot-check that the RDS instance is `serfel-shared`, the products Lambda is `serfel-aws`, and the ALB is `serfel-rehost`.

- [ ] **Step 6: Record confirmed exceptions in the design doc**

In `docs/superpowers/specs/2026-08-02-phase5-resource-tagging-design.md` §6, replace the general caveat wording with the concrete list of resources confirmed to carry only `defaultTags` (from Step 3's allowlist), so the gap is documented, not implied.

- [ ] **Step 7: Commit**

```bash
git add scripts/tag-audit-allowlist.txt docs/superpowers/specs/2026-08-02-phase5-resource-tagging-design.md
git commit -m "chore(infra): finalize tag-audit allowlist and document tag exceptions"
```

- [ ] **Step 8: Mark the Fase 5 task done in the plan**

In `plan-trabajo-app-ventas-aws.md`, check off the `Etiquetado por stack de aplicación (serfel:stack)` item under Fase 5. Commit:
```bash
git add plan-trabajo-app-ventas-aws.md
git commit -m "docs(fase5): mark serfel:stack tagging task complete"
```

---

## Self-Review

**Spec coverage** (against `2026-08-02-phase5-resource-tagging-design.md`):
- §3 tag schema (`serfel:stack`, three values) → Task 1 type + all tagging tasks. ✓
- §4 file classification → Global Constraints map + Tasks 3/4/5 split exactly on those files. ✓
- §5 mechanism (per-module helper; raw spread vs SST transform) → Rules R/N/F/A/S/C. ✓
- §6 caveat 1 (SST child resources) → Rule S caveat, api.ts log-group note, Task 2 allowlist, Task 6 Steps 3/6. ✓
- §6 caveat 2 (manual cost allocation activation) → Task 6 Step 4. ✓
- §7 verification (`tag-audit.sh` + Tag Editor) → Task 2, Task 6 Steps 2/5. ✓
- §8 scope exclusions (no Component tag, don't touch defaultTags/Name) → Global Constraints. ✓
- §10 checklist items → one-to-one with Tasks 1–6. ✓

**Placeholder scan:** no "TBD"/"add appropriate X"; every edit names the exact resource variable and the exact rule/snippet. ✓

**Type consistency:** `stackTags(stack: StackTag)` defined once (Task 1); every call passes one of the three literal values; `transform.assets`/`transform.cdn` callbacks cast `args.tags` to `Record<string, string> | undefined` consistently. ✓
