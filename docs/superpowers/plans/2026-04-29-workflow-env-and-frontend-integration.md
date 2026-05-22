# Workflow Env And Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the GitHub deployment workflow so it builds the frontend into the API host, explicitly lists required backend deployment environment variables in deploy values, and adds an implementation-facing reference doc for configuring those keys.

**Architecture:** Keep the single API image approach and reuse the existing `frontend/imt-web` integration path: build the Vite app, run `copy-to-api`, then build and publish the ASP.NET Core host. Keep deployment config in `deploy/values-*.yaml`, but expand it to enumerate the required backend env keys while intentionally excluding `DocumentApi__*` for now.

**Tech Stack:** GitHub Actions, Node.js/npm, Vite, .NET 10, Docker multi-stage builds, Helm-style values templating, Markdown docs

---

### Task 1: Update workflow for frontend integration

**Files:**
- Modify: `.github/workflows/bld.yml`
- Test: `.github/workflows/bld.yml`

- [ ] **Step 1: Update the CI job to build frontend assets before .NET validation**

Add these steps to `.github/workflows/bld.yml` before the `.NET` setup/restore/build/test steps:

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/imt-web/package-lock.json

      - name: Install frontend dependencies
        run: npm --prefix frontend/imt-web ci

      - name: Build frontend
        env:
          VITE_CONSOLE_ADAPTER_MODE: integrated
        run: npm --prefix frontend/imt-web run build

      - name: Copy frontend assets into API host
        run: npm --prefix frontend/imt-web run copy-to-api
```

- [ ] **Step 2: Keep the workflow single-path by removing CN jobs if present**

Ensure `.github/workflows/bld.yml` only contains these jobs:

```yaml
  ci:
  build-and-push:
  deploy:
```

Expected change:
- no `build-and-push-cn`
- no `deploy-cn`

- [ ] **Step 3: Verify the workflow contains the frontend build integration**

Run: `rg -n "Setup Node.js|npm --prefix frontend/imt-web ci|VITE_CONSOLE_ADAPTER_MODE: integrated|copy-to-api|build-and-push-cn|deploy-cn" .github/workflows/bld.yml`
Expected: matches for the Node/frontend steps; no matches for `build-and-push-cn` or `deploy-cn`.

### Task 2: Expand deploy values with explicit backend env keys

**Files:**
- Modify: `deploy/values-test.yaml`
- Modify: `deploy/values-prod.yaml`
- Test: `deploy/values-test.yaml`
- Test: `deploy/values-prod.yaml`

- [ ] **Step 1: Add explicit env entries to the test values file**

Add an env section to `deploy/values-test.yaml` that explicitly lists:

```yaml
envsEnable: True
envs:
  - name: Mongo__ConnectionString
    value: ""
  - name: Mongo__DatabaseName
    value: ""
  - name: Redis__ConnectionString
    value: ""
  - name: Redis__Mode
    value: "standalone"
  - name: Redis__ServiceName
    value: ""
  - name: Redis__TlsServerName
    value: ""
  - name: Redis__Database
    value: "0"
  - name: License__BootLicensePath
    value: "licenses/boot.json"
  - name: License__PublicKeyPath
    value: "keys/public.pem"
  - name: Jwt__Issuer
    value: "imt-private-backend"
  - name: Jwt__Audience
    value: "imt-private-backend-clients"
  - name: Jwt__JwtSigningKey
    value: ""
  - name: Security__ApiKeyPepper
    value: ""
  - name: Recovery__BOOTSTRAP_ADMIN_TOKEN
    value: ""
  - name: Recovery__RECOVERY_ADMIN_TOKEN
    value: ""
```

- [ ] **Step 2: Add the same explicit env structure to the production values file**

Use the same key list in `deploy/values-prod.yaml`, keeping environment-specific defaults only where actually needed.

- [ ] **Step 3: Confirm the excluded keys stay excluded**

Run: `rg -n "DocumentApi__" deploy/values-test.yaml deploy/values-prod.yaml`
Expected: no matches.

- [ ] **Step 4: Render the test values to verify YAML stays valid**

Run: `PUBLIC_PROJECT_NAME=imt-on-premise CI_COMMIT_REF_NAME=develop CI_PIPELINE_ID=1 IMAGE=imt-on-premise:test DOCKER_REGISTRY=example.registry K8S_CLUSTER_DOMAIN=cluster.local envsubst < deploy/values-test.yaml`
Expected: rendered YAML includes all env key names and still renders `serviceTargetPort` consistently.

### Task 3: Add implementer reference documentation

**Files:**
- Create: `docs/reference/github-workflow-deployment-env-reference.md`
- Test: `docs/reference/github-workflow-deployment-env-reference.md`

- [ ] **Step 1: Write the deployment env reference document**

Document these sections in `docs/reference/github-workflow-deployment-env-reference.md`:

```md
# GitHub Workflow Deployment Env Reference

## Scope

This document tells implementers which backend keys must be configured for the GitHub workflow deployment path.

## Frontend build mode

- The workflow builds the frontend with `VITE_CONSOLE_ADAPTER_MODE=integrated`.
- In integrated mode, the console uses same-origin `/api` requests.
- No additional `VITE_CONSOLE_API_BASE_URL`, `VITE_CONSOLE_MOCK_SERVER_URL`, or `VITE_CONSOLE_APP_BASENAME` override is required for the current deployment path.

## Required backend env keys

- `Mongo__ConnectionString`: MongoDB connection string for the target environment.
- `Mongo__DatabaseName`: Mongo database name for the target environment.
- `Redis__ConnectionString`: Redis connection string for the target environment.
- `Redis__Mode`: Redis deployment mode. Default is `standalone` unless the environment requires another supported mode.
- `Redis__ServiceName`: Redis service name when the selected mode requires it.
- `Redis__TlsServerName`: TLS server name when Redis TLS is enabled.
- `Redis__Database`: Redis logical database index.
- `License__BootLicensePath`: Path inside the container or mounted filesystem to the boot license file.
- `License__PublicKeyPath`: Path inside the container or mounted filesystem to the license verification public key.
- `Jwt__Issuer`: JWT issuer string used by the API.
- `Jwt__Audience`: JWT audience string used by the API.
- `Jwt__JwtSigningKey`: JWT signing key. Configure through a secret-backed value.
- `Security__ApiKeyPepper`: Pepper used for hashing API keys. Configure through a secret-backed value.
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`: Bootstrap recovery token. Configure through a secret-backed value.
- `Recovery__RECOVERY_ADMIN_TOKEN`: Recovery admin token. Configure through a secret-backed value.

## Secret-backed keys

These values should come from Kubernetes secrets, not plaintext committed values:

- `Jwt__JwtSigningKey`
- `Security__ApiKeyPepper`
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`
- `Recovery__RECOVERY_ADMIN_TOKEN`
- Usually `Mongo__ConnectionString` and `Redis__ConnectionString` as well

## Explicitly excluded for now

- `DocumentApi__BaseUrl`
- `DocumentApi__DocumentApiKey`

These are intentionally excluded from the current deployment template scope.
```

- [ ] **Step 2: Verify the reference doc names every required key**

Run: `rg -n "Mongo__ConnectionString|Redis__ConnectionString|License__BootLicensePath|Jwt__JwtSigningKey|DocumentApi__BaseUrl" docs/reference/github-workflow-deployment-env-reference.md`
Expected: matches for the required documented keys and the excluded `DocumentApi__BaseUrl` note.

### Task 4: Run integrated verification

**Files:**
- Test: `.github/workflows/bld.yml`
- Test: `deploy/values-test.yaml`
- Test: `deploy/values-prod.yaml`
- Test: `docs/reference/github-workflow-deployment-env-reference.md`

- [ ] **Step 1: Run the frontend build and copy sequence locally**

Run: `npm --prefix frontend/imt-web ci && VITE_CONSOLE_ADAPTER_MODE=integrated npm --prefix frontend/imt-web run build && npm --prefix frontend/imt-web run copy-to-api`
Expected: frontend build succeeds and `src/Imt.PrivateBackend.Api/wwwroot/app` contains generated assets.

- [ ] **Step 2: Rebuild the API image after frontend assets are copied**

Run: `docker build -t imt-on-premise:test .`
Expected: build succeeds.

- [ ] **Step 3: Verify the container still serves live health**

Run: `docker rm -f imt-on-premise-smoke >/dev/null 2>&1 || true; docker run -d --rm --name imt-on-premise-smoke -p 5104:5104 imt-on-premise:test >/tmp/imt-on-premise-container-id && sleep 5 && curl -fsS http://127.0.0.1:5104/health/live && (docker rm -f imt-on-premise-smoke >/dev/null 2>&1 || true)`
Expected: `curl` returns the health JSON payload.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/bld.yml deploy/values-test.yaml deploy/values-prod.yaml docs/reference/github-workflow-deployment-env-reference.md docs/superpowers/specs/2026-04-28-github-workflow-and-deploy-design.md docs/superpowers/plans/2026-04-29-workflow-env-and-frontend-integration.md
git commit -m "feat: add workflow env and frontend integration"
```

Plan complete and saved to `docs/superpowers/plans/2026-04-29-workflow-env-and-frontend-integration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

User already requested direct implementation, so proceed with Inline Execution.
