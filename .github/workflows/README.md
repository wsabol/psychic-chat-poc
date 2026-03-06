# GitHub Actions — Auto-Deployment Setup

Three workflows auto-deploy on every push to `main`, but **only when relevant files change** (so a client-only change won't trigger an API rebuild, etc.).

| Workflow | Trigger Path(s) | What it deploys |
|---|---|---|
| `deploy-api.yml` | `api/**`, `api-task-def.json` | Docker image → ECR → ECS Fargate |
| `deploy-client.yml` | `client/**` | React build → S3 → CloudFront invalidation |
| `deploy-lambdas.yml` | `lambdas/**`, `infrastructure/template.yaml` | SAM build → Lambda functions |

---

## ⚠️ Required: Add GitHub Secrets

Before the workflows will work, you must add **two AWS credentials** as repository secrets.

### Step 1 — Create an IAM User for GitHub Actions

In the AWS Console → IAM, create a user (e.g. `github-actions-deployer`) with **programmatic access** and attach a policy that allows:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["ecr:*"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["ecs:*"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["iam:PassRole"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["s3:*"], "Resource": ["arn:aws:s3:::app.starshippsychics.com", "arn:aws:s3:::app.starshippsychics.com/*"] },
    { "Effect": "Allow", "Action": ["cloudfront:CreateInvalidation"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["cloudformation:*", "lambda:*", "events:*", "s3:*"], "Resource": "*" }
  ]
}
```

> **Tip:** You can also use the existing IAM user/role you already use locally — just generate a new Access Key for it.

### Step 2 — Add Secrets to GitHub

Go to your repo on GitHub:  
**Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets:

| Secret Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret access key |

That's it! The next push to `main` will trigger the appropriate workflow(s) automatically.

---

## How it works

### `deploy-api.yml`
1. Builds the Docker image from `./api`
2. Tags it with both the commit SHA and `latest`, pushes both to ECR
3. Fetches the live task definition from ECS, swaps in the new image
4. Registers the new task definition revision and deploys to ECS
5. Waits up to 10 minutes for the service to stabilize

### `deploy-client.yml`
1. Runs `npm ci` + `npm run build` inside `./client`
2. Syncs each file type to S3 with the correct `Content-Type` and cache headers  
   (HTML/JSON = no-cache · service-worker.js = no-cache · CSS/JS/images = immutable 1yr)
3. Creates a CloudFront `/*` invalidation to flush the CDN

### `deploy-lambdas.yml`
1. Runs `sam build` against `infrastructure/template.yaml`
2. Runs `sam deploy` using `infrastructure/samconfig-production.toml`
3. Prints a summary of deployed Lambda functions
