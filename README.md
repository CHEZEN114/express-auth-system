# 🔐 Express 用户认证系统

一个基于 Express + LowDB 的完整用户认证解决方案，支持注册、登录、密码重置等功能。

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.x-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ 功能特性

- 🔐 **用户注册** - 邮箱验证，bcrypt 密码加密
- 🔑 **用户登录** - Session 会话管理，支持"记住我"
- 🚪 **用户登出** - 安全销毁 Session
- 📧 **密码重置** - 通过邮箱链接重置密码
- 🛡️ **路由保护** - 登录后才能访问的页面自动跳转
- ⚡ **Flash 消息** - 操作成功/失败提示
- 📱 **响应式设计** - 支持移动端访问

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/CHEZEN114/express-auth-system.git
cd express-auth-system
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 4. 访问应用

打开浏览器访问：**http://localhost:3000**

## 📁 项目结构

```
express-auth-system/
├── app.js                 # 主应用入口
├── db.js                  # 数据库模块 (LowDB)
├── package.json           # 项目配置
├── middleware/
│   └── auth.js            # 认证中间件
├── routes/
│   └── auth.js            # 认证路由
├── views/                 # EJS 模板
│   ├── index.ejs          # 首页
│   ├── dashboard.ejs      # 用户中心
│   ├── profile.ejs        # 个人资料
│   ├── auth/              # 认证页面
│   └── partials/          # 公共组件
├── public/                # 静态资源
└── database.json          # 数据库文件（自动创建）
```

## 🔧 技术栈

- **后端**: Express.js
- **模板引擎**: EJS
- **数据库**: LowDB (JSON 文件存储)
- **密码加密**: bcryptjs
- **会话管理**: express-session
- **消息提示**: connect-flash

## 🌐 可用路由

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/` | 首页 |
| GET | `/register` | 注册页面 |
| POST | `/register` | 提交注册 |
| GET | `/login` | 登录页面 |
| POST | `/login` | 提交登录 |
| GET | `/logout` | 登出 |
| GET | `/forgot-password` | 忘记密码页面 |
| POST | `/forgot-password` | 提交忘记密码 |
| GET | `/reset-password/:token` | 重置密码页面 |
| POST | `/reset-password` | 提交新密码 |
| GET | `/dashboard` | 用户中心（需登录） |
| GET | `/profile` | 个人资料（需登录） |

## ⚙️ 配置说明

### Session 密钥

在生产环境中，建议修改 `app.js` 中的 Session 密钥：

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  // ...
}));
```

### 邮件服务（可选）

当前版本在开发模式下会在控制台输出重置链接。如需真实邮件发送，请在 `routes/auth.js` 中配置 nodemailer：

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});
```

## 🔒 安全特性

- ✅ bcrypt 密码加密（10 rounds）
- ✅ HttpOnly Session Cookie
- ✅ 密码重置令牌 1 小时过期
- ✅ 输入验证和 XSS 防护
- ✅ CSRF 保护（通过 Session）

## 📝 开发计划

- [ ] 添加邮箱验证功能
- [ ] 支持 OAuth 登录（Google, GitHub）
- [ ] 添加用户头像上传
- [ ] 支持多语言
- [ ] 添加单元测试

## 📄 许可证

[MIT](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ by Express
