# IMT Private Console 前端用户流程测试报告

测试日期：2026-05-14  
测试环境：`http://imt-on-premise.imta7d93ab42ebdfc1009aad48b14a6a10d.youshouldknowthebabelnovel.com`  
测试方式：使用 Chrome 自动化按真实用户操作流程验证页面登录、导航、角色可见性、按钮操作、错误提示和页面截图。  
截图目录：`test-reports/imt-private-console-ui/screenshots/`  
原始流程数据：`test-reports/imt-private-console-ui/ui-flow-results.json`

> 说明：报告不包含明文密码、Token 或 API Key Secret。测试中通过 UI 创建的组织接管会话已在测试结束后手动结束。

## 1. 总体结论

本轮从前端用户操作流程验证了 4 类角色：`people_admin`、`platform_admin`、`security_admin`、`viewer`。

整体结论：

- `platform_admin`、`security_admin`、`viewer` 的主要导航和可见页面基本符合预期。
- `people_admin` 登录后的默认入口存在明显问题：用户会进入 Platform Dashboard，但该页面依赖的运行/License 接口对 `people_admin` 无权限，导致页面停留在 Loading。
- `people_admin` 的 Users 页面存在操作按钮越权暴露：对高权限用户展示了 `Manage organizations` 等操作，点击后前端才提示无权限。
- `platform_admin` 的 SSO Settings 页面可打开，但 `/api/tenant/settings/saml` 返回 404，页面以空配置方式继续展示，存在配置语义不清和误保存风险。
- `platform_admin` 在组织接管后进入组织术语页，点击 Export 会触发 403，用户看到操作失败。
- 组织 Analytics 在本轮前端流程中可以正常加载 Usage Analytics，不作为前端 bug 记录。

## 2. 测试账号与前端入口结果

| 账号 | 角色 | 登录结果 | 登录后落点 | 前端现象 | 结论 |
|---|---|---:|---|---|---|
| `test03` | `people_admin` | 通过 | `/app/admin/platform/dashboard` | 页面显示 `Loading platform dashboard...`，接口 403 | 不通过 |
| `test04` | `platform_admin` | 通过 | `/app/admin/platform/dashboard` | Dashboard 正常显示 License 和 Runtime 摘要 | 通过 |
| `test05` | `security_admin` | 通过 | `/app/admin/platform/dashboard` | Dashboard、Security / Audit 正常显示 | 通过 |
| `test06` | `viewer` | 通过 | `/app/admin/platform/dashboard` | Dashboard、License & Runtime 可见；Users 路由会被重定向回 Dashboard | 通过 |

## 3. 前端用户流程验证表

| 流程 | 使用角色 | 操作步骤 | 结果 | 截图 |
|---|---|---|---|---|
| 登录页加载 | test03/test04/test05/test06 | 打开后台 URL，进入 Login 页 | 登录页可正常显示用户名、密码、Sign in | [登录页截图](screenshots/people-01-login.png) |
| people_admin 登录后默认页 | test03 | 登录后自动进入 Platform Dashboard | 页面停留 Loading，后台 `/api/license/summary` 返回 403 | [截图](screenshots/bug-people-dashboard-loading.png) |
| people_admin 进入 Users | test03 | 直接进入 `/app/admin/platform/users` | Users 页面可加载用户列表 | [截图](screenshots/people-users-page.png) |
| people_admin 点击高权限用户的 Manage organizations | test03 | Users 页面点击第一行高权限用户的 `Manage organizations` | 页面展示 `You do not have permission to perform this action.` | [截图](screenshots/bug-people-manage-organizations-drawer.png) |
| people_admin 顶部 Organization 入口 | test03 | 点击顶部 `Organization` | 自动进入其有权限的 Integration Principals 页面 | [截图](screenshots/people-organization-topnav.png) |
| platform_admin Dashboard | test04 | 登录进入 Dashboard | License status、Runtime state、公司和过期时间正常显示 | [截图](screenshots/platform-dashboard.png) |
| platform_admin SSO Settings | test04 | 进入 `/app/admin/platform/sso-settings` | 页面可显示表单，但 SAML 配置接口返回 404 | [截图](screenshots/bug-sso-settings-404.png) |
| platform_admin 组织成员页 | test04 | 进入指定组织 Members 页 | 页面显示只读状态和 `Start takeover` | [截图](screenshots/platform-org-members-before-takeover.png) |
| platform_admin 开始组织接管 | test04 | 点击 `Start takeover` | 页面切换为 `Takeover active`，显示 `End takeover` 和写入按钮 | [截图](screenshots/platform-org-members-after-takeover-click.png) |
| platform_admin 组织 Analytics | test04 | 进入组织 Analytics | Usage Analytics 正常加载，请求数、Token 趋势等可见 | [截图](screenshots/bug-org-analytics-before-or-after-takeover.png) |
| platform_admin 组织术语页 | test04 | 接管后进入组织 Terminology | 术语集列表正常显示 | [截图](screenshots/platform-org-terminology.png) |
| platform_admin 组织术语 Export | test04 | 接管后点击 Export | `/concepts/export` 返回 403，用户操作失败 | [截图](screenshots/bug-org-terminology-export.png) |
| security_admin Dashboard | test05 | 登录进入 Dashboard | Dashboard 正常显示 | [截图](screenshots/security-dashboard.png) |
| security_admin Security / Audit | test05 | 进入 Security / Audit | 审计事件列表正常显示 | [截图](screenshots/security-audit.png) |
| security_admin 访问 SSO Settings | test05 | 直接访问 SSO Settings 路由 | 被重定向回 Dashboard | [截图](screenshots/security-sso-denied-or-redirect.png) |
| viewer Dashboard | test06 | 登录进入 Dashboard | Dashboard 正常显示，只显示 Dashboard 和 License & Runtime | [截图](screenshots/viewer-dashboard.png) |
| viewer 访问 Users | test06 | 直接访问 Users 路由 | 被重定向回 Dashboard | [截图](screenshots/viewer-users-denied-or-redirect.png) |

## 4. Bug 模块

### BUG-UI-001：people_admin 登录后进入 Dashboard 卡在 Loading

| 字段 | 内容 |
|---|---|
| 模块 | 登录入口 / Platform Dashboard |
| 影响角色 | `people_admin` |
| 严重级别 | P1 |
| 测试数据 | 账号：`test03`；角色：`people_admin`；URL：`/app/admin/platform/dashboard` |
| 用户现象 | 登录成功后进入 Dashboard，但页面只显示 `Loading platform dashboard...`，用户无法看到正常 Dashboard 内容，也没有明确错误提示 |
| 技术现象 | 前端调用 `/api/license/summary` 返回 403；页面未捕获错误并展示兜底文案 |
| 截图 | ![people_admin Dashboard Loading](screenshots/bug-people-dashboard-loading.png) |

复现步骤：

1. 打开测试环境后台 URL。
2. 使用 `test03` 登录。
3. 登录成功后观察默认进入的页面。
4. 页面停留在 `Loading platform dashboard...`。

建议修复：

- `people_admin` 登录后默认跳转 `/app/admin/platform/users`，不要跳到 Dashboard。
- 或者 Dashboard 路由增加角色保护，不允许无 Runtime read 权限的角色进入。
- Dashboard 页面增加 `.catch` 错误兜底，显示“当前角色无运行概览权限”，避免无限 Loading。

### BUG-UI-002：people_admin 用户管理页暴露高权限用户操作按钮

| 字段 | 内容 |
|---|---|
| 模块 | Platform Users / 用户操作按钮权限 |
| 影响角色 | `people_admin` |
| 严重级别 | P1 |
| 测试数据 | 账号：`test03`；页面：`/app/admin/platform/users`；操作对象：列表第一行高权限用户 `FunstoryAI` |
| 用户现象 | `people_admin` 能看到高权限用户的 `Manage organizations`、`Edit user`、`Disable user`、`Remove user` 等按钮；点击后页面才提示 `You do not have permission to perform this action.` |
| 技术现象 | 点击 `Manage organizations` 后 `/api/users/{id}/organizations` 返回 403；页面同时已有 `/api/organizations` 403 |
| 截图 | ![people_admin Manage organizations 权限错误](screenshots/bug-people-manage-organizations-drawer.png) |

复现步骤：

1. 使用 `test03` 登录。
2. 进入 `/app/admin/platform/users`。
3. 找到列表中带有 `platform_admin` / `security_admin` 角色的用户，例如 `FunstoryAI`。
4. 点击该行的 `Manage organizations`。
5. 页面出现 `You do not have permission to perform this action.`。

建议修复：

- 前端按目标用户角色隐藏或禁用操作按钮：当 `people_admin` 操作对象包含 `platform_admin` 或 `security_admin` 时，不显示 `Edit`、`Manage organizations`、`Disable`、`Remove` 等会被后端拒绝的按钮。
- 若保留按钮，需要在按钮旁或弹窗内给出明确原因，例如“people_admin 不能管理 platform_admin/security_admin 用户”。
- Users 页面不要在 `people_admin` 无权限时无条件加载 `/api/organizations`；可以延迟到允许操作的用户打开抽屉时再加载。

### BUG-UI-003：SSO Settings 后台接口 404，但页面按空配置继续显示

| 字段 | 内容 |
|---|---|
| 模块 | Platform SSO Settings |
| 影响角色 | `platform_admin` |
| 严重级别 | P2 |
| 测试数据 | 账号：`test04`；页面：`/app/admin/platform/sso-settings` |
| 用户现象 | 页面能显示 SSO 表单，用户看到的是一套空配置/默认配置，但并不知道后端 SAML 配置实际读取失败或尚未初始化 |
| 技术现象 | 页面加载时 `/api/tenant/settings/saml` 返回 404；页面继续展示 SAML Provider Configuration 表单 |
| 截图 | ![SSO Settings 404](screenshots/bug-sso-settings-404.png) |

复现步骤：

1. 使用 `test04` 登录。
2. 点击平台导航中的 `SSO Settings`。
3. 打开浏览器网络请求或观察自动化记录，可看到 `/api/tenant/settings/saml` 返回 404。
4. 页面仍显示可编辑 SAML 配置表单。

建议修复：

- 后端未配置 SAML 时返回 200 和明确的空配置对象，而不是 404。
- 或前端把 404 显示成清晰状态：“尚未配置 SAML，保存后将创建配置”。
- 避免用户误以为当前配置成功读取，只是所有字段为空。

### BUG-UI-004：组织接管后术语 Export 仍失败

| 字段 | 内容 |
|---|---|
| 模块 | Organization Terminology / Export |
| 影响角色 | `platform_admin` 接管组织场景 |
| 严重级别 | P1 |
| 测试数据 | 账号：`test04`；组织：`85d45991e3b94dbcb4f99e9e393970c9`；页面：`/app/admin/org/{organization_id}/terminology`；术语集：`Codex Org Terminology 1778695094317` |
| 用户现象 | 平台管理员点击 `Start takeover` 后，页面显示 `Takeover active` 和可写状态；但在术语页点击 Export 后仍失败，用户会认为接管后的写/管理权限不完整 |
| 技术现象 | `/api/organizations/{organization_id}/terminologies/{terminology_id}/concepts/export` 返回 403 |
| 截图 | ![Organization Terminology Export 403](screenshots/bug-org-terminology-export.png) |

复现步骤：

1. 使用 `test04` 登录。
2. 进入 `/app/admin/org/85d45991e3b94dbcb4f99e9e393970c9/members`。
3. 点击 `Start takeover`，确认页面显示 `Takeover active`。
4. 进入组织导航的 `Terminology`。
5. 选择一个组织术语集，点击 `Export`。
6. 导出请求返回 403，导出失败。

建议修复：

- 若产品预期接管后可完整管理组织术语，应让术语 import/export 接口允许 platform takeover。
- 若产品预期接管不包含 import/export，前端应在接管状态下隐藏或禁用 Export/Import，并显示“需要组织 terminology_admin 权限”的明确说明。

## 5. 通过项说明

| 模块 | 验证结果 | 说明 |
|---|---:|---|
| 登录页 | 通过 | 用户名、密码输入框和 Sign in 按钮正常显示 |
| platform_admin Dashboard | 通过 | License status、Runtime state、Licensed company、Expires 均正常显示 |
| platform_admin 组织接管 | 通过 | Start takeover 后页面切换到 Takeover active，写操作入口出现 |
| platform_admin 组织 Analytics | 通过 | Usage Analytics 能展示请求数、成功数、Token、趋势表格 |
| security_admin Dashboard | 通过 | Dashboard 正常显示 |
| security_admin Security / Audit | 通过 | 审计事件列表正常显示 |
| security_admin 访问 SSO Settings | 通过 | 前端路由重定向回 Dashboard，未暴露无权限页面 |
| viewer Dashboard | 通过 | 只显示 Dashboard、License & Runtime 等观测入口 |
| viewer 访问 Users | 通过 | 前端路由重定向回 Dashboard |
| people_admin Organization 顶部入口 | 通过 | 顶部 Organization 最终进入其有权限的 Integration Principals 页面 |

## 6. 测试过程数据

| 数据项 | 值 |
|---|---|
| 测试组织 ID | `85d45991e3b94dbcb4f99e9e393970c9` |
| people_admin 自有组织 ID | `25e011b0672a4184a0ce7423e21986ff` |
| 主要截图目录 | `test-reports/imt-private-console-ui/screenshots/` |
| 自动化结果 JSON | `test-reports/imt-private-console-ui/ui-flow-results.json` |
| people_admin 管理组织抽屉结果 JSON | `test-reports/imt-private-console-ui/people-manage-org-result.json` |

## 7. 建议回归顺序

1. 修复 `people_admin` 默认入口，回归 test03 登录后是否直接进入 Users。
2. 修复 Users 页面高权限用户操作按钮展示逻辑，回归 test03 是否不再看到不可执行按钮。
3. 修复 SSO Settings 404 语义，回归 test04 打开 SSO Settings 是否有明确“未配置/已读取”状态。
4. 明确组织接管与术语 import/export 的权限边界，回归 test04 接管后 Export 是否成功，或按钮是否被明确禁用。
5. 重新跑 viewer/security_admin 访问受限路由，确认仍会被正确重定向。
