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
