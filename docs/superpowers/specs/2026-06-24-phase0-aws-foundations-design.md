# Phase 0 — AWS Account Foundations & Governance

**Date:** 2026-06-24  
**Project:** Serfel — App web de ventas (POC)  
**Scope:** Personal AWS account setup before any infrastructure or code is deployed  
**Estimated setup time:** 2–3 hours  
**Monthly cost:** $0 (all steps in this phase are free)

---

## Context

This is a personal AWS account used for a POC of a sales web app migration (Angular + PHP 5.7 + Node/Express → serverless). The account will later serve as a reference when working as admin inside a client's AWS account. Governance is kept minimal but correct — no AWS Organizations, no multi-account setup — single account with proper IAM Identity Center (SSO) and cost controls.

**Region:** `us-east-1` (Virginia) — chosen for lowest cost and broadest service availability. CloudFront mitigates latency to Chile for end users.

**Budget ceiling:** $50/month.

---

## Design

### 1. Root Account Hardening

The email/password used to create the account is the root user. Root must never be used for daily work.

- Enable **virtual MFA on root** immediately after account creation (any TOTP authenticator app)
- Do NOT create access keys for root
- Root is only touched for account-level emergencies (e.g., changing root email, canceling account)

### 2. IAM Identity Center (SSO)

Replaces the legacy "create an IAM user" pattern. Provides browser-based SSO login and short-lived CLI credentials — no long-lived access keys stored on the machine.

**Console setup (done once as root):**
1. Enable IAM Identity Center in `us-east-1`
2. Create an Identity Center user for yourself (your email) — accept the invite to set a password
3. Create a permission set named `AdministratorAccess` using the AWS managed policy of the same name
4. Assign that permission set to your user on the account
5. Note the **SSO start URL** — AWS generates it automatically (e.g., `https://d-xxxxxxxx.awsapps.com/start`); visible in the IAM Identity Center dashboard

**CLI setup:**
```bash
aws configure sso
# SSO start URL: <your start URL>
# SSO Region: us-east-1
# Select the AdministratorAccess role
# Profile name: serfel-dev
```

**Daily usage:**
```bash
aws sso login --profile serfel-dev
# or set in shell: export AWS_PROFILE=serfel-dev
```

**Why SSO matters for the client account:** when added as admin to a client's IAM Identity Center, the workflow is identical — same CLI commands, different start URL and profile name.

### 3. Cost Controls

Two layers: predictable budget alerts and statistical anomaly detection.

**AWS Budgets — two budgets:**
| Budget | Amount | Alert threshold | Notification |
|--------|--------|-----------------|--------------|
| Warning | $40/month | 100% of actual spend | Email |
| Critical | $50/month | 100% of actual spend | Email |

**Cost Anomaly Detection:**
- Create a monitor scoped to the whole account
- Alert threshold: $5 anomaly (catches statistically unusual spikes)

**Additional:**
- Enable **Cost Explorer** (free; takes 24h to populate)
- Enable **AWS Free Tier usage alerts** in billing preferences

### 4. Tagging Policy

Three mandatory tags applied to every resource, enforced by convention (not by AWS policy, which requires Organizations):

| Tag key | Example values |
|---------|----------------|
| `Environment` | `dev`, `prod` |
| `Project` | `serfel-ventas` |
| `Owner` | `christian` |

SST and CDK both support default tags at the stack level — set them once in the IaC stack definition and every resource inherits them automatically.

Tags enable Cost Explorer filtering by environment and project, making it easy to see what each component costs.

---

## Success Criteria

- [ ] Root has MFA enabled and no access keys
- [ ] Root is not used after initial setup
- [ ] SSO portal accessible; `aws sso login --profile serfel-dev` returns valid credentials
- [ ] `aws sts get-caller-identity --profile serfel-dev` returns your account ID (not root)
- [ ] Budget alerts configured at $40 and $50
- [ ] Cost Anomaly Detection monitor active
- [ ] Cost Explorer enabled
- [ ] Free Tier alerts enabled

---

## Out of Scope

- AWS Organizations / multi-account setup (deferred to client account phase)
- SCPs, permission boundaries, or tag enforcement policies
- Any application infrastructure (VPC, Lambda, RDS, etc.) — those are Phase 1+
