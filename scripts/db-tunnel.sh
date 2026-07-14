#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
if [ "$ID" = "None" ]; then echo "Bastion not running — run 'pnpm bastion:start' first." >&2; exit 1; fi
HOST=$(aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 \
  --query 'DBInstances[0].Endpoint.Address' --output text)
echo "Tunnel: localhost:3306 → $HOST:3306 (Ctrl-C to close)"
aws ssm start-session --region us-east-1 --target "$ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$HOST\"],\"portNumber\":[\"3306\"],\"localPortNumber\":[\"3306\"]}"
