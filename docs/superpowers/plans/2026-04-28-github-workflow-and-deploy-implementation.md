# GitHub Workflow And Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI/build/deploy workflow plus minimal Docker and deploy values files for `imt-on-premise`, following the `lang-detect` release flow while matching this project's actual ASP.NET Core runtime behavior.

**Architecture:** Add one workflow file that runs CI on GitHub-hosted runners, builds and pushes a single API image, then deploys through the existing self-hosted `imt` runner using `helm template` and `kubectl apply`. Add one root `Dockerfile` that publishes `Imt.PrivateBackend.Api` as a container listening on port `8080`, and add `deploy/values-test.yaml` / `deploy/values-prod.yaml` that expose the actual `/health/live` and `/health/ready` probes when the chart supports them.

**Tech Stack:** GitHub Actions, Docker multi-stage builds, .NET 10 SDK / ASP.NET Core runtime, Helm values templating, Kubernetes deploy manifests

---

### Task 1: Add deployment workflow

**Files:**
- Create: `.github/workflows/bld.yml`
- Test: `.github/workflows/bld.yml`

- [ ] **Step 1: Write the workflow file with CI, build, and deploy jobs**

```yaml
name: Deploy

env:
  IMAGE: imt-on-premise:${{ github.sha }}
  CI_COMMIT_REF_NAME: ${{ github.ref_name }}
  CI_PIPELINE_ID: ${{ github.run_number }}
  PUBLIC_PROJECT_NAME: imt-on-premise

on:
  push:
    branches: ["develop", "main"]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x
      - name: Restore solution
        run: dotnet restore Imt.PrivateBackend.sln
      - name: Build solution
        run: dotnet build Imt.PrivateBackend.sln --configuration Release --no-restore
      - name: Test solution
        run: dotnet test Imt.PrivateBackend.sln --configuration Release --no-build

  build-and-push:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.DOCKER_REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/${{ env.IMAGE }}
      - name: Print image url
        run: echo "${{ secrets.DOCKER_REGISTRY }}/${{ env.IMAGE }}"

  deploy:
    needs: build-and-push
    runs-on: imt
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Update chart
        run: rm -rf imt-chart && helm repo update && helm fetch tuiwen-charts/imt-chart --untar
      - name: Deploy to Prod
        if: ${{ github.ref == 'refs/heads/main' }}
        env:
          DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
          K8S_CLUSTER_DOMAIN: ${{ secrets.K8S_CLUSTER_DOMAIN }}
        run: envsubst < ./deploy/values-prod.yaml > values.yaml && helm template -f values.yaml imt-chart --namespace imt > settings.yaml && kubectl apply -f settings.yaml --namespace imt
      - name: Deploy to Test
        if: ${{ github.ref == 'refs/heads/develop' }}
        env:
          DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
          K8S_CLUSTER_DOMAIN: ${{ secrets.K8S_CLUSTER_DOMAIN }}
        run: envsubst < ./deploy/values-test.yaml > values.yaml && helm template -f values.yaml imt-chart --namespace imt-test > settings.yaml && kubectl apply -f settings.yaml --namespace imt-test
```

- [ ] **Step 2: Verify the workflow file exists and has the expected jobs**

Run: `rg -n "^(name: Deploy|  ci:|  build-and-push:|  deploy:)" .github/workflows/bld.yml`
Expected: matches for the workflow name and all three jobs.

### Task 2: Add runtime image build

**Files:**
- Create: `Dockerfile`
- Test: `Dockerfile`

- [ ] **Step 1: Write the multi-stage Dockerfile for the API project**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY global.json ./
COPY Imt.PrivateBackend.sln ./
COPY src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj src/Imt.PrivateBackend.Api/
COPY src/Imt.PrivateBackend.Identity/Imt.PrivateBackend.Identity.csproj src/Imt.PrivateBackend.Identity/
COPY src/Imt.PrivateBackend.Licensing/Imt.PrivateBackend.Licensing.csproj src/Imt.PrivateBackend.Licensing/
COPY src/Imt.PrivateBackend.Quota/Imt.PrivateBackend.Quota.csproj src/Imt.PrivateBackend.Quota/
COPY src/Imt.PrivateBackend.Audit/Imt.PrivateBackend.Audit.csproj src/Imt.PrivateBackend.Audit/
COPY src/Imt.PrivateBackend.Infrastructure/Imt.PrivateBackend.Infrastructure.csproj src/Imt.PrivateBackend.Infrastructure/

RUN dotnet restore src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj

COPY . .
RUN dotnet publish src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Imt.PrivateBackend.Api.dll"]
```

- [ ] **Step 2: Build the image locally to validate the Dockerfile**

Run: `docker build -t imt-on-premise:test .`
Expected: build completes successfully and produces image `imt-on-premise:test`.

### Task 3: Add deploy values templates

**Files:**
- Create: `deploy/values-test.yaml`
- Create: `deploy/values-prod.yaml`
- Test: `deploy/values-test.yaml`
- Test: `deploy/values-prod.yaml`

- [ ] **Step 1: Write the test environment values file**

```yaml
project: ${PUBLIC_PROJECT_NAME}
branch: ${CI_COMMIT_REF_NAME}
version: ${CI_PIPELINE_ID}
image: ${DOCKER_REGISTRY}/${IMAGE}
k8s_cluster_domain: ${K8S_CLUSTER_DOMAIN}

release: ${PUBLIC_PROJECT_NAME}
publicEnable: False
replicas: 1
maxSurge: 1
maxUnavailable: 0

podLabels:
  version: test
  app: ${PUBLIC_PROJECT_NAME}

configMapEnabled: False
envsEnable: False

readinessProbeEnable: True
livenessProbeEnable: True
readinessProbePath: /health/ready
livenessProbePath: /health/live

serviceEnable: True
serviceTargetPort: 8080

ingressEnable: True
ingressAnnotation:
  nginx.ingress.kubernetes.io/proxy-body-size: 10m
  nginx.ingress.kubernetes.io/proxy-buffering: "off"

resources:
  limits:
    cpu: 1
    memory: 1Gi
  requests:
    cpu: 100m
    memory: 512Mi
```

- [ ] **Step 2: Write the production environment values file**

```yaml
project: ${PUBLIC_PROJECT_NAME}
branch: ${CI_COMMIT_REF_NAME}
version: ${CI_PIPELINE_ID}
image: ${DOCKER_REGISTRY}/${IMAGE}
k8s_cluster_domain: ${K8S_CLUSTER_DOMAIN}

release: ${PUBLIC_PROJECT_NAME}
publicEnable: False
replicas: 2
maxSurge: 1
maxUnavailable: 0

podLabels:
  version: prod
  app: ${PUBLIC_PROJECT_NAME}

configMapEnabled: False
envsEnable: False

readinessProbeEnable: True
livenessProbeEnable: True
readinessProbePath: /health/ready
livenessProbePath: /health/live

serviceEnable: True
serviceTargetPort: 8080

resources:
  limits:
    cpu: 2
    memory: 2Gi
  requests:
    cpu: 250m
    memory: 1Gi
```

- [ ] **Step 3: Render the values files with sample environment variables**

Run: `PUBLIC_PROJECT_NAME=imt-on-premise CI_COMMIT_REF_NAME=develop CI_PIPELINE_ID=1 IMAGE=imt-on-premise:test DOCKER_REGISTRY=example.registry K8S_CLUSTER_DOMAIN=cluster.local envsubst < deploy/values-test.yaml`
Expected: rendered YAML contains `image: example.registry/imt-on-premise:test` and `serviceTargetPort: 8080`.

### Task 4: Verify the end-to-end config shape

**Files:**
- Test: `.github/workflows/bld.yml`
- Test: `Dockerfile`
- Test: `deploy/values-test.yaml`
- Test: `deploy/values-prod.yaml`

- [ ] **Step 1: Check the workflow and deploy files for key project-specific settings**

Run: `rg -n "imt-on-premise|/health/live|/health/ready|serviceTargetPort: 8080|runs-on: imt" .github/workflows/bld.yml Dockerfile deploy/values-test.yaml deploy/values-prod.yaml`
Expected: matches show the project name, health endpoints, service target port, and self-hosted runner label.

- [ ] **Step 2: Run a final local build of the API project to make sure release publishing assumptions still hold**

Run: `dotnet publish src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj -c Release -o /tmp/imt-on-premise-publish`
Expected: publish succeeds and writes the API output to `/tmp/imt-on-premise-publish`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/bld.yml Dockerfile deploy/values-test.yaml deploy/values-prod.yaml docs/superpowers/specs/2026-04-28-github-workflow-and-deploy-design.md docs/superpowers/plans/2026-04-28-github-workflow-and-deploy-implementation.md
git commit -m "feat: add github workflow and deploy templates"
```

Plan complete and saved to `docs/superpowers/plans/2026-04-28-github-workflow-and-deploy-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

User already requested direct implementation, so proceed with Inline Execution.
