# Phase 0 — AWS Account Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a clean, secure, cost-monitored personal AWS account ready for serverless development.

**Architecture:** Single AWS account (no Organizations). Root user locked to MFA-only. All daily access via IAM Identity Center (SSO) with short-lived credentials. Cost guardrails via Budgets + Anomaly Detection.

**Tech Stack:** AWS Console, AWS CLI v2, IAM Identity Center, AWS Budgets, Cost Explorer.

## Global Constraints

- Region: `us-east-1` for all resources
- Budget ceiling: $50/month
- No long-lived IAM access keys anywhere (root or otherwise)
- All console actions performed in `us-east-1` unless a service is global (IAM, Billing, IAM Identity Center are global)
- CLI profile name: `serfel-dev`

---

### Task 1: Create AWS Account (Paid Plan)

**Files:**
- No files created — AWS console action

- [ ] **Step 1: Go to aws.amazon.com and click "Create an AWS Account"**

  Fill in:
  - Root email: your email address
  - Account name: `serfel-poc` (or your preferred name)
  - Password: strong password, store in a password manager

- [ ] **Step 2: Select account plan**

  When prompted for a support plan, choose **Basic (Free)**. Do NOT choose Developer or Business unless needed — those cost money monthly.

  When prompted about the account type (Personal vs. Professional), choose **Professional** if this will eventually be a business account.

- [ ] **Step 3: Complete phone verification and payment method**

  AWS requires a credit card and phone verification. A small temporary charge (~$1) may appear and then be reversed.

- [ ] **Step 4: Verify account is active**

  Log in to the AWS Console at `console.aws.amazon.com` with your root email and password.

  Expected: you reach the AWS Management Console home page. Account status shows "Active" (may take a few minutes after signup).

---

### Task 2: Harden Root Account with MFA

**Files:**
- No files created — AWS console action

**Why:** Root has unrestricted access to everything in the account. MFA is the single most important security step.

- [ ] **Step 1: Install a TOTP authenticator app if you don't have one**

  Options: Google Authenticator, Authy, 1Password (built-in TOTP), or any RFC 6238-compatible app.

- [ ] **Step 2: Open IAM in the console**

  In the console search bar, type `IAM` and open the IAM dashboard.

  You will see a security warning: "Add MFA for root user." Click **Add MFA**.

- [ ] **Step 3: Enable virtual MFA device**

  - Select **Authenticator app**
  - Click **Next**
  - Open your authenticator app, scan the QR code shown
  - Enter the two consecutive 6-digit codes your app generates (first code, wait ~30s, enter second code)
  - Click **Add MFA**

- [ ] **Step 4: Verify MFA is active**

  Go to **IAM → Dashboard**. The security recommendation "Add MFA for root user" should now show as resolved (green check or removed from the list).

- [ ] **Step 5: Sign out and sign back in to confirm MFA is required**

  Sign out. Sign back in with root email + password. You should be prompted for the MFA code before reaching the console.

  Expected: MFA code is required at login. Root account is now protected.

- [ ] **Step 6: Confirm no access keys exist for root**

  Go to the top-right menu (your account name) → **Security credentials**. Scroll to **Access keys**.

  Expected: the section shows "You don't have any access keys" or is empty. If any exist, delete them.

---

### Task 3: Enable IAM Identity Center and Create Your User

**Files:**
- No files created — AWS console action

**Why:** IAM Identity Center replaces IAM users for human access. It issues short-lived credentials automatically — no static keys on your machine.

- [ ] **Step 1: Open IAM Identity Center**

  In the console search bar, type `IAM Identity Center` and open it. Confirm you are in `us-east-1`.

- [ ] **Step 2: Enable IAM Identity Center**

  Click **Enable**. Accept the prompt to create a service-linked role. This takes ~30 seconds.

  Expected: IAM Identity Center dashboard loads with "Setup" steps visible.

- [ ] **Step 3: Note your SSO start URL**

  On the IAM Identity Center dashboard, under **Settings summary**, find the **AWS access portal URL**. It looks like:
  ```
  https://d-xxxxxxxxxx.awsapps.com/start
  ```
  Copy this — you will need it in Task 5.

- [ ] **Step 4: Create a user for yourself**

  In the left sidebar → **Users** → **Add user**.

  Fill in:
  - Username: `christian` (or your preferred username)
  - Email: your email address
  - First name / Last name: your name

  Click **Next** → skip groups for now → **Add user**.

  Expected: AWS sends an invitation email to your address.

- [ ] **Step 5: Accept the invitation and set your password**

  Open the invitation email from AWS. Click the link, set a password for your Identity Center user.

  Expected: you can log in to the SSO portal at your start URL with this email and password.

---

### Task 4: Create Permission Set and Assign to Your User

**Files:**
- No files created — AWS console action

- [ ] **Step 1: Create the AdministratorAccess permission set**

  In IAM Identity Center → left sidebar → **Permission sets** → **Create permission set**.

  - Select **Predefined permission set**
  - Choose **AdministratorAccess**
  - Click **Next** → keep defaults (session duration 1 hour is fine, extend to 8 hours if you prefer longer sessions)
  - Click **Next** → **Create**

  Expected: `AdministratorAccess` appears in the permission sets list.

- [ ] **Step 2: Assign the permission set to your user on this account**

  In IAM Identity Center → left sidebar → **AWS accounts**.

  - Select your account (the checkbox next to the account name)
  - Click **Assign users or groups**
  - Select the **Users** tab → find your user → select it → **Next**
  - Select the `AdministratorAccess` permission set → **Next**
  - Review → **Submit**

  Expected: the assignment shows as "Succeeded" after ~30 seconds.

- [ ] **Step 3: Verify you can log in via SSO portal**

  Open your SSO start URL in a browser. Log in with your Identity Center user credentials.

  Expected: you see a portal page with your AWS account listed, and an `AdministratorAccess` role you can click to open the AWS Console. Verify the console opens and you are NOT logged in as root (check the top-right — it should show your username, not `root`).

---

### Task 5: Configure AWS CLI SSO Profile

**Files:**
- Modified: `~/.aws/config` (created/updated by the CLI automatically)

**Prerequisite:** AWS CLI v2 installed. Verify: `aws --version` should show `aws-cli/2.x.x`.  
If not installed: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

- [ ] **Step 1: Run the SSO configuration wizard**

  ```bash
  aws configure sso
  ```

  Answer the prompts:
  ```
  SSO session name (Recommended): serfel
  SSO start URL [None]: https://d-xxxxxxxxxx.awsapps.com/start   ← your actual URL
  SSO region [None]: us-east-1
  SSO registration scopes [sso:account:access]: (press Enter to accept default)
  ```

  A browser window will open asking you to authorize the CLI. Click **Allow**.

  Back in the terminal, you'll see your account listed. Select it. Then select the `AdministratorAccess` role.

  ```
  CLI default client Region [None]: us-east-1
  CLI default output format [None]: json
  CLI profile name [...]: serfel-dev
  ```

- [ ] **Step 2: Log in and verify credentials**

  ```bash
  aws sso login --profile serfel-dev
  aws sts get-caller-identity --profile serfel-dev
  ```

  Expected output (exact values will differ):
  ```json
  {
      "UserId": "AROAXXXXXXXXXXXXXXXXX:christian",
      "Account": "123456789012",
      "Arn": "arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_AdministratorAccess_xxxx/christian"
  }
  ```

  Key check: `Arn` must contain `assumed-role` (SSO) — NOT `root`. If it shows `root`, you are authenticated as root; go back to Task 4.

- [ ] **Step 3: Set the profile as default for this project (optional but recommended)**

  Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
  ```bash
  export AWS_PROFILE=serfel-dev
  ```

  Then reload:
  ```bash
  source ~/.zshrc   # or ~/.bashrc
  aws sts get-caller-identity   # should work without --profile flag
  ```

---

### Task 6: Set Up AWS Budgets

**Files:**
- No files created — AWS console action

**Note:** Budgets are a global/billing service. Make sure you are in any region — billing is not region-specific.

- [ ] **Step 1: Open AWS Budgets**

  In the console search bar, type `Budgets` → open **AWS Budgets**.

- [ ] **Step 2: Create the $40 warning budget**

  Click **Create budget** → **Use a template (simplified)** → **Monthly cost budget**.

  Fill in:
  - Budget name: `serfel-warning-40`
  - Budgeted amount: `40`
  - Email recipients: your email address

  Click **Create budget**.

  Expected: budget appears in the list with status "OK" (no spend yet).

- [ ] **Step 3: Create the $50 critical budget**

  Click **Create budget** again → **Use a template (simplified)** → **Monthly cost budget**.

  Fill in:
  - Budget name: `serfel-critical-50`
  - Budgeted amount: `50`
  - Email recipients: your email address

  Click **Create budget**.

  Expected: two budgets now listed — `serfel-warning-40` and `serfel-critical-50`.

---

### Task 7: Enable Cost Anomaly Detection and Cost Explorer

**Files:**
- No files created — AWS console action

- [ ] **Step 1: Open Cost Anomaly Detection**

  In the console search bar, type `Cost Anomaly Detection` → open it.

- [ ] **Step 2: Create an anomaly monitor**

  Click **Create monitor**.

  - Monitor type: **AWS services** (covers all services in the account)
  - Monitor name: `serfel-all-services`

  Click **Next**.

- [ ] **Step 3: Create an alert subscription**

  - Subscription name: `serfel-anomaly-alert`
  - Threshold: **Individual alert** → `$5.00` (alerts when a single anomaly exceeds $5)
  - Frequency: **Daily**
  - Email recipients: your email address

  Click **Create monitor**.

  Expected: monitor appears in the list with status "Collecting data" (takes 24h to activate).

- [ ] **Step 4: Enable Cost Explorer**

  In the console search bar, type `Cost Explorer` → open it.

  If prompted to enable Cost Explorer, click **Enable Cost Explorer**.

  Expected: Cost Explorer loads (may show "No data yet" — data populates within 24 hours).

- [ ] **Step 5: Enable Free Tier usage alerts**

  Go to **Billing Dashboard** (search for `Billing` in the console) → left sidebar → **Billing preferences**.

  Find **Alert preferences** → enable **AWS Free Tier alerts** → enter your email → **Save preferences**.

  Expected: "Free Tier alerts" shows as enabled.

---

### Task 8: Final Verification

Run through every success criterion from the spec.

- [ ] **Root MFA check**

  Go to IAM → Dashboard. Confirm the "Add MFA for root user" recommendation is resolved.

- [ ] **Root access keys check**

  Go to account menu (top-right) → **Security credentials** → **Access keys**. Confirm: no access keys exist for root.

- [ ] **SSO credentials check**

  ```bash
  aws sso login --profile serfel-dev
  aws sts get-caller-identity --profile serfel-dev
  ```

  Expected: output shows `assumed-role` ARN, NOT root. Save your account ID from this output — you'll need it in later phases.

- [ ] **Budgets check**

  Go to AWS Budgets. Confirm two budgets exist: `serfel-warning-40` ($40) and `serfel-critical-50` ($50), both showing status "OK".

- [ ] **Anomaly Detection check**

  Go to Cost Anomaly Detection. Confirm `serfel-all-services` monitor exists (status may be "Collecting data" — this is expected for 24h).

- [ ] **Cost Explorer check**

  Go to Cost Explorer. Confirm it loads (even if no data yet).

- [ ] **Free Tier alerts check**

  Go to Billing → Billing preferences → Alert preferences. Confirm **AWS Free Tier alerts** is enabled.

- [ ] **Record your account details**

  Note down the following for use in future phases:
  ```
  Account ID:      <from sts get-caller-identity output>
  SSO start URL:   https://d-xxxxxxxxxx.awsapps.com/start
  SSO profile:     serfel-dev
  Region:          us-east-1
  ```

- [ ] **Confirm tagging convention is understood**

  No console setup required (tag enforcement needs Organizations). The convention applies from Phase 1 onward — every resource you create (in the console or via IaC) must have these three tags:

  | Tag key | Values |
  |---------|--------|
  | `Environment` | `dev` or `prod` |
  | `Project` | `serfel-ventas` |
  | `Owner` | `christian` |

  In SST/CDK (Phase 1), set these at the stack level so every resource inherits them automatically. Example (SST v3):
  ```typescript
  // sst.config.ts
  app.addDefaultFunctionEnv({ ... });
  Tags.of(app).add("Project", "serfel-ventas");
  Tags.of(app).add("Owner", "christian");
  Tags.of(app).add("Environment", app.stage);
  ```

---

## Phase 0 Complete

All success criteria met. The account is:
- Root locked to MFA-only, no access keys
- Daily access via SSO with short-lived credentials (`serfel-dev` profile)
- Cost alerts at $40 and $50/month
- Anomaly detection active (fully live within 24h)

**Next:** Phase 1 — Infrastructure Base & IaC (VPC, SST/CDK setup, GitHub Actions).
