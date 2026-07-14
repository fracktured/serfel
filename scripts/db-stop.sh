#!/usr/bin/env bash
set -euo pipefail
aws rds stop-db-instance --db-instance-identifier serfel-dev-db --region us-east-1 >/dev/null
echo "Stopping serfel-dev-db."
