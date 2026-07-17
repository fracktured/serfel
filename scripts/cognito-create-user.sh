#!/usr/bin/env bash
# Creates a Cognito user mapped to a legacy 10_m_usuario row.
# Usage: ./scripts/cognito-create-user.sh <email> <id_usuario>
# Respects the caller's AWS_PROFILE (same convention as the other scripts).
set -euo pipefail

EMAIL="${1:?usage: cognito-create-user.sh <email> <id_usuario>}"
ID_USUARIO="${2:?usage: cognito-create-user.sh <email> <id_usuario>}"
REGION="us-east-1"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)

if [ "$POOL_ID" = "None" ] || [ -z "$POOL_ID" ]; then
  echo "user pool serfel-dev-users not found" >&2
  exit 1
fi

aws cognito-idp admin-create-user \
  --region "$REGION" \
  --user-pool-id "$POOL_ID" \
  --username "$EMAIL" \
  --user-attributes \
    Name=email,Value="$EMAIL" \
    Name=email_verified,Value=true \
    Name=custom:id_usuario,Value="$ID_USUARIO"

echo "User $EMAIL created (temporary password emailed). id_usuario=$ID_USUARIO"
