#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=stopped,running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 start-instances --region us-east-1 --instance-ids "$ID" >/dev/null
echo "Starting bastion $ID…"
aws ec2 wait instance-running --region us-east-1 --instance-ids "$ID"
echo "Bastion running. SSM registration takes ~1 more minute."
