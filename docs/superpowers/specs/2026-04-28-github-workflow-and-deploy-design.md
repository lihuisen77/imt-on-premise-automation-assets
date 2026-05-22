# GitHub Workflow 与部署设计

## 1. 目标

为 `imt-on-premise` 增加一套参照 `/home/gary/babel/lang-detect` 的 GitHub Actions workflow 与部署结构，使仓库具备从代码提交到镜像构建、镜像推送、再到集群部署的最小闭环。

本次设计的目标不是重做基础设施体系，而是在尽量复用参考项目发布节奏的前提下，把当前 `.NET` 服务接入同类流程。

完成后应满足以下结果：

- `develop` 分支提交后可自动执行 CI、构建镜像并部署到测试环境
- `main` 分支提交后可自动执行 CI、构建镜像并部署到生产环境
- workflow 只处理项目发布相关参数，不接管额外基础设施配置
- 部署过程继续沿用参考项目的自托管 runner 与 `helm template` + `kubectl apply` 模式
- 前端控制台构建产物会进入 API 镜像，由 API 统一提供 `wwwroot/app` 静态资源
- 部署模板显式列出后端运行所需关键 env，便于实施方按环境注入

## 2. 设计边界

本次设计明确采用以下边界：

- 分支到环境映射固定为 `develop -> test`、`main -> prod`
- 自托管 runner 使用方式与 `lang-detect` 保持一致，部署 job 继续跑在 `imt` runner 上
- workflow 只配置项目发布所需 env，不扩展管理 kubeconfig、集群安装、chart 仓库初始化策略等基础设施细节
- 运行时业务密钥、MongoDB/Redis 连接、许可证文件挂载、JWT 签名密钥等继续由集群现有 Secret / values / 挂载体系负责
- 不保留 CN 部署路径；当前发布链路只覆盖主 registry 与 `imt` runner

这意味着本次交付重点是“项目如何被发布”，不是“整套集群如何被治理”。

## 3. 现状与参考依据

### 3.1 当前项目现状

`imt-on-premise` 目前具有以下与发布相关的事实：

- 仓库是一个 `.NET` solution，入口项目为 `src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj`
- 仓库还包含一个 Vite 前端项目：`frontend/imt-web`
- 当前仓库已有 `.github/workflows/`、`Dockerfile` 与 `deploy/` 目录，但仍缺前端集成构建与完整 env 显式声明
- `Program.cs` 已定义健康检查端点：
  - `/health/live`
  - `/health/ready`
- 部署运行手册已把上述健康检查作为正式运维入口，因此 deployment 不应忽略这些现成探针
- 前端已有 `copy-to-api` 脚本，会把 `frontend/imt-web/dist` 拷贝到 `src/Imt.PrivateBackend.Api/wwwroot/app`
- API 已通过 `MapFrontendHosting()` 承载 `wwwroot/app` 下的控制台静态资源

### 3.2 参考项目模式

`lang-detect` 当前 workflow 提供了一个简单直接的模式：

- 监听 `develop` 与 `main`
- 构建并推送镜像
- 在自托管 runner 上拉取 chart
- 使用 `envsubst` 渲染 `deploy/values-*.yaml`
- 用 `helm template` 生成清单，再由 `kubectl apply` 部署

本设计保留这条主链路，但会根据 `imt-on-premise` 的技术栈、前端集成方式与运行方式调整构建和部署配置。

## 4. 文件结构设计

本次设计涉及以下文件：

- `.github/workflows/bld.yml`
- `Dockerfile`
- `deploy/values-test.yaml`
- `deploy/values-prod.yaml`
- `docs/reference/github-workflow-deployment-env-reference.md`

不额外引入新的部署脚本、包装工具或复杂模板层，保持最小实现。

## 5. Workflow 设计

### 5.1 触发条件

workflow 监听以下分支 push：

- `develop`
- `main`

不在本次设计中额外加入 `pull_request`、手动审批流、发布标签流或矩阵构建，先对齐参考项目的直连发布模式。

### 5.2 顶层环境变量

workflow 顶层保留与参考项目接近的发布变量组织方式：

- `IMAGE=imt-on-premise:${{ github.sha }}`
- `CI_COMMIT_REF_NAME=${{ github.ref_name }}`
- `CI_PIPELINE_ID=${{ github.run_number }}`
- `PUBLIC_PROJECT_NAME=imt-on-premise`

此外，部署模板渲染阶段还会依赖仓库或环境中已存在的：

- `DOCKER_REGISTRY`
- `K8S_CLUSTER_DOMAIN`

这里的原则是只放“当前项目发布会直接消费”的环境变量，不扩展基础设施初始化变量。

### 5.3 Job 结构

workflow 分为三个顺序 job：

#### Job 1: `ci`

职责：先验证代码可恢复、可编译、可测试，阻止明显错误直接进入镜像和部署阶段。

步骤：

- checkout 代码
- 安装 Node.js
- 执行 `npm --prefix frontend/imt-web ci`
- 以 `VITE_CONSOLE_ADAPTER_MODE=integrated` 执行 `npm --prefix frontend/imt-web run build`
- 执行 `npm --prefix frontend/imt-web run copy-to-api`
- 安装 `.NET 10 SDK`
- `dotnet restore Imt.PrivateBackend.sln`
- `dotnet build Imt.PrivateBackend.sln --configuration Release --no-restore`
- `dotnet test Imt.PrivateBackend.sln --configuration Release --no-build`

之所以在参考项目基础上新增显式 CI，是因为当前仓库已有多组测试项目，直接跳过测试会让自动部署风险明显偏高。

之所以把前端构建放在 CI 而不是 Dockerfile 内部，是因为当前仓库已经明确采用“前端先 build，再 copy 到 API 的 `wwwroot/app`”的集成方式。workflow 需要复用现有集成边界，而不是另造第二套前端注入路径。

#### Job 2: `build-and-push`

职责：基于根目录 `Dockerfile` 构建 API 运行镜像，并推送到既有镜像仓库。

步骤：

- checkout 代码
- 登录镜像仓库
- 使用 `docker/build-push-action` 构建并推送镜像
- 输出最终镜像地址，便于排查部署版本

镜像 tag 设计为：

- `${DOCKER_REGISTRY}/imt-on-premise:${{ github.sha }}`

该 job 依赖 `ci` 成功后再执行。

#### Job 3: `deploy`

职责：沿用参考项目方式，在自托管 runner 上拉 chart、渲染 values、生成 manifest 并应用到集群。

关键约束：

- `runs-on: imt`
- `develop` 时使用 `deploy/values-test.yaml`
- `main` 时使用 `deploy/values-prod.yaml`
- 继续采用 `helm repo update`、`helm fetch --untar`、`envsubst`、`helm template`、`kubectl apply`

该 job 依赖 `build-and-push` 成功后再执行。

## 6. Dockerfile 设计

### 6.1 构建方式

Dockerfile 采用多阶段构建：

- 构建阶段使用 `.NET SDK 10`
- 运行阶段使用 `aspnet:10.0`

发布目标固定为：

- `src/Imt.PrivateBackend.Api/Imt.PrivateBackend.Api.csproj`

构建步骤为：

- 复制 solution 与项目文件
- `dotnet restore`
- 复制完整源码
- `dotnet publish -c Release -o /app/publish`
- 在运行镜像中以 `dotnet Imt.PrivateBackend.Api.dll` 启动

这里要求 `docker build` 前，仓库工作目录中的 `src/Imt.PrivateBackend.Api/wwwroot/app` 已经由前端构建步骤准备好。Dockerfile 本身不再单独安装 Node 或重新构建前端，以避免在 workflow 和镜像构建中出现双重前端构建来源。

### 6.2 监听端口

容器内统一设置：

- `ASPNETCORE_URLS=http://+:5104`
- `EXPOSE 5104`

这样做的原因是：

- `frontend/imt-web/.env.example` 当前以 `http://localhost:5104` 作为前端默认 API 地址
- `frontend/imt-web/vite.config.ts` 当前以 `http://localhost:5104` 作为前端 dev 代理目标默认值
- `src/Imt.PrivateBackend.Api/Properties/launchSettings.json` 当前也以 `http://localhost:5104` 作为本地 API 启动地址
- 与其在部署时再做额外端口映射约定，不如先让容器监听与项目当前 API 入口习惯保持一致

## 7. 健康检查与 Service 设计

### 7.1 健康检查来源

当前 API 项目在 `Program.cs` 中已明确暴露：

- `app.MapHealthChecks("/health/live", ...)`
- `app.MapHealthChecks("/health/ready", ...)`

因此 deployment 应直接复用这两个端点，而不是关闭探针或另造探针路径。

### 7.2 探针策略

本设计默认：

- `livenessProbeEnable: True`
- `readinessProbeEnable: True`

探针路径使用：

- liveness: `/health/live`
- readiness: `/health/ready`

如果当前 chart 已经支持 probe path 配置，则在 values 中显式传入这两个路径；如果 chart 只支持开关、不支持路径覆盖，则要求其默认行为与该服务端点兼容，否则后续实现阶段需要补一个最小 chart 对齐方案。

### 7.3 Service target port

Service target port 固定为：

- `5104`

这是根据当前容器监听端口直接推导出的项目实际端口，而不是机械复用参考项目的 3000 或 8000。

## 8. Deploy Values 设计

### 8.1 通用字段

`deploy/values-test.yaml` 与 `deploy/values-prod.yaml` 都保留与参考项目一致的核心变量占位：

- `project: ${PUBLIC_PROJECT_NAME}`
- `branch: ${CI_COMMIT_REF_NAME}`
- `version: ${CI_PIPELINE_ID}`
- `image: ${DOCKER_REGISTRY}/${IMAGE}`
- `k8s_cluster_domain: ${K8S_CLUSTER_DOMAIN}`
- `release: ${PUBLIC_PROJECT_NAME}`

同时包含以下部署字段：

- `serviceEnable: True`
- `serviceTargetPort: 5104`
- `livenessProbeEnable: True`
- `readinessProbeEnable: True`

同时在 values 中显式列出后端运行必需 env，便于实施方直接定位需要配置的 key。当前范围先排除 `DocumentApi__BaseUrl` 与 `DocumentApi__DocumentApiKey`，因为用户已明确说明该组件暂不纳入当前部署配置要求。

如果 chart 支持探针路径字段，还应追加：

- `livenessProbePath: /health/live`
- `readinessProbePath: /health/ready`

### 8.2 测试环境 values

测试环境保持最小副本和便于联调的暴露方式，建议：

- `replicas: 1`
- `maxSurge: 1`
- `maxUnavailable: 0`
- `ingressEnable: True`
- 资源请求维持较保守默认值
- 显式 env 区域列出后端必需 key，由测试环境值班/实施配置实际值

### 8.3 生产环境 values

生产环境强调滚动发布稳定性，建议：

- `replicas: 2` 或 `3`
- `maxSurge: 1`
- `maxUnavailable: 0`
- `ingressEnable` 按当前 chart 习惯开启
- 资源限制略高于测试环境或至少与测试环境分离
- 显式 env 区域列出与测试环境同结构的后端必需 key，由生产环境配置实际值

测试与生产 values 保持相同结构，仅在副本数、资源规模、ingress 策略等环境差异项上分开。

### 8.4 后端必需 env 范围

当前 values 文件中应显式列出以下 key：

- `Mongo__ConnectionString`
- `Mongo__DatabaseName`
- `Redis__ConnectionString`
- `Redis__Mode`
- `Redis__ServiceName`
- `Redis__TlsServerName`
- `Redis__Database`
- `License__BootLicensePath`
- `License__PublicKeyPath`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__JwtSigningKey`
- `Security__ApiKeyPepper`
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`
- `Recovery__RECOVERY_ADMIN_TOKEN`

这些 key 的具体值按环境不同而不同，但名字和注入边界应在 values 中显式体现，避免实施方只能从 `appsettings.json` 或代码里反推。

## 9. Secrets 与配置边界

本次 workflow 只依赖项目发布直接需要的少量外部变量，不把业务敏感配置硬编码进仓库。

应通过 GitHub Secrets 或环境中已有配置提供：

- `DOCKER_REGISTRY`
- 镜像仓库登录凭据
- `K8S_CLUSTER_DOMAIN`

以下内容不在本次 workflow 设计中处理，继续由集群部署体系负责：

- `DocumentApi__BaseUrl`
- `DocumentApi__DocumentApiKey`

以下内容虽然仍由集群部署体系负责注入，但会被 values 模板显式列出来，方便实施方配置：

- MongoDB 连接信息
- Redis 连接信息
- License 文件路径与公钥路径
- JWT/安全/API 恢复令牌相关 key

这样可以把本次改动限定在“交付版本发布链路”，避免 workflow 变成新的配置真相源。

## 10. 与参考项目的差异

虽然本设计参照 `lang-detect`，但以下差异是刻意保留的：

- 增加显式前端构建与 `.NET` CI，避免未验证产物直接发布
- 镜像构建方式改为 `.NET publish` 多阶段构建，而不是 Node 构建
- 前端通过现有 `copy-to-api` 路径进入 API 镜像，而不是独立前端镜像
- Service target port 与 probe 路径按 `imt-on-premise` 实际服务端口和健康检查端点确定
- 不沿用参考项目中把敏感登录信息直接写入 workflow 的做法
- 不保留 CN 部署路径

这些差异不是偏离目标，而是把“相同发布骨架”适配到“不同运行时项目”。

## 11. 实施参考文档

除 workflow 和 values 外，本次还应新增一份面向实施方的参考文档：

- `docs/reference/github-workflow-deployment-env-reference.md`

文档职责：

- 罗列 values 中显式出现的后端必需 key
- 说明每个 key 的用途
- 说明哪些 key 应来自 Secret，哪些可以是普通配置
- 给出测试/生产环境配置时的最小注意事项
- 明确当前阶段 `DocumentApi__*` 不在必配范围内

## 12. 验证策略

实现完成后至少应验证以下事项：

- workflow YAML 语法正确
- `npm --prefix frontend/imt-web ci` 可执行
- `VITE_CONSOLE_ADAPTER_MODE=integrated npm --prefix frontend/imt-web run build` 可成功产出前端 bundle
- `npm --prefix frontend/imt-web run copy-to-api` 可把构建产物复制到 `src/Imt.PrivateBackend.Api/wwwroot/app`
- `dotnet restore/build/test` 可在 GitHub Actions 环境执行
- Docker 镜像可本地或 CI 内成功构建
- 容器启动后 `/health/live` 与 `/health/ready` 可访问
- `envsubst` 后生成的 `values.yaml` 与 `helm template` 输出无语法错误
- `develop` 与 `main` 的分支条件能正确选择 test/prod values

## 13. 不做事项

本次设计明确不包含以下内容：

- 重构现有 chart
- 设计新的多区域镜像推送策略
- 增加审批流、回滚流、手动 promote 流
- 管理 kubeconfig、runner 安装、集群 bootstrap 脚本
- 把运行时业务密钥迁移到 GitHub Actions
- 把 `DocumentApi__*` 纳入当前部署模板必配范围

这些工作如果后续有需要，应作为独立部署治理任务处理，而不是混进这次“参照现有项目补齐 workflow 与 deploy”的实现中。
