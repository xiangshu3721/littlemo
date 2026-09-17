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

## 1. 创建 CloudBase 环境 + 云托管 + PostgreSQL

**「你点控制台」**

1. 打开 CloudBase 控制台 → **新建环境**（记下 **环境 ID / envId**，形如 `littlemo-xxxxxx`）。
2. 在同一环境（或腾讯云）开通：
   - **云托管（容器）**：用来跑本仓库的 Next.js API（`Dockerfile` → 端口 `3000`）。
   - **云数据库 PostgreSQL**（或「腾讯云 PostgreSQL」独立实例）：记下连接串，填入 `DATABASE_URL`（生产建议 `sslmode=require`）。
3. 云托管创建服务时可选「从代码包 / Dockerfile 构建」。本仓库根目录已有 `Dockerfile`（`output: 'standalone'`）。

**「工程师可代做」**

- 解释字段、检查 `Dockerfile` / `next.config.ts` 的 `output: 'standalone'`。
- 把 `cloudbaserc.json` 里的 `envId` 从占位符改成你的真实 envId（**由你提供字符串**；不要把密钥写进仓库）。

### 如何填写 `cloudbaserc.json`

仓库骨架：

```json
"envId": "YOUR_CLOUDBASE_ENV_ID"
```

把 `YOUR_CLOUDBASE_ENV_ID` 换成控制台里的环境 ID。敏感变量（`DATABASE_URL`、`JWT_SECRET`、`DEEPSEEK_API_KEY`）**不要**写进 `cloudbaserc.json` 再提交；在云托管「环境变量 / 密钥」面板配置。

本地若安装了 CloudBase CLI，可用（需你登录，**可能触发账号交互**，工程师默认只文档化）：

```bash
# 你本机登录后（文档说明，默认不代跑付费/登录）
# tcb login
# 按控制台指引部署容器服务；或控制台手动「上传镜像 / 代码包」
```

---

## 2. 配置生产环境变量

**「你点控制台」**（云托管 → 服务 → 环境变量 / 密钥管理）

对照根目录 `.env.production.example`：

| 变量 | 生产值注意 |
| --- | --- |
| `DATABASE_URL` | 云 PostgreSQL 连接串 |
| `JWT_SECRET` | 高强度随机串 |
| `DEEPSEEK_API_KEY` | DeepSeek 控制台 |
| `DEEPSEEK_MODEL` | 如 `deepseek-chat` |

可选：`CORS_ORIGINS`（仅当还有 Taro H5 调该 API 时）。

**「工程师可代做」**：核对变量名是否与代码一致；协助用 `.env.production.example` 做检查清单（仍由你粘贴真实值到控制台）。

---

## 3. 执行数据库迁移（migrate deploy）

**「工程师可代做」**（在你提供只读/迁移用的 `DATABASE_URL` 的前提下，于本机一次性执行；或 **「你点控制台」** 用云托管「任务 / 一次性命令」）：

```bash
# 在仓库根目录；DATABASE_URL 仅放本机临时环境，勿写入 git
export DATABASE_URL='postgresql://…'   # 你提供
npm install
npm run db:deploy
# 等价：npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

确认 `packages/db/prisma/migrations/` 下迁移已应用到生产库后再切流量。

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

如需 Taro H5 或外部系统联调，再按控制台要求绑定 HTTPS 域名，并将源配置到 `CORS_ORIGINS` / `API_BASE_URL`。

健康检查建议：

```bash
curl -sS https://云托管地址/api/health
# 预期：{"status":"ok","service":"littlemo-api",...}
curl -sS https://云托管地址/api/health/database
# 预期：数据库可用时返回 200；未连通时返回 503，不泄漏连接串
```

---

## 6. 微信小程序后台：确认 CloudBase 关联

**「你点控制台」**（[mp.weixin.qq.com](https://mp.weixin.qq.com) / CloudBase 控制台）

- 确认小程序 AppID 已关联现有 CloudBase 环境。
- 确认云托管服务名为 `littlemo-api`，服务端口为 `3000`。
- 在 CloudBase 云托管 / HTTP 网关的访问配置中开启官方身份认证，并确认认证请求会注入 `x-cloudbase-context`；不要让业务服务存在可绕过认证网关的公网直达入口。后端只从这个当前请求上下文建立业务用户身份，不接受客户端 body/header 自报的 `uid`、`openid`。
- 先在控制台配置小程序用户隐私保护指引，至少覆盖微信昵称/头像、选中的照片或视频、账号云端存储的对话与日记，以及发送给 DeepSeek 的处理用途；提审时同步勾选实际收集的个人信息类型。
- 本版本的小程序 API 走 `callContainer`，不要求把 `littlemo.icu` 或自定义 API 域名写入 `request 合法域名`。
- 云托管环境变量增加 `WECHAT_APPID`（可与小程序 AppID 相同）和 `WECHAT_APPSECRET`（微信公众平台 → 开发 → 开发管理 → AppSecret）。聊天和昵称会走 `msgSecCheck`；不配则跳过检查，**提审很容易因 UGC 无内容安全被拒**。
- 服务类目不要选医疗/心理治疗。建议「工具」或生活记录类目，并与简介一致：情绪记录与文字陪伴，不是咨询或诊疗。
- 提审说明里写清：可先浏览日记/洞察，进入后才写记录；「我的」可退出和注销账号。

---

## 7. 小程序：配置 CloudBase 环境 → 构建 → 上传 → 审核 → 发布

**「工程师可代做」**（构建）：

```bash
# 方式 A：脚本（推荐）
CLOUDBASE_ENV_ID=你的现有环境ID CLOUDBASE_SERVICE_NAME=littlemo-api ./scripts/build-miniapp-prod.sh

# 方式 B：手动
cd apps/miniapp
cp .env.production.example .env   # 编辑 CLOUDBASE_ENV_ID=…
# 本地/H5 才需要 export API_BASE_URL=https://…
npm run build:weapp
```

说明：

- 微信生产构建只注入公开的 `CLOUDBASE_ENV_ID` / `CLOUDBASE_SERVICE_NAME`；本地/H5 可额外使用公开的 `API_BASE_URL`，生产微信小程序不得 fallback 到它。**禁止**把 `JWT_SECRET` / `DEEPSEEK_API_KEY` 放进 `apps/miniapp`。
- 本地开发仍可用 `apps/miniapp/.env.example` 的 `http://127.0.0.1:3000`，并在开发者工具关闭域名校验。

**「你点控制台 / 你本机微信开发者工具」**：

1. 用微信开发者工具打开 `apps/miniapp`（`miniprogramRoot` = `dist/`）。
2. **正式上传前**把 `project.config.json` → `setting.urlCheck` 设为 **`true`**（仓库默认本地为 `false` 方便调试；发布构建请打开校验）。也可在工具里确认「不校验合法域名」已关闭。
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
| `prisma migrate deploy` | 工程师可代做（需你给 `DATABASE_URL`）或你在控制台跑任务 |
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
