# 有点情绪

记下这一刻的情绪。网页版像聊天一样记下这一刻，记录默认存在这台设备的浏览器里。微信小程序把陪伴对话、情绪日记和阶段洞察放到云端（PostgreSQL）：点「就聊到这」后走 `/api/analyze`，日历和阶段规律走 `/api/period`，段落元数据走 `/api/diary`。AI 走 DeepSeek，密钥只放在服务器。

**小程序范围：陪伴聊天 + 情绪日记（日历、深度洞察、周/月/90天规律）。** 网页版另有个人资料、设置和回收站页。

## 仓库结构

现有 Next.js 网页留在仓库根目录（最少挪动，避免拆坏当前 App Router）。小程序和数据库作为同仓包：

```
.
├── src/                  # Next.js 网页（IndexedDB 本地优先）
├── src/app/api/          # 共享 HTTP API（网页 + 小程序）
├── apps/miniapp/         # Taro 3 + React + TypeScript 微信小程序
└── packages/db/          # Prisma schema + PostgreSQL 迁移
```

没有把网页搬进 `apps/web`：根目录已经是可运行的 Next 应用，搬迁收益小、风险大。`packages/db` 通过 npm workspaces 挂到根应用；小程序是独立包（自己的 React 18），避免和网页的 React 19 抢版本。

## Prisma 模型

见 `packages/db/prisma/schema.prisma`，迁移 SQL 在 `packages/db/prisma/migrations/`。

| Model | 用途 |
| --- | --- |
| `User` | `openid` 唯一；可选 `unionid` / 昵称 / 头像 |
| `Note` | `userId` + `content`；可选 `clientId` 做幂等；`deletedAt` 软删 |
| `ChatMessage` | `userId` + `role` + `content`；可选 `model`、`sessionId`、`clientId` |
| `DiarySession` | 情绪日记段落：标题、结束时间、深度洞察 JSON、软删 |
| `PeriodReport` | 周 / 月 / 90 天规律，按 `userId + periodId` 唯一 |

网页洞察数据仍在浏览器 IndexedDB，不写入这些表。已登录小程序以数据库为准，本机 `littlemo.diary.<userId>` 只做缓存。

## 环境变量

复制根目录示例，**不要提交真实密钥**：

```bash
cp .env.example .env.local
# Prisma CLI 读 .env（不是 .env.local）
cp .env.example .env
```

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `JWT_SECRET` | 登录 JWT。生产必填 |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | 服务端模型。小程序代码里不得出现 |
| `CORS_ORIGINS` | 可选。Taro H5 跨域白名单 |

小程序本地/H5 构建可以使用公开的 `API_BASE_URL`；微信生产构建使用 `CLOUDBASE_ENV_ID` + `CLOUDBASE_SERVICE_NAME`，通过 CloudBase `callContainer` 调用云托管，不把公网 API 根地址写进正式小程序链路。

## 本地运行：网页 / API

需要本机 PostgreSQL（库名可自定，和 `DATABASE_URL` 一致）：

```bash
npm install
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npm run dev
```

打开 http://localhost:3000 ，用手机宽度看网页最准。没有 DeepSeek Key 时网页仍可记录；分析/陪伴会提示失败。

登录必须来自 CloudBase 已认证请求；服务端据此签发 Littlemo JWT。之后请求带 `Authorization: Bearer <token>`：

- `GET /api/me`；`PATCH /api/me` `{ "avatar": "data:image/jpeg;base64,…" }`（头像 data URL，需登录）；`DELETE /api/me` 注销并删除该用户云端数据
- `POST /api/feedback` `{ "kind": "report"|"complaint", "content": "…" }` 投诉与举报
- `GET` / `POST` / `PATCH` / `DELETE /api/notes`（`PATCH`/`DELETE` 也可用 `/api/notes/:id`）
- `GET /api/chat` 历史；`POST /api/chat` `{ "content": "…", "sessionId": "d…", "clientId": "d…" }` 或 `{ "messages": […] }` → DeepSeek 陪伴回复并落库
- `GET` / `POST /api/diary` 情绪日记段落、归属消息、阶段洞察（登录用户的云端源）
- 已登录时 `POST /api/analyze` `{ "lines": […], "sessionId": "d…" }`、`POST /api/period` `{ "periodId": "week-…" }` 会把结果写入对应段落 / 阶段行

未带 JWT 的 `POST /api/chat` 仍是网页教练接口（返回 `turn` JSON），行为与以前一致。

## 本地运行：小程序

另开终端。小程序不进根 workspaces，请在包内安装：

```bash
cd apps/miniapp
cp .env.example .env   # API_BASE_URL=http://127.0.0.1:3000
npm install
npm run build:weapp
# 开发监听：npm run dev:weapp
```

用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)打开 `apps/miniapp`，导入后编译 `dist/`。本地请关闭「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

H5 调试（可选）：`npm run dev:h5`，并在 API 的 `CORS_ORIGINS` 里放上 H5 源。

## 微信合法域名

微信生产版通过 CloudBase `callContainer` 访问云托管；按 CloudBase/微信控制台要求完成环境关联与服务配置即可，不再把 `littlemo.icu` 或自定义 API 域名作为本版本的前置条件。若另行构建 Taro H5，才需要为 H5 配置 `API_BASE_URL` 和 CORS。

登录由 CloudBase `signInWithOpenId({ useWxCloud: false })` 建立身份，再由服务端签发 Littlemo JWT。

## 生产上线（CloudBase）

AppID 已是 `wx6f03736d4996c4e4`。把 Next API 放到 CloudBase 云托管 + PostgreSQL、关联小程序环境并上传小程序的步骤见：

**[docs/cloudbase-go-live.md](docs/cloudbase-go-live.md)**（中文逐步清单；区分「你点控制台」与「工程师可代做」）。

相关脚手架：`Dockerfile`（`output: 'standalone'`）、`cloudbaserc.json`（填真实 `envId`）、`.env.production.example`、`apps/miniapp/.env.production.example`、`scripts/build-miniapp-prod.sh`。密钥只放控制台 / 本机未跟踪文件，勿提交。

上线后网页和小程序都走 `/api/chat`、`/api/analyze`、`/api/period`；小程序通过 CloudBase `callContainer` 调用，登录、资料、笔记、日记段落和阶段洞察走现有接口；本机存储只做离线缓存。

### 把本机日记升到云端（一次）

上线前如果有人已经在小程序里记下过本机日记（`littlemo.diary.<userId>`）：

1. 用同一个微信账号登录。
2. 打开「有点情绪」或「情绪日记」。客户端会 `GET /api/diary`；若云端还没有段落，就把本机 sessions / messages / reports 上传一次。
3. 之后以数据库为准。清掉小程序缓存再登录，日记会从 `/api/diary` 拉回来。
4. 开发者也可手动：登录拿到 JWT 后 `POST /api/diary`，body 为 `{ "sessions": […], "messages": […], "reports": […] }`。已有 `ChatMessage` 会按 id / clientId / 相近原文匹配，不会故意复制一份平行记录。

不是完整离线 CRDT：以云端最后一次成功写入为准。

安全说明见 `SECURITY.md`。
