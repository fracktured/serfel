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

# 3. PHP via the locked-down ALB (proves CloudFront -> ALB -> Fargate container)
check "php /Distribuidor/health.php" 200 "$(code "$BASE/Distribuidor/health.php")"

# NOTE: /SerfelWeb health is not asserted here — the Fase 3.5 foundation image is
# a health skeleton that only ships /Distribuidor/health.php. The /SerfelWeb*
# behavior routes to the same ALB (verified: reaches the container), and the real
# SerfelWeb app (Plan 2) will add its own smoke check.

echo "---- $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
