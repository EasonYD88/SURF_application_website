# Summer Research Application Tracker

这是一个用于跟踪暑期研究申请项目的React应用，集成了Gmail API和Google Drive，支持邮件追踪和文件管理。

## ✨ 主要功能

- 📊 **项目管理** - 追踪所有申请项目的状态、截止日期和优先级
- 📧 **邮件集成** - 通过Gmail API发送邮件、检查回复、自动提醒
- 📁 **文件管理** - 上传CV、推荐信等材料到本地或Google Drive
- 👥 **Outreach追踪** - 管理与PI的联系记录和follow-up
- 📝 **材料任务** - 追踪所有申请材料的准备进度
- 🎯 **决策分析** - 记录申请决策和结果分析
- 📈 **Dashboard** - 可视化展示所有重要信息和提醒

## 前置要求

在运行此项目之前，您需要安装：

1. **Node.js** (版本 18 或更高)
   - 访问 [nodejs.org](https://nodejs.org/) 下载并安装
   - 或者使用 Homebrew: `brew install node`

2. **Google Cloud账号** (用于Gmail和Drive集成)
   - 需要配置OAuth凭据（详见下方说明）

## 安装步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置Google OAuth**（可选，用于邮件和文件上传功能）
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建项目并启用Gmail API和Drive API
   - 创建OAuth 2.0凭据并下载 `credentials.json`
   - 将文件放在 `server/` 目录下
   - 详细步骤请查看 [server/README.md](server/README.md)

3. **启动后端服务器**（如果使用邮件/文件功能）
   ```bash
   npm run server
   ```

4. **启动前端开发服务器**
   ```bash
   npm run dev
   ```

5. **在浏览器中打开**
   - 开发服务器启动后，通常会在 `http://localhost:5173` 运行
   - 查看终端输出以确认确切的URL

## 构建生产版本

```bash
npm run build
```

构建完成后，可以使用以下命令预览：

```bash
npm run preview
```

## 项目结构

```
├── src/
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx         # 应用入口
│   ├── index.css        # 全局样式
│   ├── components/      # UI组件
│   └── lib/             # 工具函数
├── server/              # 后端服务器
│   ├── server.js        # Express服务器（Gmail & Drive集成）
│   ├── credentials.json # Google OAuth凭据（需自行配置）
│   ├── uploads/         # 本地文件上传目录
│   └── README.md        # 后端详细文档
├── index.html           # HTML模板
├── package.json         # 项目依赖
└── 功能使用指南.md      # 详细使用说明
```

## 📖 文档

- **[功能使用指南](功能使用指南.md)** - 详细的功能说明和使用方法
- **[后端服务器文档](server/README.md)** - Gmail和Drive API配置指南
- **[启动说明](启动说明.md)** - 快速启动指南

## 🎯 主要功能模块

### 1. Projects（项目管理）
- 追踪所有申请项目
- 记录截止日期、状态、优先级
- 评分系统（Fit/Risk/ROI）
- 关联outreach和材料

### 2. Outreach（PI联系）
- 记录与PI的邮件往来
- **发送邮件** - 直接从应用发送Gmail
- **检查回复** - 自动追踪PI回复
- **Follow-up提醒** - 3天未回复自动提醒
- Stage管理（Drafting/Sent/Follow-up/Meeting/Closed）

### 3. Materials（材料管理）
- 追踪CV、推荐信、文书等材料
- **本地上传** - 上传文件到服务器
- **Drive上传** - 直接上传到Google Drive
- 状态追踪（未开始/草稿/已修改/定稿/已提交）
- 依赖关系管理

### 4. Decisions（决策分析）
- 记录申请决策理由
- 风险和策略分析
- 结果追踪和复盘
- 经验总结

### 5. Dashboard（仪表盘）
- 状态概览
- 下一个截止日期
- 即将到期的任务
- **Follow-up提醒卡片** - 显示需要跟进的邮件
- 决策统计

## 🚀 快速开始

### 不使用邮件功能（仅前端）

```bash
npm install
npm run dev
```

### 使用完整功能（邮件 + 文件上传）

1. 配置Google OAuth（详见 [server/README.md](server/README.md)）
2. 启动后端和前端：

```bash
# Terminal 1: 启动后端
npm run server

# Terminal 2: 启动前端
npm run dev
```

## 🔐 数据存储

- **本地存储** - 所有数据保存在浏览器的localStorage中
- **隐私安全** - 数据仅存储在您的浏览器中，不会上传到任何服务器
- **导出/导入** - 支持JSON格式的数据导出和导入
- **CSV导出** - 可导出项目列表为CSV格式

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI组件**: Radix UI + Tailwind CSS
- **后端**: Express.js + Node.js
- **API集成**: Google Gmail API + Google Drive API
- **状态管理**: React Hooks (useState, useEffect, useMemo)
- **日期处理**: react-datepicker
- **定时任务**: node-cron

## 📝 使用建议

1. **首次使用**: 先配置Google OAuth，测试邮件发送功能
2. **工作流**: 
   - 创建Project → 添加Outreach → 准备Materials → 发送邮件 → 追踪回复
3. **定期检查**: Dashboard会显示所有需要关注的事项
4. **数据备份**: 定期导出JSON备份数据

## 🐛 故障排除

### 前端无法连接后端
- 确保后端服务器正在运行（`npm run server`）
- 检查端口3001是否被占用
- 查看浏览器控制台的错误信息

### OAuth认证失败
- 删除 `server/token.json` 重新授权
- 确认 `credentials.json` 配置正确
- 检查OAuth权限范围是否包含所需的scopes

### 文件上传失败
- 确认 `server/uploads/` 目录存在
- 检查文件大小限制
- 查看后端服务器日志

详细故障排除请查看 [功能使用指南.md](功能使用指南.md)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

