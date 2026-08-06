#!/usr/bin/env bash
# On-demand smoke for the rehost CloudFront front door (Fase 3.5 foundation).
# Verifies all four origins route correctly through the single rehost CDN:
#   /                       -> S3 legacy Angular slot
#   /api/node/*             -> node HTTP API (Basic Auth authorizer)
#   /Distribuidor* /SerfelWeb* -> internal PHP (Fargate) via the locked-down ALB
#
# Respects the caller's AWS_PROFILE. Optionally override the Basic Auth creds:
#   BASIC_USER=serfel BASIC_PASS=... ./scripts/rehost-smoke.sh
# The dev DB may be stopped — the PHP/node health endpoints return 200 either way.
set -euo pipefail
REGION="us-east-1"
BASIC_USER="${BASIC_USER:-serfel}"
BASIC_PASS="${BASIC_PASS:-changeme-in-secrets-manager}"

CDN=$(aws cloudfront list-distributions --region "$REGION" \
  --query "DistributionList.Items[?Comment=='serfel-dev-rehost-router'].DomainName | [0]" --output text)
: "${CDN:?could not find the serfel-dev-rehost-router CloudFront distribution}"
BASE="https://$CDN"

PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "ok   $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 (expected $2, got $3)"; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 35 "$@"; }

# 1. legacy static site (default origin)
check "legacy site serves"          200 "$(code "$BASE/")"

# 2. node API — Basic Auth enforced
check "node health rejects anon"    401 "$(code "$BASE/api/node/health")"
check "node health accepts basic"   200 "$(code -u "$BASIC_USER:$BASIC_PASS" "$BASE/api/node/health")"

# 2b. sales Lambda (wrapped Express app; validates Basic Auth against 10_m_usuario)
check "sales rejects anon"          401 "$(code "$BASE/sales/")"
# a bogus rut-dv forces a users-table query; a working app+DB returns 401 (not 5xx)
check "sales reaches app+DB"        401 "$(code -u "0-0:x" "$BASE/sales/")"

# 2c. orders Lambda (wrapped Express app; same Basic-Auth-against-DB)
check "orders rejects anon"         401 "$(code "$BASE/orders/")"
check "orders reaches app+DB"       401 "$(code -u "0-0:x" "$BASE/orders/")"

# 3. The real PHP apps via the locked-down ALB (both served from one container).
#    Start the dev DB (pnpm db:start) so DB-backed pages work.
check "php Distribuidor serves"     200 "$(code "$BASE/Distribuidor/")"
check "php SerfelWeb serves"        200 "$(code "$BASE/SerfelWeb/")"
# DB connectivity: LoginValidar runs a real users-table query. A working DB
# returns the app's invalid-login view (200); a broken DB returns a CodeIgniter
# "Database Error". Assert the query ran without a DB connection error.
DBCODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 35 -X POST -d "username=probe&password=probe" "$BASE/SerfelWeb/LoginValidar")
DBPROBE=$(curl -s --max-time 35 -X POST -d "username=probe&password=probe" "$BASE/SerfelWeb/LoginValidar")
if [ "$DBCODE" = "200" ] && ! echo "$DBPROBE" | grep -qiE "Database Error|Unable to connect to your database"; then
  PASS=$((PASS+1)); echo "ok   php DB connectivity (LoginValidar query ran against RDS)"
else
  FAIL=$((FAIL+1)); echo "FAIL php DB connectivity (code=$DBCODE or SerfelWeb reported a DB error)"
fi

# --- Coproad tenant (schema `coproad`, /coproad/* prefix) ---
# Coproad SPA (its own StaticSite, base-href /coproad/)
check "coproad SPA serves"            200 "$(code "$BASE/coproad/")"

# Coproad node: same source, schema=coproad. Anon rejected; a bogus cred
# reaches the app+DB (coproad.10_m_usuario) and returns 401 (not 5xx).
check "coproad sales rejects anon"    401 "$(code "$BASE/coproad/sales/")"
check "coproad sales reaches app+DB"  401 "$(code -u "0-0:x" "$BASE/coproad/sales/")"
check "coproad orders rejects anon"   401 "$(code "$BASE/coproad/orders/")"
check "coproad orders reaches app+DB" 401 "$(code -u "0-0:x" "$BASE/coproad/orders/")"

# Coproad PHP via the same ALB/task, served from the Coproad/ + CoproadWeb/ dirs
check "coproad Coproad serves"        200 "$(code "$BASE/coproad/Coproad/")"
check "coproad CoproadWeb serves"     200 "$(code "$BASE/coproad/CoproadWeb/")"

echo "---- $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
