#!/usr/bin/env bash
# On-demand integration test: full products CRUD round-trip against the dev API.
# Requires: dev DB running (pnpm db:start), a seeded Cognito user, and:
#   SMOKE_EMAIL=... SMOKE_PASSWORD=... ./scripts/api-smoke.sh
# Respects the caller's AWS_PROFILE. Cleans up after itself (soft delete).
set -euo pipefail

: "${SMOKE_EMAIL:?export SMOKE_EMAIL}"
: "${SMOKE_PASSWORD:?export SMOKE_PASSWORD}"
REGION="us-east-1"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --region "$REGION" \
  --query "UserPoolClients[?ClientName=='serfel-dev-web'].ClientId | [0]" --output text)
API_URL=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='serfel-dev-api'].ApiEndpoint | [0]" --output text)

TOKEN=$(aws cognito-idp admin-initiate-auth --region "$REGION" \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=$SMOKE_EMAIL,PASSWORD=$SMOKE_PASSWORD" \
  --query 'AuthenticationResult.IdToken' --output text)

AUTH=(-H "Authorization: Bearer $TOKEN" -H "content-type: application/json")
COD=$((900000 + RANDOM))
NAME="SMOKE TEST $COD"
PASS=0; FAIL=0

check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "ok   $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 (expected $2, got $3)"; fi
}

json_field() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

# 1. anonymous is rejected
check "401 without token" 401 "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/products")"

# 2. list + lookups
check "GET products" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/products")"
check "GET lookups" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/lookups")"
MARCA=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['marcas'][0]['id']")
UM=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['unidadesMedida'][0]['id']")
TIPO=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['tiposProducto'][0]['id']")
# impuesto 0 = "Sin Imp. Adicional" (seeded by migration 0002); usaPorciones 0 = not portioned
BODY="{\"codSerfel\":$COD,\"nomProducto\":\"$NAME\",\"idMarca\":$MARCA,\"idUm\":$UM,\"idTipoProducto\":$TIPO,\"impuesto\":0,\"usaPorciones\":0}"

# /me is reachable by any authenticated user; the smoke user is tipo 1 (admin)
check "GET me" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/me")"
ME_MODS=$(curl -s "${AUTH[@]}" "$API_URL/api/me" | json_field "['modulos']")
check "me lists productos" "['productos']" "$ME_MODS"

# 3. create
CREATED=$(curl -s "${AUTH[@]}" -X POST -d "$BODY" "$API_URL/api/products")
ID=$(echo "$CREATED" | json_field "['idProducto']")
check "POST creates with DB-assigned id" "yes" "$([ "$ID" -gt 0 ] && echo yes)"

# 4. duplicate rejected with machine-readable code
DUP_CODE=$(curl -s "${AUTH[@]}" -X POST -d "$BODY" "$API_URL/api/products" | json_field "['error']['code']")
check "duplicate cod_serfel rejected" "COD_SERFEL_EN_USO" "$DUP_CODE"

# 5. update
# Build the body in a variable first: inlining the JSON literal inside a nested
# "$(curl ... -d "{...}" ...)" breaks the quoting and bash brace-expands the {..}
# on its commas, mangling the request. A plain variable expands intact.
PUT_BODY="{\"codSerfel\":$COD,\"nomProducto\":\"$NAME v2\",\"idMarca\":$MARCA,\"idUm\":$UM,\"idTipoProducto\":$TIPO,\"impuesto\":0,\"usaPorciones\":1}"
PUT_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -X PUT -d "$PUT_BODY" "$API_URL/api/products/$ID")
check "PUT updates" 200 "$PUT_CODE"

# 6. soft delete + restore + final delete (cleanup)
DEL_ESTADO=$(curl -s "${AUTH[@]}" -X DELETE "$API_URL/api/products/$ID" | json_field "['idEstado']")
check "DELETE soft-deletes (idEstado 0)" 0 "$DEL_ESTADO"
REST_ESTADO=$(curl -s "${AUTH[@]}" -X POST "$API_URL/api/products/$ID/restore" | json_field "['idEstado']")
check "restore reactivates (idEstado 1)" 1 "$REST_ESTADO"
curl -s -o /dev/null "${AUTH[@]}" -X DELETE "$API_URL/api/products/$ID"   # leave it inactive

echo "---- $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
