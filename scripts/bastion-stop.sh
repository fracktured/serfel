#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 stop-instances --region us-east-1 --instance-ids "$ID" >/dev/null
echo "Stopping bastion $ID."
