#!/usr/bin/env bash
# Build & deploy the rehosted legacy PHP app (Fase 3.5) — one combined ARM64
# image serving Distribuidor + SerfelWeb (Serfel) and Coproad + CoproadWeb
# (Coproad, schema `coproad`) from a single Apache doc root on PHP 5.6.
#
# This automates the manual steps documented in legacy-php/README.md: build the
# arm64 image from Dockerfile.fargate, push it to the mutable ECR tag `:v1`,
# then force a new ECS deployment (the tag never changes, so ECS won't redeploy
# on its own) and wait for the service to stabilize.
#
# Run this whenever you change anything under legacy-php/ (Distribuidor/,
# SerfelWeb/, Coproad/, CoproadWeb/, health.php or Dockerfile.fargate).
#
# NOTE: this image is intentionally NOT built in CI — compiling PHP 5.6 from
# source takes ~10 min. That's why this is a manual, on-demand script.
#
# Requirements:
#   - Docker with buildx + QEMU (arm64 cross-build; the script installs binfmt).
#   - AWS CLI authenticated to the target account. Respects the caller's
#     AWS_PROFILE, e.g.:  AWS_PROFILE=admin-christian ./scripts/rehost-php-deploy.sh
#
# Usage:
#   ./scripts/rehost-php-deploy.sh [--stage dev] [--skip-build] [--smoke]
#
#   --stage <name>   SST stage / resource prefix (default: dev).
#   --skip-build     Skip build+push; only force a new ECS deployment of :v1.
#   --smoke          Run scripts/rehost-smoke.sh after the service is stable.
set -euo pipefail

STAGE="dev"
SKIP_BUILD=0
RUN_SMOKE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --stage) STAGE="${2:?--stage needs a value}"; shift 2 ;;
    --stage=*) STAGE="${1#*=}"; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --smoke) RUN_SMOKE=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

REGION="us-east-1"
REPO="serfel-${STAGE}-rehost-php-app-1"
CLUSTER="serfel-${STAGE}-rehost"
SERVICE="serfel-${STAGE}-rehost-php-app-1"
TAG="v1"

# legacy-php/ is the build context (Dockerfile.fargate lives there).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTEXT_DIR="$SCRIPT_DIR/../legacy-php"

command -v docker >/dev/null || { echo "docker not found on PATH" >&2; exit 1; }
command -v aws    >/dev/null || { echo "aws CLI not found on PATH" >&2; exit 1; }

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
: "${ACCOUNT:?could not resolve AWS account — is AWS_PROFILE set / are you logged in?}"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${REPO}:${TAG}"

echo "==> account=$ACCOUNT stage=$STAGE region=$REGION"
echo "==> image=$IMAGE"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "==> [1/4] enabling arm64 emulation (no-op if already installed)"
  docker run --privileged --rm tonistiigi/binfmt --install arm64 >/dev/null

  echo "==> [2/4] logging in to ECR"
  aws ecr get-login-password --region "$REGION" \
    | docker login --username AWS --password-stdin "$REGISTRY"

  echo "==> [3/4] building arm64 image and pushing to :$TAG (compiles PHP 5.6, ~10 min)"
  docker buildx build --platform linux/arm64 \
    -f "$CONTEXT_DIR/Dockerfile.fargate" \
    -t "$IMAGE" \
    --push "$CONTEXT_DIR"
else
  echo "==> [1-3/4] skipped build+push (--skip-build)"
fi

echo "==> [4/4] forcing new ECS deployment (:$TAG is mutable, so ECS won't redeploy on its own)"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
  --force-new-deployment --region "$REGION" >/dev/null

echo "==> waiting for service to stabilize (this can take a few minutes)…"
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION"
echo "==> service $SERVICE is stable."

if [ "$RUN_SMOKE" -eq 1 ]; then
  echo "==> running rehost smoke test"
  "$SCRIPT_DIR/rehost-smoke.sh"
fi

echo "==> done."
