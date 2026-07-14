#!/usr/bin/env bash
set -euo pipefail
echo "Invoking serfel-dev-migrate…"
aws lambda invoke --region us-east-1 --function-name serfel-dev-migrate \
  --cli-read-timeout 120 /dev/stdout
echo
