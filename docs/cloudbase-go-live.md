# CloudBase 直接上线（微信小程序 + Next API）

本文把「本地能跑」推进到「可提交审核 / 发布」。**不把密钥写进 git**；不在文档里替你购买资源——需要付费的步骤请你在腾讯云 / CloudBase / 微信控制台自行确认费用后再点。

图例：

| 标记 | 含义 |
| --- | --- |
| **「你点控制台」** | 需登录你的账号、可能产生费用、或涉及密钥；工程师无法代登 |
| **「工程师可代做」** | 仓库内配置、镜像构建、迁移命令、文档与脚本；不接触你的云账号密钥即可协助 |

---

## 0. 前置检查（清单）

- [ ] 小程序 AppID 已有：`wx6f03736d4996c4e4`（见 `apps/miniapp/project.config.json`）
- [ ] 能登录 [微信公众平台](https://mp.weixin.qq.com)（管理员）
- [ ] 能登录 [腾讯云 / CloudBase 控制台](https://tcb.cloud.tencent.com/)（同一主体更省事）
- [ ] 已准备好 **DeepSeek API Key**、随机高强度 **JWT_SECRET**（本地生成，勿提交）
- [ ] 本仓库已含：`Dockerfile`、`cloudbaserc.json`（占位）、`.env.production.example`、`docs/cloudbase-go-live.md`

生成 JWT 示例（本机，勿提交输出）：

```bash
openssl rand -base64 48
```

---

## 1. 复用现有 CloudBase 环境、云托管和 PostgreSQL

**「你点控制台」**

1. 继续使用现有环境 `littlemo-d2gy2ec0dd102163` 和 PostgreSQL 共享集群；**不升级套餐、不买独立数据库、不配置公网 IP/端口**。
2. 复用现有 CloudRun 服务 `littlemo-api`（Dockerfile 监听 `3000`）。当前服务暂停时，本地代码准备好后再由你决定何时恢复/部署。
3. 后端数据库连接改用 CloudBase PostgreSQL SDK `app.rdb()`，访问走 CloudBase API，不再让 CloudRun 直连 `localhost` 或 TCP 地址。

**「工程师可代做」**

- 解释字段、检查 `Dockerfile` / `next.config.ts` 的 `output: 'standalone'`。
- `cloudbaserc.json` 和生产构建示例已填入截图可确认的环境 ID；密钥仍只放 CloudRun 密钥配置中，不写入仓库。

### 如何填写 `cloudbaserc.json`

仓库骨架：

```json
"envId": "YOUR_CLOUDBASE_ENV_ID"
```

`envId` 已填为当前环境。敏感变量（`CLOUDBASE_APIKEY`、`JWT_SECRET`、`DEEPSEEK_API_KEY`）**不要**写进 `cloudbaserc.json` 再提交；只在云托管「环境变量 / 密钥」面板配置。

本地若安装了 CloudBase CLI，可用（需你登录，**可能触发账号交互**，工程师默认只文档化）：

```bash
# 你本机登录后（文档说明，默认不代跑付费/登录）
# tcb login
# 按控制台指引部署容器服务；或控制台手动「上传镜像 / 代码包」
```

---

## 2. 配置生产环境变量

**「你点控制台」**（云托管 → 服务 → 环境变量 / 密钥管理）

对照根目录 `.env.production.example`。复用当前资源与已有模型密钥，不新增数据库实例或付费套餐：

| 变量 | 生产值注意 |
| --- | --- |
| `CLOUDBASE_APIKEY` | CloudBase PostgreSQL 后端 API Key（`service_role`），仅存云托管密钥；**绝不放入小程序**。服务端现有 API 会继续验证业务 JWT 并按当前用户 ID 过滤数据 |
| `CLOUDBASE_ENV_ID` | 已有环境 ID：`littlemo-d2gy2ec0dd102163` |
| `DATABASE_URL` | **删除旧值**；生产运行不再使用数据库 TCP 连接串 |
| `JWT_SECRET` | 高强度随机串 |
| `DEEPSEEK_API_KEY` | DeepSeek 控制台 |
| `DEEPSEEK_MODEL` | `deepseek-flash` |
| `LEGAL_OPERATOR_NAME` / `LEGAL_PRIVACY_CONTACT` | 小程序展示的运营主体及个人信息保护联系渠道 |
| `LEGAL_COMPLAINT_CONTACT` / `LEGAL_COMPLAINT_RESPONSE_TIME` | 用户投诉举报入口及承诺反馈时限 |
| `LEGAL_AGE_SCOPE` | 当前客户端仅支持成人服务范围 `仅限年满18周岁`；未成年人开放前需要先实现对应模式和保护流程 |
| `LEGAL_STORAGE_REGION` / `LEGAL_RETENTION_DESCRIPTION` | 真实数据库地域、云端记录及备份/日志的保存规则 |
| `MINIPROGRAM_FILING_NO` | 微信小程序备案编号；完成备案后填入 |
| `DEEPSEEK_SERVICE_FILING_NO` / `DEEPSEEK_ALGORITHM_FILING_NO` | 经核实的模型服务与算法备案信息；确不适用时也需先核实再说明 |
| `DEEPSEEK_DATA_HANDLING` / `DEEPSEEK_DATA_REGION` | 当前 API 合同下的留存、模型优化用途和处理地点，不能照抄面向消费者的默认政策 |

可选：`CORS_ORIGINS`（仅当还有 Taro H5 调该 API 时）。

**「工程师可代做」**：核对变量名是否与代码一致；协助用 `.env.production.example` 做检查清单（仍由你粘贴真实值到控制台）。

---

## 3. 数据表和迁移状态

现有 PostgreSQL 表和已完成的迁移保留，无需重建。共享集群没有可供本方案使用的公网 PostgreSQL TCP 地址，因此生产环境不再运行 `prisma migrate deploy`。

后续若确实新增表结构，先在 `cloudbase/migrations/` 维护对应 SQL，再通过 CloudBase PostgreSQL SQL 编辑器按顺序应用并验证；本次不新增迁移，也不触碰现有数据。

---

## 4. 构建并部署 Next API（云托管）

**「工程师可代做」**：确认镜像可构建。

```bash
docker build -t littlemo-api .
# 本地冒烟（把生产变量放本机未跟踪文件，例如 .env.production）
# docker run --rm -p 3000:3000 --env-file .env.production littlemo-api
```

**「你点控制台」**：把镜像推到云托管所用仓库，或上传含 `Dockerfile` 的代码包，创建/更新服务，监听端口 **3000**，配置好上一节环境变量后发布版本。

Standalone 启动命令已在镜像内：`node server.js`（`HOSTNAME=0.0.0.0`，`PORT=3000`）。

---

## 5. 云托管访问方式

**「你点控制台」**

微信小程序生产版使用 `@cloudbase/js-sdk` 初始化独立 CloudBase 环境，再以 `app.callContainer()` 调用 `littlemo-api`，不需要把自定义域名接入本版本链路。客户端先以 `auth.signInWithOpenId({ useWxCloud: false })` 建立 CloudBase 身份；云托管服务端通过 CloudBase SDK 读取当前调用者身份，不读取或信任客户端上传的 `openid` / `userId`，登录接口再签发现有业务 JWT。

CloudRun 服务端用专属 CloudBase 后端 API Key 调用 PostgreSQL SDK。该 Key 对应服务端高权限角色并绕过表 RLS，必须只存在于 `littlemo-api` 云托管环境变量中；应用 API 仍验证业务 JWT，并把读写条件限定为登录用户的数据。小程序包内不包含该 Key。

如需 Taro H5 或外部系统联调，再按控制台要求绑定 HTTPS 域名，并将源配置到 `CORS_ORIGINS` / `API_BASE_URL`。

健康检查建议：

```bash
curl -sS https://云托管地址/api/health
# 预期：{"status":"ok","service":"littlemo-api",...}
curl -sS https://云托管地址/api/health/database
# 预期：通过 RDB SDK 只读检查时返回 200；未连通时返回 503，不泄漏密钥
```

---

## 6. 微信小程序后台：确认 CloudBase 关联

**「你点控制台」**（[mp.weixin.qq.com](https://mp.weixin.qq.com) / CloudBase 控制台）

- 确认小程序 AppID 已关联现有 CloudBase 环境。
- 确认云托管服务名为 `littlemo-api`，服务端口为 `3000`。
- 在 CloudBase 云托管 / HTTP 网关的访问配置中开启官方身份认证，并确认认证请求会注入 `x-cloudbase-context`；不要让业务服务存在可绕过认证网关的公网直达入口。后端只从这个当前请求上下文建立业务用户身份，不接受客户端 body/header 自报的 `uid`、`openid`。
- 在控制台配置小程序用户隐私保护指引，准确覆盖微信身份标识、可选昵称/头像、主动选取的照片/相机、账号云端对话与日记，以及向 DeepSeek API 发送文字和上下文的用途；头像会上传云端，聊天原图留在本机。提审时同步勾选实际处理的信息类型。
- 小程序登录前有服务协议/隐私政策同意和情绪心理类敏感个人信息单独同意；首次 AI 请求另行取得 AI 数据处理同意。隐私中心有数据副本导出、分别撤回敏感信息/AI 同意、账号注销删除、投诉联系方式和紧急求助入口。正式上传前需完成占位字段、年龄/监护人/紧急联系人策略、模型备案号、DeepSeek API 合同与数据区域核实。
- 本版本的小程序 API 走 `callContainer`，不要求把 `littlemo.icu` 或自定义 API 域名写入 `request 合法域名`。

---

## 7. 小程序：配置 CloudBase 环境 → 构建 → 上传 → 审核 → 发布

**「工程师可代做」**（构建）：

```bash
# 方式 A：脚本（推荐）
cp apps/miniapp/.env.production.example apps/miniapp/.env.production  # 本机未跟踪文件，只放公开说明，不放服务密钥
# 编辑该文件填完 LEGAL_* / DEEPSEEK_* 公开说明及真实 CloudBase envId，然后在当前 shell 导入：
set -a
source apps/miniapp/.env.production
set +a
./scripts/build-miniapp-prod.sh

# 方式 B：手动
cd apps/miniapp
cp .env.production.example .env   # 编辑 CLOUDBASE_ENV_ID=…
# 本地/H5 才需要 export API_BASE_URL=https://…
npm run build:weapp
```

说明：

- 微信生产构建只注入公开的 `CLOUDBASE_ENV_ID` / `CLOUDBASE_SERVICE_NAME`；本地/H5 可额外使用公开的 `API_BASE_URL`，生产微信小程序不得 fallback 到它。**禁止**把 `JWT_SECRET` / `DEEPSEEK_API_KEY` 放进 `apps/miniapp`。
- `apps/miniapp/.env.production` 仅用于生产构建的公开信息。此文件不会提交到仓库；运营主体、年龄策略、备案、处理区域、保存期限、投诉渠道以及 DeepSeek API 数据规则必须与云托管环境变量逐项一致。`scripts/check-legal-config.sh` 会拒绝空值和占位符。
- 登录页和阅读页启动时还会从后端 `/api/legal` 读取同一组公开字段；如果云托管服务未运行、后端仍是占位值，注册仍会被前后端共同拦截。改完云托管环境变量后，先确认 `/api/legal` 可读，再重新上传经过生产检查的小程序包。
- 本地开发仍可用 `apps/miniapp/.env.example` 的 `http://127.0.0.1:3000`，并在开发者工具关闭域名校验。

**「你点控制台 / 你本机微信开发者工具」**：

1. 用微信开发者工具打开 `apps/miniapp`（`miniprogramRoot` = `dist/`）。
2. 正式上传前再次确认 `project.config.json` → `setting.urlCheck` 为 **`true`**，并确认开发者工具中的「不校验合法域名」已关闭。
3. **上传**代码 → 登录小程序后台 **提交审核** → 通过后 **发布**。

---

## 8. 上线后冒烟

- 真机预览 / 体验版：登录（CloudBase 身份认证）、发一条陪伴消息、结束一段日记、看日历/阶段是否落库。
- 若曾用本机日记：参考根 `README.md`「把本机日记升到云端」。

---

## 角色速查

| 步骤 | 谁做 |
| --- | --- |
| 开 CloudBase 环境 / 云托管 / PostgreSQL（可能产生费用） | **你点控制台** |
| 填 `envId`、环境变量真实值 | **你点控制台**（工程师可代改占位符结构） |
| 现有表迁移 | 已完成；不需再次执行。未来 SQL 变更在 CloudBase PG 控制台应用 |
| `docker build` / 检查 Dockerfile、standalone | **工程师可代做** |
| 推镜像 / 点「发布」服务 | **你点控制台**（或你登录 CLI） |
| 绑域名、配证书、备案 | **你点控制台** |
| 微信合法域名、AppSecret | **你点控制台** |
| `build:weapp` / `scripts/build-miniapp-prod.sh` | **工程师可代做** |
| 上传、提交审核、发布小程序 | **你**（微信开发者工具 + MP 后台） |

---

## 相关文件

| 文件 | 用途 |
| --- | --- |
| `Dockerfile` | Next standalone 生产镜像 |
| `next.config.ts` | `output: 'standalone'` |
| `cloudbaserc.json` | CloudBase Framework 骨架；`envId` 需你替换 |
| `.env.production.example` | 服务端生产变量清单（无密钥） |
| `apps/miniapp/.env.production.example` | CloudBase 环境 ID + 服务名 |
| `scripts/build-miniapp-prod.sh` | 校验 CloudBase 环境 ID 后 `build:weapp` |
