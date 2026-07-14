#!/usr/bin/env bash
set -euo pipefail
aws rds start-db-instance --db-instance-identifier serfel-dev-db --region us-east-1 >/dev/null
echo "Starting serfel-dev-db (takes ~5 min)…"
aws rds wait db-instance-available --db-instance-identifier serfel-dev-db --region us-east-1
echo "serfel-dev-db is available."
