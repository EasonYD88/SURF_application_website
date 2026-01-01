# 后端服务器配置说明

## 功能概述

这个后端服务器提供以下功能：

1. **文件上传** - 上传文件到本地服务器或Google Drive
2. **Gmail集成** - 通过Gmail API发送邮件、检查回复、追踪邮件状态
3. **自动提醒** - 定时检查未回复的邮件，发送follow-up提醒

## Google OAuth 配置

### 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用以下API：
   - Gmail API: https://console.cloud.google.com/flows/enableapi?apiid=gmail.googleapis.com
   - Google Drive API: https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com

### 2. 配置OAuth同意屏幕

1. 在Cloud Console中，进入 "APIs & Services" > "OAuth consent screen"
2. 选择应用类型（Internal或External）
3. 填写应用信息：
   - 应用名称
   - 用户支持电子邮件
   - 开发者联系信息

### 3. 创建OAuth凭据

1. 进入 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "OAuth 2.0 Client ID"
3. 选择应用类型为 "Desktop app"
4. 下载 `credentials.json` 文件
5. 将 `credentials.json` 文件放在 `server/` 目录下

**注意**: 不要将 `credentials.json` 提交到Git仓库！

### 4. 所需的OAuth权限范围

在OAuth同意屏幕中添加以下scopes：

- `https://www.googleapis.com/auth/gmail.send` - 发送邮件
- `https://www.googleapis.com/auth/gmail.readonly` - 读取邮件（检查回复）
- `https://www.googleapis.com/auth/drive.file` - 上传文件到Drive

### 5. 首次运行授权

首次启动服务器时，系统会自动打开浏览器窗口，要求你授权应用访问Gmail和Drive。
授权成功后，会生成 `token.json` 文件保存访问令牌。

## 安装依赖

```bash
npm install express cors multer googleapis @google-cloud/local-auth google-auth-library nodemailer node-cron
```

## 启动服务器

```bash
npm run server
```

服务器将在 `http://localhost:3001` 上运行。

## API端点

### POST /upload
上传文件到本地服务器

**请求**: `multipart/form-data` with `file` field  
**响应**: `{ link: "http://localhost:3001/uploads/filename.ext" }`

### POST /upload-drive
上传文件到Google Drive并获取共享链接

**请求**: `multipart/form-data` with `file` field  
**响应**: `{ link: "https://drive.google.com/file/d/..." }`

### POST /send-email
发送邮件

**请求**:
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "body": "Email body content"
}
```

**响应**:
```json
{
  "success": true,
  "messageId": "...",
  "threadId": "..."
}
```

### GET /check-replies/:threadId
检查指定thread中的回复

**响应**:
```json
{
  "replies": [
    {
      "id": "messageId",
      "snippet": "Message preview...",
      "date": "timestamp"
    }
  ]
}
```

## 自动提醒功能

服务器会在每天上午9点自动运行cron任务，检查未回复的邮件并发送follow-up提醒。你可以在 `server.js` 中修改cron表达式来调整时间。

## 文件结构

```
server/
├── server.js           # 主服务器文件
├── credentials.json    # Google OAuth凭据（需要自己创建）
├── token.json         # OAuth访问令牌（首次授权后自动生成）
├── uploads/           # 本地上传文件存储目录
└── README.md          # 本文档
```

## 安全注意事项

1. **不要提交敏感文件**: 
   - 将 `credentials.json` 和 `token.json` 添加到 `.gitignore`
   - 不要分享这些文件

2. **生产环境建议**:
   - 使用环境变量存储敏感信息
   - 使用HTTPS
   - 实现适当的身份验证和授权
   - 使用数据库存储邮件追踪信息
   - 设置速率限制

3. **API配额**: 
   - Gmail API有使用配额限制
   - 监控使用情况，避免超出配额

## 故障排除

### 错误: "invalid_grant"
- OAuth token已过期或被撤销
- 删除 `token.json` 并重新授权

### 错误: "insufficient authentication scopes"
- OAuth应用需要额外的权限
- 在OAuth同意屏幕中添加所需的scopes
- 删除 `token.json` 并重新授权

### 邮件发送失败
- 检查Gmail API是否已启用
- 确认OAuth权限包含 `gmail.send`
- 检查收件人邮箱地址是否正确

## 扩展功能建议

1. **数据库集成**: 使用MongoDB或SQLite存储邮件追踪数据
2. **推荐信追踪**: 为推荐信请求添加专门的追踪表
3. **邮件模板**: 创建可重用的邮件模板
4. **批量发送**: 实现批量邮件发送功能
5. **高级提醒**: 根据不同场景设置不同的提醒规则
