# 碎碎念

情绪碎碎念网页版。像聊天一样记下这一刻，记录存在这台设备的浏览器里。AI 分析走 DeepSeek，密钥在服务端。

## 本地运行

```bash
cp .env.example .env.local
# 填入 DEEPSEEK_API_KEY
npm install
npm run dev
```

打开 http://localhost:3000 ，用手机宽度看最准。没有 Key 时仍可记录，分析会提示失败。密钥只放在服务器，不要写进前端。

之后 Key 放到腾讯云时，保持 `/api/chat`、`/api/analyze` 和 `/api/period` 这三个接口即可。

安全说明见 `SECURITY.md`。
