# 集群内首次部署与初始化运行手册

## 使用约定

- 本文是集群内部署、首次激活与初始化的主实施运行手册。
- 本文自包含，执行时不要求阅读任何其他 Markdown 文档。
- 本文提供可直接执行的运维操作流程；接口的精确请求/响应字段、枚举值与鉴权声明以 Swagger/OpenAPI 为最终确认依据。
- 本文面向值班运维、平台实施与安全管理员，默认读者具备集群访问、密钥注入与 API 调用能力。

## 目标状态

当本运行手册全部执行完成后，应同时满足以下条件，才可判定“部署完成”：

- 平台实例已在集群内稳定启动，基础健康检查通过。
- 许可证状态已从 `boot_mode` 转为 `licensed`，且运行时健康正常。
- 首个平台管理员已创建，可使用正常登录流程进入系统。
- 租户、组织、成员关系与基础治理配置已完成初始化。
- 集成主体与 API Key 已建立，后续系统对接具备可操作入口。
- 恢复口令仅保留为受控应急手段，不再承担日常管理入口职责。

## Deployment target and prerequisites

### 部署目标与前置条件

#### 目的

明确首次集群部署的目标环境、依赖组件、必要密钥与操作边界，确保进入启动阶段前没有缺项。

#### 执行角色

平台实施负责人主执行，安全管理员负责密钥与令牌注入，集群运维负责 Redis/MongoDB/网络连通性。

#### 前置条件

- 已选定唯一目标集群，且本次操作仅针对该目标环境执行，不与其他环境共用激活材料。
- Boot License 已由发行方提供，内容模式必须为 `boot`，并已按部署配置挂载到应用可读取位置；运行时同时需要可读取许可证验签公钥。
- Redis 已可用，连接参数稳定；请求码与正式许可证绑定均依赖当前 Redis 连接指纹与集群绑定材料。
- MongoDB 已可用，平台可持久化系统状态、许可证工件、用户与初始化数据。
- `Jwt__JwtSigningKey` 已注入，供后续正常登录与访问令牌签发使用。
- `Security__ApiKeyPepper` 已注入，供后续平台 API Key 散列与校验使用。
- `Recovery__BOOTSTRAP_ADMIN_TOKEN` 已注入，仅用于首轮激活链路与首个管理员创建。
- `Recovery__RECOVERY_ADMIN_TOKEN` 已注入，用于导入后、首个管理员建立前的恢复与受控应急操作。
- 仅历史 legacy 文档集成路径可能需要 `DocumentApi__DocumentApiKey`；新部署的 Capability Center 目标路径不得将其视为启动前置条件。
- 若当前部署启用 JS SDK feature，再额外注入 `EnterpriseSdkHost__PublicEntryUrl`，指向 SDK 静态资源的公开根目录。
- 不再要求注入历史 `DocumentApi__DocumentApiKey` 作为平台启动前置条件；文档能力目标信任链由 Capability Center 承接，本阶段 `document` runtime 仍标记为 ⛔ 未实现。
- 操作终端可访问平台入口，并可按需发送 `X-IMT-Admin-Token` 头或 Bearer Token。

#### 触发时机

新集群首次部署前；或同一套首次部署流程在全新空白环境重建时。

#### 使用凭据

- 集群部署凭据
- MongoDB/Redis 连接信息
- Boot License 文件
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`
- `Recovery__RECOVERY_ADMIN_TOKEN`
- 后续登录将使用 `Jwt__JwtSigningKey` 支持的正常认证体系

#### 操作步骤

1. 确认本次部署目标为“集群内首次部署与初始化”，不是已有实例升级、续期或恢复场景。
2. 校验应用配置中 MongoDB、Redis、许可证文件路径、许可证公钥路径与上述必需密钥均已注入。
3. 校验 Boot License 对应的 `license_id`、`company_name`、`product_name` 与本次交付对象一致。
4. 确认 Redis 为预期目标实例；不要在请求码导出后切换 Redis 地址、端口、TLS 或数据库编号。
5. 确认 MongoDB 与 Redis 网络策略、DNS、Service、Secret、PVC 或托管实例权限均已到位。
6. 记录本次执行使用的环境名、入口域名、部署版本、Boot License 标识与操作责任人。
7. 如启用 JS SDK feature，确认 `EnterpriseSdkHost__PublicEntryUrl` 是以 `/` 结尾的绝对 URL，且该 URL 的根目录直接托管 SDK dist 内容。

#### 成功标准

- 启动前所有必需依赖与密钥已齐备。
- Redis 与 MongoDB 可连通，Boot License 与公钥均可读取。
- 激活所需的 bootstrap/recovery 令牌已由安全管理员妥善保管并可供本次操作使用。
- 如启用 JS SDK feature，`EnterpriseSdkHost__PublicEntryUrl` 已指向可公开访问的 SDK 静态资源根目录。

#### 常见失败与处理

- Boot License 缺失或挂载路径错误：修正许可证挂载与 `License` 配置后再启动。
- Redis 指向错误环境：停止激活流程，切回正确 Redis，再重新获取请求码。
- MongoDB 不可写：先修复持久化问题，否则后续状态与管理员数据无法落库。
- 缺少 `Jwt__JwtSigningKey`、`Security__ApiKeyPepper`、`Recovery__BOOTSTRAP_ADMIN_TOKEN` 或 `Recovery__RECOVERY_ADMIN_TOKEN`：应用启动前补齐，避免形成半可用环境。
- 启用 JS SDK feature 但未配置 `EnterpriseSdkHost__PublicEntryUrl`：应用选项校验会失败；补齐后再启动。
- `EnterpriseSdkHost__PublicEntryUrl` 指到主站子路径或缺少结尾 `/`：SDK 内部根路径静态资源可能无法加载；改为指向 SDK 静态资源站点根目录。

### JS SDK feature 环境变量配置

#### 目的

在启用 JS SDK feature 时，明确平台下发给前端 SDK 的公开入口地址，使 SDK 文件翻译页和 PDF viewer 能按 SDK 自身资源路径加载静态文件。

#### 必需环境变量

启用 JS SDK feature 时必须配置：

```text
EnterpriseSdkHost__PublicEntryUrl=https://sdk.example.com/
```

配置要求：

- 必须是客户端浏览器可访问的绝对 URL。
- 必须以 `/` 结尾。
- 应指向 SDK 静态资源的公开根目录，而不是主站下的兼容子路径。
- 该根目录应直接托管 `enterprise-sdk/dist` 内容。

配置后，以下资源应能从同一根目录直接访问：

```text
https://sdk.example.com/index.html
https://sdk.example.com/js_sdk_enterprise.js
https://sdk.example.com/pdf-assets/viewer.js
https://sdk.example.com/build/pdf.js
https://sdk.example.com/app-assets/js/entry-doc-preview-*.js
https://sdk.example.com/assets/...
```

#### 常见失败与处理

- 配成 `https://app.example.com/static/sdk/`：这会让 SDK 入口在主站子路径下工作，但 SDK 内部的 `/pdf-assets/*`、`/build/*`、`/app-assets/*` 等根路径资源仍可能指向主站根目录；应改为独立 SDK 静态资源根目录。
- 配成 `https://sdk.example.com`：缺少结尾 `/`，应用会拒绝该配置；改为 `https://sdk.example.com/`。
- SDK 根目录只放了 `js_sdk_enterprise.js`：文件翻译页和 PDF viewer 还需要 `index.html`、`pdf-assets/*`、`build/*`、`app-assets/*` 等 dist 内容；应完整托管 `enterprise-sdk/dist`。
- 历史 `DocumentApi__DocumentApiKey` 不再作为 Capability Center 目标路径的启动必需项。

## First start in boot mode

### 首次以 boot mode 启动

#### 目的

将全新集群启动到受控的首次激活状态，确认系统进入 `boot_mode`，并将后续操作限制在本运行手册授权的健康检查与激活链路内。

#### 执行角色

集群运维负责部署与启动，平台实施负责人负责状态确认，安全管理员按需提供 bootstrap 令牌。

#### 前置条件

- “部署目标与前置条件”章节全部满足。
- 应用镜像、配置、Secret、ConfigMap 与入口暴露已部署完成。
- Boot License 已随部署可读。

#### 触发时机

首次启动平台实例后，进行任何许可证相关 API 调用之前立即执行。

#### 使用凭据

- 基础健康检查阶段通常无需业务认证。
- 若需要调用激活接口，使用 `Recovery__BOOTSTRAP_ADMIN_TOKEN` 通过 `X-IMT-Admin-Token` 请求头提交。

#### 操作步骤

1. 等待 Pod/Service/Ingress 就绪后，先执行基础健康检查：`GET /health/live` 与 `GET /health/ready`；任一不通过时先排查部署问题，不要直接进入许可证检查。
2. 基础健康检查通过后，再调用 `GET /api/license/status` 读取当前许可证状态。
3. 确认返回中的 `status` 为 `boot_mode`；若不是 `boot_mode`，立即停止首次部署流程，按实际状态转入恢复、复用或排障处理。
4. 按当前实现确认 boot mode 访问规则：当系统状态为 `boot_mode` 时，`GET /api/license/status` 当前允许匿名读取，即无 `X-IMT-Admin-Token`、无 Bearer Token、无角色身份也可访问；但运维人员与自动化流程仍应预先准备凭据，因为 OpenAPI 将该接口声明为受保护接口，后续状态切换后将立即回到受控访问模式。
5. 本运行手册在当前阶段只授权使用健康检查接口，以及许可证/bootstrap 初始化流程相关接口。即使其他路由在实现细节上暂时可达，也不得将其视为有效的生产入口、日常管理入口或已开放能力。
6. 明确告知操作团队：首个管理员创建前，不存在可依赖的正常生产登录入口；即使部分认证路由未被完全屏蔽，也不构成可操作的生产访问路径。

#### 成功标准

- `GET /health/live` 与 `GET /health/ready` 返回正常。
- `GET /api/license/status` 明确返回 `boot_mode`。
- 操作团队已确认当前阶段属于首次激活窗口，而不是正常投产状态。

#### 常见失败与处理

- 健康检查失败：优先排查容器启动、配置注入、Redis/MongoDB 连通性与许可证文件挂载。
- `GET /api/license/status` 不为 `boot_mode`：说明系统已存在其他状态记录，停止本手册流程，改走恢复或既有环境处理路径。
- 错误地尝试正常登录或访问业务管理接口：这是预期不可用状态，回到激活链路继续执行。
- 未带 bootstrap 令牌就调用激活接口：`request-code`、后续 bootstrap 管理员创建都会失败，补充 `X-IMT-Admin-Token` 后重试。

## Request code export

### 请求码导出

#### 目的

使用 Boot License 为当前集群导出正式授权申请所需的请求码，使发行方可据此生成与当前集群绑定的正式许可证。

#### 执行角色

平台实施负责人主执行，安全管理员提供 bootstrap 令牌，许可运营方接收请求码并签发正式许可证。

#### 前置条件

- 系统已处于 `boot_mode`。
- 已确认 `GET /api/license/status` 返回正确。
- Boot License 内容与本次环境身份一致。
- 已取得 `Recovery__BOOTSTRAP_ADMIN_TOKEN`。

#### 触发时机

首次启动确认进入 `boot_mode` 后，申请正式许可证之前立即执行。

#### 使用凭据

- `Recovery__BOOTSTRAP_ADMIN_TOKEN`，通过 `X-IMT-Admin-Token` 请求头使用。
- 请求体内容来源于 Boot License，但实际提交时必须按 OpenAPI 定义组装为 JSON 请求体。

#### 操作步骤

1. 使用 `POST /api/license/request-code` 提交由 Boot License 内容组装出的、符合 OpenAPI 定义的 JSON 请求体；该操作是标准 JSON API 调用，不是上传原始许可证文件。精确字段名与结构以 Swagger/OpenAPI 为准。
2. 请求必须携带 `X-IMT-Admin-Token: <BOOTSTRAP_ADMIN_TOKEN>`；当前实现下该接口仅接受 bootstrap 令牌，且系统必须仍处于 `boot_mode`。
3. 成功后保存返回的请求码原文，不要人工改写、分段重排或重新编码。
4. 将请求码发送给正式许可证签发方，并同时保留本地审计记录，标注环境、时间与经手人。
5. 明确请求码并非通用字符串：它绑定了当前 Boot License 的 `license_id`/企业标识/产品标识，以及当前 Redis 连接指纹和集群 UUID。
6. 在收到正式许可证前，不要更换 Redis 连接目标或重建绑定材料；否则后续导入极易发生绑定不匹配。

#### 成功标准

- `POST /api/license/request-code` 成功返回请求码。
- 请求码已安全保存并发送给许可证签发方。
- 操作团队已知晓该请求码与当前 Redis 绑定材料强关联，后续环境变更会影响导入结果。

#### 常见失败与处理

- `admin_token_required` 或 `admin_token_invalid`：检查 `X-IMT-Admin-Token` 是否为 `Recovery__BOOTSTRAP_ADMIN_TOKEN`。
- `admin_token_not_allowed`：通常表示系统不在 `boot_mode`，或错误地使用了 recovery 令牌。
- `BOOT_LICENSE_EXPIRED`：Boot License 已过期，需重新获取有效 Boot License。
- `LICENSE_SIGNATURE_INVALID`：Boot License 签名无效，需重新获取正确文件。
- 导出后 Redis 目标发生变化：不要继续使用旧请求码，应在稳定绑定条件下重新导出。

## Formal license validation/import

### 正式许可证校验与导入

#### 目的

对签发后的正式许可证执行受控校验、正式导入与状态复核，使系统从首次激活阶段转入 `licensed`。

#### 执行角色

平台实施负责人执行导入，安全管理员负责控制 bootstrap/recovery 令牌，许可证签发方负责提供正式许可证文档。

#### 前置条件

- 请求码已成功导出并已据此取得正式许可证。
- Redis 绑定目标自请求码导出后未被更换。
- 正式许可证文件已安全获取，且未被人工改写。
- 当前系统仍可访问许可证相关接口。

#### 触发时机

收到正式许可证后立即执行；在首个管理员创建前，这是从首次部署走向可用平台的关键切换步骤。

#### 使用凭据

- 首次导入通常使用 `Recovery__BOOTSTRAP_ADMIN_TOKEN`。
- 如已完成导入但首个管理员尚不存在，后续 `GET /api/license/status`、`POST /api/license/validate`、`POST /api/license/import` 的恢复路径应使用 `Recovery__RECOVERY_ADMIN_TOKEN`。
- 首个管理员创建并可正常登录后，后续 `GET /api/license/status` 应转为正常已认证管理员操作。

#### 操作步骤

1. 如需在落库前做预检查，可先调用可选接口 `POST /api/license/validate` 对正式许可证做一次校验；字段细节以 Swagger/OpenAPI 为准。
2. 首次导入时，如系统仍处于 `boot_mode`，可使用 `Recovery__BOOTSTRAP_ADMIN_TOKEN` 调用 `POST /api/license/import` 正式导入许可证文档。
3. 一旦导入成功并使系统退出 `boot_mode`，后续再次执行 `GET /api/license/status`、`POST /api/license/validate` 或 `POST /api/license/import` 时，不应继续依赖 bootstrap 令牌；应改用 `Recovery__RECOVERY_ADMIN_TOKEN`，或在首个管理员可登录后改用正常已认证管理员身份。
4. 导入成功后，立即按上条凭据边界要求再次调用 `GET /api/license/status` 做状态复核，确认 `status` 已变为 `licensed`，并记录 `license_id` 与时间戳。
5. 导入成功后，系统会进入已授权运行状态，并打开首个 bootstrap 管理员创建窗口；此时应继续执行后续管理员创建章节，而不是停留在 bootstrap 令牌运维模式。
6. 若导入失败，不要盲目重复修改文档内容；先按失败类别定位根因，再决定是否重新签发或重新导出请求码。

> 警告：正式许可证导入成功后、首个管理员尚未存在之前，`GET /api/license/status`、`POST /api/license/validate`、`POST /api/license/import` 的恢复访问路径应使用 `Recovery__RECOVERY_ADMIN_TOKEN`。`Recovery__BOOTSTRAP_ADMIN_TOKEN` 不是长期管理员认证手段；它主要服务于首次激活链路与首个管理员创建。

#### 成功标准

- `POST /api/license/validate`（如执行）返回有效结果。
- `POST /api/license/import` 成功完成。
- 紧随其后的 `GET /api/license/status` 返回 `licensed`。
- 首个管理员创建窗口已可进入后续章节处理。

#### 常见失败与处理

- 签名失败：通常表现为 `LICENSE_SIGNATURE_INVALID`，说明正式许可证签名不可信、文件损坏或内容被改写；向签发方重新获取原始文件。
- 绑定不匹配：通常表现为 `CLUSTER_BINDING_MISMATCH`，说明正式许可证中的绑定哈希与当前 Redis 指纹或集群 UUID 不一致；核对是否更换过 Redis、重建过集群绑定，必要时重新导出请求码并重新签发。
- 业务身份不匹配：当正式许可证的 `license_id`、企业名称或产品名称与 Boot License/请求码所属身份不一致时，导入将无法形成正确绑定，常以绑定不匹配或内容异常的形式暴露；应要求签发方按原请求码重新签发。
- 已处于 `licensed` 后再次做首次导入：当前实现会拒绝首次正式导入路径，应改走续期/恢复处理而非重复首次激活。
- 导入成功但未复核状态：必须立即重查 `GET /api/license/status`，不要只以导入接口返回成功作为结束依据。

## Bootstrap admin creation

### 首个 bootstrap 管理员创建

#### 目的

在正式许可证导入成功后、首次引导窗口仍然开放时，使用一次性 bootstrap 令牌创建首个平台管理员，使平台从“已授权但尚无正式管理员”的状态进入可登录管理状态。

#### 执行角色

平台实施负责人主执行，安全管理员负责受控提供 `Recovery__BOOTSTRAP_ADMIN_TOKEN` 并监督该令牌仅用于初始化。

#### 前置条件

- `POST /api/license/import` 已成功完成，系统状态已进入 `licensed`；当前实现下如运行时进入 `degraded`，只要正式许可证已成立且窗口未失效，bootstrap 管理员窗口仍可判定为可用。
- 当前环境中尚不存在任意 `platform_admin` 用户；一旦已有 `platform_admin`，`POST /api/bootstrap/admin` 将关闭。
- 正式许可证导入时打开的 bootstrap 窗口仍在有效期内；当前实现窗口 TTL 为 30 分钟，超时或已消费后不可再次用于首管创建。
- 已取得 `Recovery__BOOTSTRAP_ADMIN_TOKEN`，并明确该令牌不是长期管理员认证凭据，只用于初始化链路。
- 已准备首个命名管理员的用户名、显示名、邮箱和符合密码策略的口令。

#### 触发时机

正式许可证导入成功后立即执行；此阶段如首个管理员尚未创建，应以成功的 `POST /api/license/import` 响应作为主要依据，或在需要再次核查状态时使用 `Recovery__RECOVERY_ADMIN_TOKEN` 访问受保护状态接口，不要将匿名或 bootstrap-token 的状态访问理解为 `licensed` 阶段的可用路径。

#### 使用凭据

- `Recovery__BOOTSTRAP_ADMIN_TOKEN`，通过 `X-IMT-Admin-Token` 请求头使用。
- 请求体中的用户名和密码仅用于创建首个管理员，不构成 bootstrap 令牌的替代认证方式。

#### 操作步骤

1. 再次确认系统已完成正式许可证导入；`POST /api/bootstrap/admin` 只有在 formal license import 成功之后才允许使用，`boot_mode` 下会被拒绝。
2. 确认当前尚无 `platform_admin`；该接口只在“无 `platform_admin` 且 bootstrap window 未关闭”的窗口期可用。
3. 调用 `POST /api/bootstrap/admin`，携带 `X-IMT-Admin-Token: <BOOTSTRAP_ADMIN_TOKEN>`，按 OpenAPI 定义提交 `username`、`display_name`、`email`、`password`。
4. 成功创建后，确认返回的用户是激活状态，且平台角色固定为 `platform_admin` + `security_admin`；当前实现不会授予 `super_admin` 或其他隐藏角色。
5. 记录返回的 `user_id`、创建时间和操作者；如自动化可能重试，使用 `Idempotency-Key` 避免重复提交造成窗口竞争。
6. 创建成功后立即停止继续使用 bootstrap 令牌做后续管理动作；后续应转入正常登录、命名管理员交接和受控收口流程。

#### 成功标准

- `POST /api/bootstrap/admin` 返回成功创建结果。
- 新用户具备且仅具备 `platform_admin` 与 `security_admin` 平台角色。
- 平台中已存在首个可正常登录的命名管理员账户。
- 操作团队已明确 bootstrap 令牌只是初始化令牌，不作为长期后台管理认证方式保留给日常操作。

#### 常见失败与处理

- `admin_token_required` 或 `admin_token_invalid`：检查是否正确传入 `X-IMT-Admin-Token`，并确认使用的是 bootstrap 令牌而不是 recovery 令牌。
- `admin_token_not_allowed` 或 403：通常表示系统仍在 `boot_mode`、正式许可证尚未成功导入、窗口已过期，或当前已存在 `platform_admin`；先以 `POST /api/license/import` 成功响应为准，或使用 `Recovery__RECOVERY_ADMIN_TOKEN` 复核 `GET /api/license/status`，再确认是否已有首管记录。
- `platform_admin_exists`：说明首个平台管理员已存在，停止再次创建，改用正常登录或恢复流程接管。
- `bootstrap_window_expired` / `bootstrap_window_consumed`：窗口已失效或已被并发/先前请求消费；不要继续重试同一路径，应转入已有管理员登录或恢复处置。
- `username_already_exists`：更换用户名后重试；不要修改已成功创建的窗口消费结果来“覆盖”先前用户。

## First login and platform setup

### 首次登录与平台基础设置

#### 目的

使用首个管理员账户完成首次正常登录，确认 JWT 登录链路可用，并建立可交接的命名管理员账户、基础用户配额视图和最小安全基线，避免 bootstrap 管理员成为唯一入口。

#### 执行角色

首个 `platform_admin` 主执行，安全管理员参与管理员账户交接与权限收口。

#### 前置条件

- 首个 bootstrap 管理员已成功创建。
- `Jwt__JwtSigningKey` 已正常注入，系统处于 `licensed`；如系统进入 `degraded`，当前实现允许 `GET /api/auth/me`，但不允许新的 `POST /api/auth/login`。
- 已知晓 bootstrap 管理员用户名与密码，并准备至少一个后续交接用命名管理员账户信息。

#### 触发时机

`POST /api/bootstrap/admin` 成功后立即执行；bootstrap 窗口只约束“首个管理员创建”这一步，一旦首个管理员已创建成功，后续正常登录与交接不再依赖该窗口是否仍然开放。

#### 使用凭据

- 首个 bootstrap 管理员的用户名和密码，用于 `POST /api/auth/login`。
- 登录成功后返回的 Bearer Token，用于 `GET /api/auth/me`、`GET /api/users`、`POST /api/users`、`PATCH /api/users/{id}`、`POST /api/users/{id}/activate`、`POST /api/users/{id}/deactivate`、`GET /api/users/quota`。

#### 操作步骤

1. 调用 `POST /api/auth/login`，以首个管理员用户名和密码换取访问令牌与刷新令牌；若登录失败，先核对密码录入、运行时状态及用户激活状态。
2. 立即使用 Bearer Token 调用 `GET /api/auth/me`，确认当前访问上下文中的 `user_id`、`platform_roles`、组织授权上下文与预期一致，证明系统已从 bootstrap 令牌切换到正常认证体系。
3. 调用 `GET /api/users` 获取当前用户清单，确认刚创建的 bootstrap 管理员已落库，并记录其 `user_id` 以便后续必要时调整显示名、邮箱或密码。
4. 调用 `GET /api/users/quota` 查看当前 seat 配额；要明确：平台按“已激活用户数”计费/计座，用户即使尚未首次登录，只要被激活就会占用 seat。
5. 使用 `POST /api/users` 至少创建一个可交接的命名管理员账户，建议为个人实名或岗位实名账户，而不是共享账户；该账户通常应直接授予所需平台角色，并按交付要求决定是否立即激活。
6. 如需调整已有账户，使用 `PATCH /api/users/{id}` 更新 `display_name`、`email`、`password` 或 `platform_roles`；如需单独切换激活态，使用 `POST /api/users/{id}/activate` 或 `POST /api/users/{id}/deactivate`。
7. 对新建管理员再次执行 `GET /api/users/quota`，确认 seat 占用变化符合预期；如 seat 紧张，应先停用不必要账户，再继续后续初始化。
8. 明确交接原则：至少保留一个已激活、已验证、可由实施团队移交给客户或运维值班的命名管理员账户，避免 bootstrap 管理员成为唯一可进入系统的入口。

#### 成功标准

- `POST /api/auth/login` 成功返回会话令牌，`GET /api/auth/me` 返回与预期一致的管理员访问上下文。
- `GET /api/users`、`GET /api/users/quota` 可正常访问并返回可解释结果。
- 已建立至少一个可交接的命名管理员账户，不再只依赖 bootstrap 管理员。
- 团队已知晓“已激活即占 seat，即使该用户尚未登录”。

#### 常见失败与处理

- `POST /api/auth/login` 返回 `auth_unavailable_in_current_runtime_state` 或 503：说明系统不在允许新登录的运行时状态，先复核运行时是否已进入 `licensed`。
- `invalid_credentials`：检查用户名、密码、输入法和大小写；如密码遗失且尚有其他管理员不可用，需走恢复路径而不是重复 bootstrap。
- `GET /api/auth/me` 401：通常是 Bearer Token 未带上、过期或被覆盖，重新登录获取新令牌。
- 新建用户时报 seat 超限：先用 `GET /api/users/quota` 与 `POST /api/users/{id}/deactivate` 清理不必要激活账户，再重试。
- 只创建了 bootstrap 管理员、未建立交接账户：这是实施风险，不算完成；必须补齐至少一个 handoff-ready 的命名管理员账户。

## Runtime verification

### 运行时状态校验

#### 目的

在许可证生效后核对运行时健康、配额和后端 Pod 租约状态，判断平台是否处于可投产、可观测、可继续初始化的稳定状态。

#### 执行角色

集群运维与平台实施负责人共同执行；`operator` 可参与只读核查，`platform_admin` 负责触发重检。

#### 前置条件

- 系统已完成正式许可证导入，并至少已有一个可登录管理员账户。
- 参与校验的账号具备对应权限：`GET /api/runtime/quota` 与 `GET /api/runtime/pods` 允许 `platform_admin`、`security_admin`、`operator`；`POST /api/runtime/recheck` 仅允许 `platform_admin`。

#### 触发时机

首次管理员登录并完成基础平台设置后立即执行；后续每次许可证导入后复核、Redis 异常恢复后复核、扩容或 Pod 漂移后也应重做。

#### 使用凭据

- 具有运行时读取权限的 Bearer Token。
- 如需主动重检，使用 `platform_admin` 的 Bearer Token 调用 `POST /api/runtime/recheck`。

#### 操作步骤

1. 调用 `GET /api/runtime/health`，读取当前 `runtime_state`、`degraded_cause`、`remaining_grace_seconds` 与近到期告警，作为运行时总览。
2. 按当前实现解释状态：`licensed` 表示运行时已正常授权且可读写；`degraded` 表示处于受限降级期，通常只允许只读核查，需尽快排障；`unlicensed` 表示未形成有效运行授权或运行时上下文缺失，不应继续初始化。
3. 调用 `GET /api/runtime/quota`，确认 seat、request、pod 三类配额的 `enabled` 和 `limit` 是否与正式许可证一致；该接口用于查看“许可上限视图”，不是实时业务使用明细。
4. 调用 `GET /api/runtime/pods`，核对 backend Pod 租约是否已获取、续租是否连续失败、是否触发硬降级与后台任务暂停。要明确：该接口只展示 backend pod lease 状态。
5. 对 `document-api` 和 `document-worker` 的状态，不要依赖 `/api/runtime/pods` 判断；必须通过集群层面的 Deployment/Pod/组件状态、日志和监控单独核验，因为该 API 不覆盖它们。
6. 如运行时状态与预期不一致，使用 `POST /api/runtime/recheck` 触发重新评估，然后再次读取 `GET /api/runtime/health`；仅 `platform_admin` 可执行此动作。

#### 成功标准

- `GET /api/runtime/health` 返回 `licensed`，或在已知故障处理中至少能清楚说明 `degraded` 的原因和剩余宽限时间。
- `GET /api/runtime/quota` 返回的许可证限额与正式许可证一致。
- `GET /api/runtime/pods` 显示 backend pod 已取得有效租约，且未处于异常失败累积状态。
- `document-api` 与 `document-worker` 已通过集群/组件层检查独立确认，而不是被误判为已由 `/api/runtime/pods` 覆盖。

#### 常见失败与处理

- `runtime_state=degraded` 且 `degraded_cause=redis_unreachable`：优先恢复 Redis 连通性；在宽限期内完成恢复后再次 `POST /api/runtime/recheck`。
- `runtime_state=degraded` 且 backend lease 缺失：检查 backend Pod 副本、租约持久化、时钟偏移和 Redis 写入能力。
- `runtime_state=unlicensed`：停止后续初始化，先核查正式许可证、运行时上下文和系统状态持久化是否失效。
- `/api/runtime/pods` 正常但文档组件异常：这是预期可能场景，因为该接口不覆盖 `document-api`、`document-worker`；转到集群组件状态排查。
- 误将 `/api/runtime/quota` 或 `/api/runtime/pods` 视为匿名接口：它们需要已认证且具备相应角色，401/403 时先核对登录和角色。

## Tenant initialization

### 租户级初始化

#### 目的

完成平台根级治理对象的基础安全和策略配置，确保后续组织治理遵循统一租户基线。这里的 tenant 指当前单客户部署实例中的唯一根治理对象，不是 SaaS 多租户模型中的多个客户租户。

#### 执行角色

`platform_admin` 主执行；涉及登录方式和会话超时时，`security_admin` 可参与评审与共同确认。

#### 前置条件

- 平台已完成首次正常登录。
- 已明确客户对本地密码登录、SAML、会话超时、分析能力和许可证视图暴露范围的初始要求。
- 如计划启用租户级术语集，已准备术语集命名、状态、可见性和版本策略。

#### 触发时机

首次管理员登录后、创建组织之前执行，确保组织级策略继承和实施口径有统一根基线。

#### 使用凭据

- `GET /api/tenant/settings/security`、`PATCH /api/tenant/settings/security` 可由 `platform_admin` 或 `security_admin` 执行。
- `GET /api/tenant/analytics-policy`、`PATCH /api/tenant/analytics-policy`、`GET /api/tenant/license-view-policy`、`PATCH /api/tenant/license-view-policy`、`GET /api/tenant/terminologies`、`POST /api/tenant/terminologies`、`PATCH /api/tenant/terminologies/{id}` 需使用 `platform_admin` Bearer Token。

#### 操作步骤

1. 调用 `GET /api/tenant/settings/security` 读取当前租户安全设置基线，确认是否已有默认值或历史残留。
2. 使用 `PATCH /api/tenant/settings/security` 设置本地密码登录开关、SAML 开关与会话超时时长；若客户尚未准备好 SAML 联调，仍应先明确初始值而不是保持未知状态。
3. 调用 `GET /api/tenant/analytics-policy` 与 `GET /api/tenant/license-view-policy` 读取租户级分析策略和许可证视图策略当前状态。
4. 根据客户治理要求，分别使用 `PATCH /api/tenant/analytics-policy` 与 `PATCH /api/tenant/license-view-policy` 将策略收敛到明确值；不要把“未配置”当成“已确认默认值”。
5. 如客户需要在所有组织之上提供统一术语基础，可选执行术语初始化：先 `GET /api/tenant/terminologies` 查看现状，再用 `POST /api/tenant/terminologies` 创建租户术语集，必要时通过 `PATCH /api/tenant/terminologies/{id}` 调整名称、状态、可见性和版本。
6. 记录每项租户设置的业务含义、最终状态、变更时间与责任人，确保后续组织创建时不会因根配置不明确而返工。

#### 成功标准

- 租户安全设置已通过 `GET/PATCH /api/tenant/settings/security` 明确收敛。
- 租户级 analytics policy 与 license-view policy 已通过对应 `GET/PATCH` 接口确认可读、可写且状态符合实施要求。
- 如启用了租户术语集，相关 `GET/POST/PATCH /api/tenant/terminologies` 已返回正常结果，术语对象可被后续治理使用。
- 实施团队已明确 tenant 是当前单客户实例的根治理对象，而不是 SaaS 多租户中的客户租户概念。

#### 常见失败与处理

- `security_admin` 访问 analytics/license-view/terminologies 返回 403：这是当前实现预期，改由 `platform_admin` 执行这些租户级治理接口。
- `GET` 返回 404：说明该类租户策略对象尚未初始化，直接执行对应 `PATCH` 建立明确状态即可。
- 误把租户设置当作组织设置：会导致后续每个组织重复修补；应先完成租户根策略，再进入组织初始化。
- 术语集命名和状态未统一：先按实施约定定义命名规则和可见性，再创建，避免后续大量重命名。

## Organization and membership initialization

### 组织与成员关系初始化

#### 目的

创建首批组织、建立成员关系，并将平台治理权限与组织内业务权限分层配置到位，形成后续接管、术语、分析和集成操作的组织边界。

#### 执行角色

`platform_admin` 负责组织创建与组织级首批成员落位；必要时由 `security_admin` 协助核对用户身份与权限分配。

#### 前置条件

- 租户级初始化已完成。
- 相关平台用户已在 `/api/users` 中创建，且需要加入组织的用户已有稳定 `user_id`。
- 已明确组织编码规则、层级关系、首批组织管理员与普通成员名单。

#### 触发时机

租户级设置完成后立即执行，在组织级策略、接管和集成主体配置之前完成。

#### 使用凭据

- `platform_admin` Bearer Token，用于 `POST /api/organizations`、`PATCH /api/organizations/{organization_id}`、`POST /api/organizations/{organization_id}/freeze`、`POST /api/organizations/{organization_id}/restore`。
- 组织成员接口 `GET/POST/PATCH/DELETE /api/organizations/{organization_id}/members...` 由组织权限控制；若由 `platform_admin` 代办首批成员初始化，应先对目标组织发起 takeover，再执行写操作。

#### 操作步骤

1. 使用 `POST /api/organizations` 创建组织，提交 `name`、`code`，必要时提交 `parent_organization_id`；`code` 必须全局唯一，冲突会被拒绝。
2. 如组织名称、编码或父级关系需要调整，使用 `PATCH /api/organizations/{organization_id}` 修正；不要直接依赖数据库手改。
3. 为首批组织准备成员清单前，先向实施团队明确两层角色模型：平台角色（如 `platform_admin`、`security_admin`）是整个平台层；组织角色（如 `org_admin`、`analytics_admin`、`license_viewer`、`member_viewer`）只在某一组织内生效，两者不能互相替代。
4. 如当前还没有该组织自己的管理员，由 `platform_admin` 先发起该组织 takeover，再使用 `POST /api/organizations/{organization_id}/members` 为首批用户建立成员关系；初始阶段至少要为每个组织指定一个 `org_admin`，并按实际职责补充普通成员或专门角色。
5. 对首批成员分配采用“先管理员、后普通成员”的顺序：先完成初始 org admin 指派，确保组织后续有本组织自主管理入口；再继续添加 member、viewer 或专项角色。
6. 如成员角色、状态或到期时间需要变更，使用 `PATCH /api/organizations/{organization_id}/members/{membership_id}`；如成员分配错误，使用 `DELETE /api/organizations/{organization_id}/members/{membership_id}` 清理。
7. 如某组织需要暂停写操作而保留只读留痕，使用 `POST /api/organizations/{organization_id}/freeze`；恢复后使用 `POST /api/organizations/{organization_id}/restore`。首次部署时通常应保持组织为 `active`，除非业务明确要求冻结待命。

#### 成功标准

- 首批组织已创建完成，组织编码唯一且层级关系正确。
- 每个待启用组织至少已有一个有效 `org_admin` 成员关系。
- 首批普通成员或专项角色已按计划落位。
- 实施团队已明确“平台角色”和“组织角色”是不同治理层，不再混用。

#### 常见失败与处理

- `organization_code_already_exists`：调整组织编码后重试，保持唯一性。
- 先建组织后忘记指派 `org_admin`：该组织虽然存在，但没有可自主管理的组织入口，必须补齐初始 org admin。
- 使用错误的 `user_id` 建成员关系导致 404：先回到 `GET /api/users` 校对目标用户是否已创建。
- 把平台管理员角色当成组织成员角色写入：这是模型错误；平台角色只能在用户对象上配置，组织接口只写组织角色。
- 组织被冻结后写入成员失败：先判断冻结是否为预期；如需继续初始化，执行 `POST /api/organizations/{organization_id}/restore` 后再继续。

## Organization governance and takeover flow

### 组织治理与接管流程

#### 目的

明确组织级写操作何时必须由平台管理员先发起 takeover，何时可由组织管理员直接执行，并完成组织分析策略与许可证视图的首轮可达性确认。

#### 执行角色

`platform_admin` 负责跨组织接管与平台级兜底治理；`org_admin` 负责本组织日常治理；专项角色如 `analytics_admin`、`license_viewer` 在各自范围内执行只读或有限治理动作。

#### 前置条件

- 目标组织已创建且状态为 `active`，或已明确冻结/恢复策略。
- 组织中至少已有一个 `org_admin`，或已准备由 `platform_admin` 通过接管方式代管。
- 平台当前处于 `licensed`；当前实现下 takeover 仅允许在 `licensed` 状态启动，`degraded` 不允许发起新的接管会话。

#### 触发时机

组织创建与首批成员初始化完成后立即执行；之后每次平台管理员需要跨组织做写操作、客户组织无人值守、或需要受控代管时也应执行本流程。

#### 使用凭据

- `platform_admin` Bearer Token，用于 `POST /api/organizations/{organization_id}/takeover-sessions`、`DELETE /api/organizations/{organization_id}/takeover-sessions/current`，以及接管期间的组织级写操作。
- `org_admin` Bearer Token，用于本组织范围内的日常治理写操作，无需先 takeover。
- 组织级分析与许可证视图检查使用相应 Bearer Token 调用 `GET/PATCH /api/organizations/{organization_id}/analytics`、`GET /api/organizations/{organization_id}/license-view`。

#### 操作步骤

1. 先判断操作者身份与操作类型：如果是 `platform_admin` 要做组织范围内写操作，当前实现要求先调用 `POST /api/organizations/{organization_id}/takeover-sessions` 建立活动接管会话；否则大多数组织级写接口会因缺少 takeover 而被拒绝。
2. 要明确边界：`platform_admin` 并不自动拥有所有组织写权限；它对部分组织级只读接口可有平台读取覆盖，但对组织级写操作必须先 takeover。
3. 对本组织已有有效成员关系的 `org_admin`，可直接执行本组织范围内的写操作，无需发起 takeover；这是正常日常治理路径。
4. 在组织治理初始化中，先使用 `GET /api/organizations/{organization_id}/analytics` 检查组织分析策略对象是否已存在；当前实现下该接口在未初始化时可能返回 404。无论客户最终选择启用、禁用还是保持实际生效默认值，都应通过 `PATCH /api/organizations/{organization_id}/analytics` 明确建立并确认目标状态，而不能把“对象不存在”当作可接受的已配置默认值。该接口允许 `org_admin` 或 `analytics_admin`；平台管理员如需写入则必须处于有效 takeover 中。
5. 使用 `GET /api/organizations/{organization_id}/license-view` 检查组织许可证视图是否可达并能正确返回当前运行时、`license_id` 与 seat 统计；该接口为只读投影视图，不存在对应 PATCH。
6. 如决定保留组织 analytics 或 license-view 的默认状态，也必须先实际访问相关接口完成显式确认：对 analytics，先 `GET` 识别是否未初始化，再用 `PATCH` 建立并确认意图状态；对 license-view，至少执行 `GET /api/organizations/{organization_id}/license-view` 确认可达且返回结果符合预期。不要把 analytics 对象缺失视为已经接受的配置默认值。
7. 平台管理员完成代管写操作后，立即调用 `DELETE /api/organizations/{organization_id}/takeover-sessions/current` 结束当前接管会话，缩短高权限代管暴露时间；当前实现接管会话有效期为 15 分钟，到期也会自动失效并记审计。

#### 成功标准

- 团队已形成一致规则：`platform_admin` 做组织级写操作前必须先 takeover；`org_admin` 在本组织内可直接操作，无需 takeover。
- `POST /api/organizations/{organization_id}/takeover-sessions` 与 `DELETE /api/organizations/{organization_id}/takeover-sessions/current` 已至少实操验证一次。
- `GET/PATCH /api/organizations/{organization_id}/analytics` 与 `GET /api/organizations/{organization_id}/license-view` 均已确认可达、授权边界清晰、返回结果可解释。
- 如保留默认 analytics/license-view 状态，团队已明确该默认值是有意决定，而不是未验证遗留。

#### 常见失败与处理

- `platform_admin` 直接调用组织级写接口返回 403：通常是未先发起 takeover，先调用 `POST /api/organizations/{organization_id}/takeover-sessions`。
- `security_admin` 尝试 takeover 返回 403：这是当前实现预期，只有 `platform_admin` 能启动接管会话。
- takeover 启动失败且系统处于 `degraded`：当前实现只允许在 `licensed` 状态启动，先恢复运行时再接管。
- `platform_admin` 能看 `license-view` 却看不了 `analytics`：这是当前授权设计；`license-view` 允许平台读覆盖，`analytics` 不允许，仅组织角色或 takeover 写路径可管理。
- 组织被冻结后写治理接口失败：冻结组织默认阻断非只读组织操作；确认业务意图后先恢复组织，再继续治理写入。

## Integration principal and API key setup

### 集成主体与 API Key 配置

#### 目的

为后续外部系统对接建立可审计、可轮换、可按组织边界授权的组织级集成主体与 API Key，并明确人工平台管理员写入组织数据与机器 API Key 调用在授权方式上的差异。

#### 执行角色

`platform_admin` 主执行集成主体与 API Key 初始化；`security_admin` 负责明文密钥接收、落库与保管复核；如涉及组织范围写操作验证，由目标组织 `org_admin` 或已 takeover 的 `platform_admin` 共同参与。

#### 前置条件

- 平台已处于 `licensed`，且至少已有一个可正常登录的命名管理员账户。
- 租户、组织、首批组织成员和 takeover 流程已初始化，能够明确每个集成主体所属的目标组织、用途和责任人；当前 API 模型中的 integration principal 为组织级对象，不存在平台级 integration principal。
- `Security__ApiKeyPepper` 已稳定注入；否则 API Key 无法正常散列、校验或轮换。
- 已确定每个集成主体的命名规则、用途说明、作用域、目标组织边界、保管责任人与客户侧密钥管理落点。
- 客户侧密钥管理路径已准备好，例如专用 Secret 管理系统、KMS、密码保险库或受控交付目录，能够在密钥创建或轮换当场写入。

#### 触发时机

完成组织治理与接管流程验证后立即执行；之后每次新增系统对接、权限边界调整、密钥疑似泄露或计划轮换时也应重复本流程。

#### 使用凭据

- `platform_admin` Bearer Token，用于在目标组织上下文中列出、创建、更新集成主体，以及创建、列出、获取、更新、轮换 API Key。
- 组织级 integration principal 的 API Key 用于机器调用其所属组织范围内的接口；它不是人工 `platform_admin` 会话，也不以 takeover 作为同类前置条件。
- 若需要验证“人工平台管理员代组织执行写操作”，应使用 `platform_admin` Bearer Token 并先完成 takeover；若需要验证“机器对接方使用 organization-scoped integration principal API Key 调用组织接口”，则按该 API Key 自身授权边界验证，不把 takeover 作为同一前置要求。
- 明文 API Key 只会在“创建”或“轮换”成功响应中出现一次，必须立即写入客户侧密钥管理路径，不能依赖平台后续再次读取明文。

#### 操作步骤

1. 先梳理对接对象清单，按组织逐一确认需要创建的 organization-scoped integration principal，并约定命名格式、用途描述、负责人、目标组织以及所需权限边界。
2. 对每个目标组织调用 `GET /api/organizations/{organization_id}/integration-principals`，盘点当前环境是否已有历史主体，避免重复创建或误把测试主体继续带入生产。
3. 对不存在的目标对象，调用 `POST /api/organizations/{organization_id}/integration-principals` 建立新主体；创建时至少明确名称、用途说明、启用状态以及 OpenAPI 要求字段。
4. 对已存在但描述、状态或元数据需要修正的主体，调用 `PATCH /api/organizations/{organization_id}/integration-principals/{principal_id}` 修补；不要通过数据库直接修改，也不要为规避 patch 而重复创建同用途主体。
5. 每创建或修补一个主体后，再次执行 `GET /api/organizations/{organization_id}/integration-principals` 核对其唯一标识、显示名称、启用状态、所属组织和审计字段是否符合预期，并记录 `principal_id` 供后续 API Key 管理使用。
6. 以 `principal_id` 为维度调用 `GET /api/organizations/{organization_id}/integration-principals/{principal_id}/api-keys`，确认该主体当前是否已有活动密钥、旧密钥是否待退役、是否存在遗留测试密钥或用途不明的历史密钥。
7. 对尚无可用密钥的主体，调用 `POST /api/organizations/{organization_id}/integration-principals/{principal_id}/api-keys` 签发首个密钥；明文密钥仅在该创建响应中展示一次，操作员必须在响应返回时立即写入客户侧密钥管理路径，并完成双人复核，平台中后续只能再看到摘要、前缀、状态或元数据，不能重新取回明文。
8. 对已有密钥，调用 `GET /api/api-keys/{key_id}` 查看指定密钥的当前状态与元数据；如需维护密钥状态或到期时间，调用 `PATCH /api/api-keys/{key_id}`。当前实现的可维护字段以 `status` 和 `expires_at` 为主，精确字段限制以 Swagger/OpenAPI 为准。
9. 如需按计划轮换、疑似泄露处置或交接客户正式保管版本，调用 `POST /api/api-keys/{key_id}/rotate`；新的明文密钥同样只会在轮换响应中展示一次，必须立即覆盖写入客户侧密钥管理路径，并同步标注生效时间、旧密钥退役计划与责任人。
10. 验证时要明确区分两类路径：如果验证的是“人工 `platform_admin` 代组织执行写操作”，使用人工管理员 Bearer Token，并先按组织治理章节建立 takeover；如果验证的是“机器对接方使用 organization-scoped integration principal API Key 调用所属组织接口”，则直接用该 API Key 按接口授权边界验证，不把 takeover 当成同类前置条件。
11. 完成验证后，把每个组织的集成主体、`principal_id`、对应 API Key 标识、保管路径、最近轮换时间和负责人登记到交付记录中；若此前为人工平台管理员写入演练临时建立了 takeover，会后立即结束会话。

#### 成功标准

- 已能列出全部集成主体，并确认生产环境只保留用途明确、责任人明确的主体。
- 所需集成主体已创建或修补完成，`principal_id`、作用域和启用状态与实施设计一致。
- 每个需要对接的主体均已完成 API Key 创建、列出、获取信息或 patch 维护，且至少保留一条可用密钥记录。
- 涉及新建或轮换的明文 API Key 已在生成当场写入客户侧密钥管理路径，并完成保管复核。
- 已验证 organization-scoped integration principal 与其 API Key 只在所属组织边界内使用。
- 已区分两类写入路径：人工 `platform_admin` 做组织级写入时遵守 takeover 要求；机器 API Key 调用按 integration principal 自身授权边界执行，不把 takeover 作为同类前置条件。

#### 常见失败与处理

- `GET /api/organizations/{organization_id}/integration-principals` 或 `GET /api/organizations/{organization_id}/integration-principals/{principal_id}/api-keys` 返回未知历史主体或历史密钥：先暂停交付，核对是否为旧环境遗留、测试遗留或并发创建，确认后再决定禁用、轮换或删除。
- 创建主体失败且提示名称冲突：先重新列出主体，确认是否已存在同用途对象；能 patch 纠正时优先 patch，不要简单追加序号制造重复主体。
- API Key 创建成功但未及时保存明文：平台后续无法再次展示明文，只能立即执行轮换生成新密钥，并废弃无法保管的那一版。
- 人工 `platform_admin` 身份驱动组织写接口返回 403：通常不是 integration principal 或 API Key 本身失效，而是缺少 takeover；先建立 `POST /api/organizations/{organization_id}/takeover-sessions` 再重试。
- 机器 API Key 调用组织接口返回 403：先核对该密钥是否属于目标组织下的 integration principal、该 principal 是否启用、接口是否允许该类凭据访问，而不是误判为必须先 takeover。
- API Key 轮换后旧调用全部失败：先确认客户侧应用是否已切换到新明文密钥，再检查旧密钥是否已被禁用或补丁更新影响了状态/到期时间。
- 获取或 patch API Key 时字段不符合预期：不要猜测字段语义，回到 Swagger/OpenAPI 核对可读字段、可写字段与枚举约束。

## Acceptance checklist

### 首次部署验收清单

#### 目的

以可勾选、可留痕、可交付的方式确认首次部署已经达到上线前最低验收标准，避免仅凭接口单次成功就宣告完成。

#### 执行角色

平台实施负责人主导验收；集群运维、安全管理员、客户指定管理员和必要的组织管理员共同见证并签收各自责任项。

#### 前置条件

- 本运行手册前述部署、许可证、管理员、租户、组织、运行时和集成主体步骤均已执行。
- 验收人员能够访问平台入口、集群状态、交付记录和客户侧密钥管理路径。
- 已准备验收留证方式，例如工单、截图、接口响应摘录、配置清单、变更记录或客户签收表。

#### 触发时机

完成全部初始化操作后立即执行；任何关键项失败时不得宣告交付完成，应先回到对应章节修复后重新逐项复核。

#### 使用凭据

- `platform_admin` Bearer Token，用于大多数平台级验收接口。
- 必要时使用 `org_admin` Bearer Token 验证组织侧日常可用路径。
- 必要时使用 `Recovery__RECOVERY_ADMIN_TOKEN` 验证受限恢复路径，但该步骤不能替代正常管理员验收。

#### 操作步骤

1. 逐项执行并勾选以下验收清单，未通过项必须记录原因、责任人和补救截止时间：
   - [ ] 部署已启动：`GET /health/live` 与 `GET /health/ready` 正常，关键 Pod/Service/Ingress 处于可解释状态。
   - [ ] 正式许可证已激活：`GET /api/license/status` 返回 `licensed`，`license_id` 与交付对象一致，不再处于 `boot_mode`。
   - [ ] 命名管理员登录可用：至少一个非 bootstrap 的命名管理员可通过 `POST /api/auth/login` 正常登录，并通过 `GET /api/auth/me` 看到正确平台角色。
   - [ ] 租户设置已完成：`GET/PATCH /api/tenant/settings/security`、租户 analytics policy、license-view policy 已确认到目标状态。
   - [ ] 组织与成员初始化已完成：首批组织存在、编码正确、每个启用组织至少有一个有效 `org_admin`，首批成员关系可解释。
   - [ ] takeover 流程已验证：已实操 `POST /api/organizations/{organization_id}/takeover-sessions` 和 `DELETE /api/organizations/{organization_id}/takeover-sessions/current`，并证明平台管理员做组织写操作前必须先 takeover。
   - [ ] 运行时检查已完成：`GET /api/runtime/health`、`GET /api/runtime/quota`、`GET /api/runtime/pods` 返回结果正常或异常原因已闭环；文档相关组件已通过集群层单独核查。
   - [ ] 集成凭据已安全保管：集成主体与 API Key 已建立，任何新建/轮换得到的明文密钥都已立即写入客户侧密钥管理路径，并完成责任人交接。
2. 对每一项勾选结果保留证据，至少包括执行人、执行时间、环境标识、关键返回值或截图摘要；不要只记录“已完成”而没有佐证。
3. 如客户要求现场演示，按最短闭环依次演示：管理员登录、组织读取、takeover 写入验证、运行时读取、集成密钥保管记录抽查。
4. 若存在“可接受但未当场修复”的遗留问题，必须单独列入 concerns 或遗留清单，并说明是否影响上线；不能把已知缺口混入通过项。
5. 全部必选项通过后，形成最终交付记录，明确平台日常入口为命名管理员和受控组织治理路径，bootstrap/recovery 令牌只作为受控恢复手段保留。

#### 成功标准

- 验收清单全部关键项可逐条勾选，无未解释的空白项。
- 部署已启动、正式许可证已激活、命名管理员登录正常、租户/组织初始化完成、takeover 已验证、运行时检查完成、集成凭据已安全保管。
- 交付证据完整，客户或值班接手团队能够据此复核，不依赖实施人员口头说明。

#### 常见失败与处理

- 只有 bootstrap 管理员可用、命名管理员未验证：不算通过，必须补做正常登录和交接账号验证。
- 许可证接口曾成功但当前不是 `licensed`：不能勾选正式激活项，先回到许可证恢复路径确认当前状态。
- takeover 只讲解未实操：不算验证完成，必须实际建会话、执行至少一个组织写操作、再结束会话。
- 明文 API Key 只发到聊天或临时文档：视为未安全保管，必须按客户侧密钥管理路径重新轮换并重新交接。
- runtime 检查只看应用接口、未看文档组件或后端租约：验收证据不完整，补齐集群层核查后再签收。

## Recovery and remediation

### 恢复与补救

#### 目的

在平台进入 `degraded`、`unlicensed`、管理员暂不可用或绑定异常时，提供最小可执行恢复路径，先恢复许可证与运行时可见性，再决定是否继续业务修复或权限修复。

#### 执行角色

平台实施负责人主执行恢复判断；安全管理员负责受控提供 `Recovery__RECOVERY_ADMIN_TOKEN`；集群运维负责 Redis、绑定材料、网络和后端组件故障排查；如已有可登录管理员，则由 `platform_admin` 配合完成正常认证下的后续修复。

#### 前置条件

- 已能确认当前环境、入口地址、部署版本和最近一次许可证导入记录，避免把错误环境当作故障环境修复。
- `Recovery__RECOVERY_ADMIN_TOKEN` 由安全管理员受控保管，可在应急窗口内提供。
- 如怀疑 Redis、绑定材料或集群身份变化，已可访问对应的配置、日志、监控和集群状态。
- 操作人员明确恢复目标是“先恢复许可证状态和可观测性，再恢复正常管理员入口”，而不是直接把 recovery 令牌当成长效管理凭据。

#### 触发时机

出现以下任一情况时立即执行：`GET /api/runtime/health` 显示 `degraded` 或 `unlicensed`；正式许可证状态无法由正常管理员读取；许可证需要重新校验/导入；管理员暂时无法登录但必须先判断许可证是否仍有效。

#### 使用凭据

- `Recovery__RECOVERY_ADMIN_TOKEN` 是 `GET /api/license/status`、`POST /api/license/validate`、`POST /api/license/import` 的明确恢复路径；调用时通过 `X-IMT-Admin-Token` 请求头提交。
- 正常 Bearer Token 仍用于多数平台管理、组织治理、用户修复和运行时重检；recovery 令牌不能替代常规管理员去执行这些日常管理动作。
- 如系统仍有可登录管理员，应优先让管理员完成普通治理操作，recovery 令牌只用于许可证相关受限恢复面。

#### 操作步骤

1. 先判断故障落点：分别读取 `GET /api/runtime/health`、集群日志、Redis/MongoDB/应用健康状态，确认问题主要属于“许可证状态异常”“运行时降级”“管理员认证不可用”还是“基础依赖故障”。
2. 当正常管理员无法可靠读取许可证状态，或系统已进入 `degraded` / `unlicensed` 时，使用 `Recovery__RECOVERY_ADMIN_TOKEN` 调用 `GET /api/license/status` 作为最小恢复入口，确认当前 `status`、`license_id`、导入痕迹和可解释错误信息。
3. 如需确认手头许可证文件是否仍可被当前环境接受，使用同一 recovery 令牌调用 `POST /api/license/validate` 做预校验；若返回签名无效、绑定不匹配或内容不一致，先停止盲目重试导入。
4. 如确认需要重新导入当前有效正式许可证，使用 recovery 令牌调用 `POST /api/license/import`；这同样属于恢复路径，尤其适用于已脱离 boot 阶段、但暂时无法依赖正常管理员完成许可证恢复的场景。
5. 导入或校验后，再次用 recovery 令牌调用 `GET /api/license/status` 复核状态是否从 `unlicensed` 或不可解释状态回到 `licensed`；若仍为 `degraded`，继续沿运行时故障方向排查，而不是重复导入同一文件。
6. 明确状态边界：在 `degraded` 下，系统通常仍允许部分只读核查或已登录会话自检，例如许可证状态读取、部分运行时读取、已存在会话的 `GET /api/auth/me` 之类的受限检查；但新的正常管理员登录、部分组织写操作、takeover 启动或其他受写入状态约束的动作可能被禁止。到了 `unlicensed`，多数依赖有效运行授权的管理与业务写操作都不应继续，尤其不能把 recovery 令牌误当成全局后台通行证。用户、组织、策略、takeover、运行时重检等常规管理仍要求正常认证管理员，在状态恢复后再执行。
7. 若问题与 Redis 或绑定材料相关，按“绑定是否变了、Redis 是否通了、写入是否稳定”三层判断：
   - 若 Redis 完全不可达，常见表现是 `runtime_state=degraded`、`degraded_cause=redis_unreachable`、租约续租失败或许可证运行态无法持续确认；先恢复网络、DNS、TLS、密码、实例可用性，再做 `POST /api/runtime/recheck` 或重新读取状态。
   - 若 Redis 可达但绑定相关报错为 `CLUSTER_BINDING_MISMATCH`，重点检查请求码导出后是否切换了 Redis 地址、端口、库编号、TLS 方式，或重建了集群绑定材料/UUID；这类问题不是简单重启能解决，通常需要重新导出请求码并重新签发正式许可证。
   - 若 Redis 可达但 backend lease 异常，说明更多是运行时租约/续租问题而非许可证文件本身问题；检查 backend Pod 副本、时钟偏移、Redis 写能力、租约键冲突和网络抖动。
8. 如果许可证状态已恢复为 `licensed` 但管理员仍无法登录，恢复工作进入第二阶段：改用正常认证路径排查用户状态、密码、JWT 签发、账户激活和角色，而不是继续停留在 recovery 令牌模式。
9. 故障闭环后，记录根因、恢复时间、使用过的 recovery 调用、是否重新导入过许可证、是否涉及 Redis 变更，以及是否需要追加 API Key 轮换、管理员密码重置或集群配置加固。

#### 成功标准

- 已使用 `Recovery__RECOVERY_ADMIN_TOKEN` 明确验证 `GET /api/license/status`，并在需要时完成 `POST /api/license/validate`、`POST /api/license/import` 的恢复调用。
- 团队能清楚区分 `degraded` 与 `unlicensed`：前者通常保留有限只读/恢复面，后者不应继续依赖普通运行授权路径做初始化或写操作。
- Redis 连通性问题、绑定不匹配问题、backend lease 问题已被分别归类，不再混为“许可证坏了”。
- 若许可证状态已恢复，后续常规修复已切回正常管理员认证路径，而不是继续依赖 recovery 令牌承担日常管理。

#### 常见失败与处理

- 把 `Recovery__RECOVERY_ADMIN_TOKEN` 用于用户、组织或治理接口：这是错误使用；该令牌在本运行手册中明确只作为 `GET /api/license/status`、`POST /api/license/validate`、`POST /api/license/import` 的恢复路径。
- `degraded` 状态下反复尝试正常登录失败：先接受该状态可能限制新登录这一事实，优先恢复许可证/运行时，再回到管理员认证修复。
- `unlicensed` 后立刻重复导入同一许可证却没有先校验：容易掩盖签名或绑定问题，应先 `POST /api/license/validate` 判断失败类别。
- 看到 `CLUSTER_BINDING_MISMATCH` 就重启应用：通常无效，必须核对 Redis 指纹与绑定材料是否已变化。
- Redis 已恢复但系统仍显示异常：补做 `POST /api/runtime/recheck`、复查 backend lease 和状态持久化，确认不是租约或缓存滞后。

## Appendices

### 附录 A：关键配置与密钥一览表

| 项目 | 类型 | 用途 | 由谁保管 | 使用阶段 | 操作要求 |
| --- | --- | --- | --- | --- | --- |
| Boot License 文件 | 文件/Secret | 导出请求码、启动 boot mode | 安全管理员 | 首次部署初期 | 只用于首次激活链路，勿与其他环境混用 |
| 正式许可证文件 | 文件/Secret | 导入正式授权，驱动 `licensed` | 安全管理员 | 正式导入、恢复导入 | 保留原始文件，禁止人工改写 |
| 许可证验签公钥 | 文件/Secret | 校验 Boot/正式许可证签名 | 安全管理员 | 全流程 | 与许可证文件同源管理 |
| `Recovery__BOOTSTRAP_ADMIN_TOKEN` | Secret | 请求码导出、首次正式导入、首个管理员创建 | 安全管理员 | 首次激活窗口 | 不是长期管理入口，首管创建后停止日常使用 |
| `Recovery__RECOVERY_ADMIN_TOKEN` | Secret | `GET /api/license/status`、`POST /api/license/validate`、`POST /api/license/import` 恢复路径 | 安全管理员 | 导入后恢复、应急排障 | 仅用于许可证恢复面，不能替代普通管理员 |
| `Jwt__JwtSigningKey` | Secret | 签发正常登录 JWT | 安全管理员 | 管理员登录后长期使用 | 丢失或变更会影响正常认证链路 |
| `Security__ApiKeyPepper` | Secret | 平台 API Key 散列与校验 | 安全管理员 | 集成主体长期运行 | 变更需评估现有 API Key 影响 |
| MongoDB 连接信息 | Secret/配置 | 持久化系统状态、用户、治理对象 | 集群运维 | 全流程 | 必须可写且指向目标环境 |
| Redis 连接信息 | Secret/配置 | 绑定材料、运行时状态、租约 | 集群运维 | 全流程 | 请求码导出后不得随意切换目标 |
| `DocumentApi__DocumentApiKey` | Historical / optional | 旧文档域联动设计遗留项 | 安全管理员 | 非 Capability Center 目标路径 | 不作为新部署启动必需项；文档能力目标信任链以 Capability Center 为准 |
| 集成主体 API Key 明文 | Secret | 外部系统调用平台 API | 客户安全管理员/客户运维 | 对接上线后长期使用 | 只在创建/轮换时可见，必须立即写入客户侧密钥管理路径 |

### 附录 B：关键接口一览表

| 接口 | 用途 | 推荐凭据 | 关键说明 |
| --- | --- | --- | --- |
| `GET /health/live` | 存活检查 | 通常无需业务认证 | 用于判断进程是否存活 |
| `GET /health/ready` | 就绪检查 | 通常无需业务认证 | 用于判断实例是否可接流量 |
| `GET /api/license/status` | 查看许可证状态 | `boot_mode` 早期可匿名；导入后恢复面使用 `RECOVERY_ADMIN_TOKEN`；正常期用管理员 Bearer Token | 恢复时的最小入口之一 |
| `POST /api/license/request-code` | 导出请求码 | `BOOTSTRAP_ADMIN_TOKEN` | 仅首次激活链路使用 |
| `POST /api/license/validate` | 校验正式许可证 | `RECOVERY_ADMIN_TOKEN` 或受控管理员 | 字段细节以 OpenAPI 为准 |
| `POST /api/license/import` | 导入正式许可证 | 首次通常用 `BOOTSTRAP_ADMIN_TOKEN`；恢复时用 `RECOVERY_ADMIN_TOKEN` | 导入后立即复核状态 |
| `POST /api/bootstrap/admin` | 创建首个管理员 | `BOOTSTRAP_ADMIN_TOKEN` | 仅在首管窗口内可用 |
| `POST /api/auth/login` | 正常管理员登录 | 用户名/密码 | `degraded` 时可能禁止新登录 |
| `GET /api/auth/me` | 校验当前登录上下文 | Bearer Token | 可确认角色与会话可用性 |
| `GET /api/users` | 列出平台用户 | `platform_admin` Bearer Token | 用于管理员交接与核对 |
| `POST /api/users` | 创建平台用户 | `platform_admin` Bearer Token | 已激活用户会占 seat |
| `PATCH /api/users/{id}` | 更新平台用户 | `platform_admin` Bearer Token | 用于改名、邮箱、密码或平台角色调整 |
| `POST /api/users/{id}/activate` | 激活用户 | `platform_admin` Bearer Token | 激活后即占用 seat |
| `POST /api/users/{id}/deactivate` | 停用用户 | `platform_admin` Bearer Token | 交接或回收 seat 时使用 |
| `GET /api/users/quota` | 查看用户 seat 配额 | `platform_admin` Bearer Token | 用于管理员与成员初始化阶段 |
| `GET /api/runtime/health` | 查看运行时状态 | 具备权限的 Bearer Token | 判断 `licensed` / `degraded` / `unlicensed` |
| `GET /api/runtime/quota` | 查看运行时配额视图 | 具备权限的 Bearer Token | 核对许可证 seat/request/pod 限额 |
| `GET /api/runtime/pods` | 查看 backend pod 租约状态 | 具备权限的 Bearer Token | 不覆盖 `document-api`、`document-worker` |
| `POST /api/runtime/recheck` | 触发运行时重检 | `platform_admin` Bearer Token | 故障恢复后常用 |
| `GET /api/tenant/settings/security` | 读取租户安全设置 | `platform_admin` 或 `security_admin` Bearer Token | 查看本地登录、SAML、会话超时 |
| `PATCH /api/tenant/settings/security` | 更新租户安全设置 | `platform_admin` 或 `security_admin` Bearer Token | 明确租户级安全基线 |
| `GET /api/tenant/analytics-policy` | 读取租户分析策略 | `platform_admin` Bearer Token | 初始化 analytics 根策略 |
| `PATCH /api/tenant/analytics-policy` | 更新租户分析策略 | `platform_admin` Bearer Token | 不把“未配置”当成“已确认默认值” |
| `GET /api/tenant/license-view-policy` | 读取租户许可证视图策略 | `platform_admin` Bearer Token | 核对租户级 license-view 暴露范围 |
| `PATCH /api/tenant/license-view-policy` | 更新租户许可证视图策略 | `platform_admin` Bearer Token | 收敛到明确策略值 |
| `GET /api/tenant/terminologies` | 列出租户术语集 | `platform_admin` Bearer Token | 可选初始化前盘点现状 |
| `POST /api/tenant/terminologies` | 创建租户术语集 | `platform_admin` Bearer Token | 用于统一术语基础 |
| `PATCH /api/tenant/terminologies/{id}` | 更新租户术语集 | `platform_admin` Bearer Token | 调整名称、状态、可见性、版本 |
| `POST /api/organizations` | 创建组织 | `platform_admin` Bearer Token | 建立组织边界 |
| `PATCH /api/organizations/{organization_id}` | 更新组织 | `platform_admin` Bearer Token | 修正名称、编码、父级关系 |
| `POST /api/organizations/{organization_id}/freeze` | 冻结组织 | `platform_admin` Bearer Token | 暂停写入、保留只读留痕 |
| `POST /api/organizations/{organization_id}/restore` | 恢复组织 | `platform_admin` Bearer Token | 解除冻结后继续治理 |
| `GET /api/organizations/{organization_id}/members` | 列出组织成员 | 组织角色或受控平台代办 | 首批成员初始化前后核对 |
| `POST /api/organizations/{organization_id}/members` | 创建组织成员关系 | 组织角色或已 takeover 的 `platform_admin` | 首批 `org_admin` 与成员落位 |
| `PATCH /api/organizations/{organization_id}/members/{membership_id}` | 更新组织成员关系 | 组织角色或已 takeover 的 `platform_admin` | 调整组织角色、状态、到期时间 |
| `DELETE /api/organizations/{organization_id}/members/{membership_id}` | 删除组织成员关系 | 组织角色或已 takeover 的 `platform_admin` | 清理错误成员分配 |
| `POST /api/organizations/{organization_id}/takeover-sessions` | 发起组织接管 | `platform_admin` Bearer Token | 平台管理员做组织写前必须先执行 |
| `DELETE /api/organizations/{organization_id}/takeover-sessions/current` | 结束组织接管 | `platform_admin` Bearer Token | 完成代办后立即收口 |
| `GET /api/organizations/{organization_id}/analytics` | 读取组织分析策略 | `org_admin`、`analytics_admin` 或已 takeover 的 `platform_admin` | 未初始化时可能返回 404 |
| `PATCH /api/organizations/{organization_id}/analytics` | 更新组织分析策略 | `org_admin`、`analytics_admin` 或已 takeover 的 `platform_admin` | 平台管理员写入时需先 takeover |
| `GET /api/organizations/{organization_id}/license-view` | 读取组织许可证视图 | 具备组织读取权限的 Bearer Token | 只读投影视图，无对应 PATCH |
| `GET /api/organizations/{organization_id}/integration-principals` | 列出组织级集成主体 | 具备该组织管理权限的 Bearer Token | integration principal 为组织级对象 |
| `POST /api/organizations/{organization_id}/integration-principals` | 创建组织级集成主体 | 具备该组织管理权限的 Bearer Token | 创建后记录 `principal_id` |
| `PATCH /api/organizations/{organization_id}/integration-principals/{principal_id}` | 更新组织级集成主体 | 具备该组织管理权限的 Bearer Token | 用于修补名称、状态、元数据 |
| `GET /api/organizations/{organization_id}/integration-principals/{principal_id}/api-keys` | 列出主体 API Key | 具备该组织管理权限的 Bearer Token | 用于盘点活动密钥与遗留密钥 |
| `POST /api/organizations/{organization_id}/integration-principals/{principal_id}/api-keys` | 创建主体 API Key | 具备该组织管理权限的 Bearer Token | 明文只在创建响应中出现一次 |
| `GET /api/api-keys/{key_id}` | 获取指定 API Key 元数据 | 具备相应管理权限的 Bearer Token | 不返回可重复读取的明文 |
| `PATCH /api/api-keys/{key_id}` | 更新指定 API Key | 具备相应管理权限的 Bearer Token | 当前主要用于维护 `status` 与 `expires_at` |
| `POST /api/api-keys/{key_id}/rotate` | 轮换指定 API Key | 具备相应管理权限的 Bearer Token | 新明文只在轮换响应中出现一次 |

### 附录 C：首日最短执行序列

1. 核对 MongoDB、Redis、Boot License、验签公钥、JWT 签名密钥、API Key Pepper、bootstrap/recovery 令牌均已注入。
2. 启动平台并确认 `GET /health/live`、`GET /health/ready` 正常，`GET /api/license/status` 为 `boot_mode`。
3. 用 `Recovery__BOOTSTRAP_ADMIN_TOKEN` 调用 `POST /api/license/request-code`，把请求码发给签发方。
4. 收到正式许可证后，先 `POST /api/license/validate`（可选），再 `POST /api/license/import`，随后复核 `GET /api/license/status` 为 `licensed`。
5. 用 `POST /api/bootstrap/admin` 创建首个管理员，立即执行 `POST /api/auth/login` 和 `GET /api/auth/me` 验证正常登录链路。
6. 创建至少一个可交接命名管理员，完成租户安全设置、组织创建、首批成员与 `org_admin` 指派。
7. 演练一次 takeover，确认平台管理员做组织写操作前必须先接管。
8. 执行 `GET /api/runtime/health`、`GET /api/runtime/quota`、`GET /api/runtime/pods`，并在集群层独立核查文档组件。
9. 建立集成主体与 API Key，把明文密钥立即写入客户侧密钥管理路径。
10. 按验收清单逐项勾选并留证，完成首日交付。

Capability Center 相关发布验证补充：本地单元测试只覆盖 strict gate 失败关闭、本进程单例 fencing 与 profile gating；真实多 Pod Redis/Mongo 场景必须在 CI 或可工作的 Docker/集群环境中重跑并留证。若本地 Docker、Testcontainers 或代理环境不可用，不能把本地 full-solution 未执行解读为已通过发布验证，应明确移交 CI/协调人补跑。

### 附录 D：角色与步骤责任矩阵

| 步骤 | 集群运维 | 安全管理员 | 平台实施负责人 | `platform_admin` | `org_admin` | 客户指定管理员 |
| --- | --- | --- | --- | --- | --- | --- |
| 部署前依赖与密钥校验 | R | A | A | I | I | I |
| 首次启动与健康检查 | R | I | A | I | I | I |
| 请求码导出 | I | A | R | I | I | I |
| 正式许可证导入/恢复导入 | I | A | R | I | I | I |
| 首个 bootstrap 管理员创建 | I | A | R | I | I | I |
| 首次正常登录与交接管理员创建 | I | I | A | R | I | C |
| 租户级初始化 | I | C | A | R | I | C |
| 组织创建与首批成员初始化 | I | I | A | R | C | C |
| takeover 验证与组织代办写入 | I | I | A | R | C | I |
| 运行时状态校验 | R | I | A | R | I | I |
| 集成主体与 API Key 配置 | I | A | A | R | C | C |
| 验收签收与交付留证 | I | C | R | R | C | A |

注：`R`=直接执行，`A`=对结果负责，`C`=协作/见证，`I`=知情。
