# 有点情绪

记下这一刻的情绪。网页版像聊天一样记下这一刻，记录默认存在这台设备的浏览器里。微信小程序 V1 把同一条时间线放到云端：用户气泡是笔记，助手气泡是陪伴回复。AI 走 DeepSeek，密钥只放在服务器。

**小程序 V1 范围：陪伴聊天 + 笔记 CRUD。没有情绪洞察、周报、分析页，也不会调用 `/api/analyze` 或 `/api/period`。** 网页版仍保留这些能力。

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
| `ChatMessage` | `userId` + `role` + `content`；可选 `model` |

网页洞察数据仍在浏览器 IndexedDB，不写入这些表。

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
| `WECHAT_APPID` / `WECHAT_SECRET` | 小程序 jscode2session |
| `JWT_SECRET` | 登录 JWT。生产必填 |
| `WECHAT_MOCK` | `1` 时不调微信，任意非空 `code` 会创建/复用用户 |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | 服务端模型。小程序代码里不得出现 |
| `CORS_ORIGINS` | 可选。Taro H5 跨域白名单 |

小程序构建期只允许公开的 API 根地址，见 `apps/miniapp/.env.example` 的 `API_BASE_URL`。

## 本地运行：网页 / API

需要本机 PostgreSQL（库名可自定，和 `DATABASE_URL` 一致）：

```bash
npm install
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npm run dev
```

打开 http://localhost:3000 ，用手机宽度看网页最准。没有 DeepSeek Key 时网页仍可记录；分析/陪伴会提示失败。

### Mock 微信登录（无需 AppId）

`.env.local` 设 `WECHAT_MOCK=1`。任意 code 都能换 JWT：

```bash
curl -s -X POST http://localhost:3000/api/auth/wechat \
  -H 'Content-Type: application/json' \
  -d '{"code":"dev-user-1"}'
```

之后请求带 `Authorization: Bearer <token>`：

- `GET /api/me`
- `GET` / `POST` / `PATCH` / `DELETE /api/notes`（`PATCH`/`DELETE` 也可用 `/api/notes/:id`）
- `GET /api/chat` 历史；`POST /api/chat` `{ "content": "…" }` 或 `{ "messages": […] }` → DeepSeek 陪伴回复并落库

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

真机 / 正式版必须在[小程序后台](https://mp.weixin.qq.com)配置 **request 合法域名**（https，备案，不要带路径），例如 `https://your-api.example.com`。把 `API_BASE_URL` 建成这个源再 `npm run build:weapp`。

登录用 `wx.login` 的 `code` 换服务端 JWT；`session_key` 永不下发到客户端。

## 下一步（真实环境）

1. 申请小程序 AppId，填入 `WECHAT_APPID` / `WECHAT_SECRET`，关掉 `WECHAT_MOCK`。
2. 准备 PostgreSQL，执行 `npx prisma migrate deploy --schema packages/db/prisma/schema.prisma`。
3. 设置高强度 `JWT_SECRET` 和服务器上的 `DEEPSEEK_API_KEY`。
4. 配置合法域名与 HTTPS；不要把任何密钥写进 `apps/miniapp`。

之后 Key 放到腾讯云时，网页仍走 `/api/chat`、`/api/analyze`、`/api/period`。小程序只走登录、资料、笔记和陪伴聊天。

安全说明见 `SECURITY.md`。
