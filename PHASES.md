# 开发阶段记录

本文档记录 Express 用户认证系统的开发阶段和实现功能。

## ✅ Phase 1: 安全增强
- [x] 登录失败锁定机制
- [x] 密码策略验证（长度、大小写、数字、特殊字符）
- [x] 登录日志记录
- [x] 安全中间件

## ✅ Phase 2: 双因素认证 (2FA)
- [x] TOTP 二维码生成
- [x] 2FA 启用/禁用
- [x] 登录时 2FA 验证
- [x] 使用 speakeasy 库

## ✅ Phase 3: 角色权限系统 & 管理后台
- [x] 用户角色字段（admin, user, moderator）
- [x] 管理员中间件（requireAdmin, requireRole）
- [x] 账户状态管理（启用/禁用）
- [x] 管理后台仪表盘
- [x] 用户管理（列表、搜索、分页、角色修改、删除）
- [x] 系统统计信息（用户分布、登录统计）
- [x] 集成 Chart.js 图表

## ✅ Phase 4: 真实邮件服务
- [x] 邮件服务配置（SMTP/SendGrid/控制台）
- [x] HTML 邮件模板（验证邮件、密码重置）
- [x] 异步邮件发送
- [x] 账户状态变更通知邮件

## ✅ Phase 5: MongoDB 迁移
- [x] Mongoose 模型（User、PasswordResetToken、EmailVerificationToken、LoginLog）
- [x] 数据库连接配置
- [x] 兼容层支持 LowDB 和 MongoDB 切换
- [x] 数据迁移脚本

## ✅ Phase 6: Redis 缓存
- [x] Redis 连接配置
- [x] 缓存操作方法（get/set/delete）
- [x] 支持缓存模式和降级处理

## ✅ Phase 7: RESTful API
- [x] API 路由基础架构
- [x] JWT Token 认证
- [x] API 权限控制
- [x] 用户认证 API（注册、登录、获取用户信息）
- [x] 管理 API（用户列表、系统统计）
- [x] Swagger 文档配置

## 🚧 Phase 8: 更多 OAuth
- [x] OAuth 路由结构
- [ ] 微信登录（需配置开放平台）
- [ ] Twitter 登录
- [ ] Facebook 登录

## 🚧 Phase 9: UI 优化
- [x] 暗黑模式 CSS 基础
- [ ] PWA 支持
- [ ] 更多响应式优化

## 🚧 Phase 10: 数据分析
- [x] 数据分析路由
- [x] 用户增长统计 API
- [x] 登录分析 API
- [x] 系统健康检查

---

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件
```

### 3. 初始化管理员账户
```bash
node scripts/init-admin.js
```

### 4. 启动服务器
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 5. 访问应用
- 首页: http://localhost:3000
- 管理后台: http://localhost:3000/admin
- API: http://localhost:3000/api/v1

---

## 数据库切换

### 使用 LowDB (默认)
```bash
# 无需额外配置，数据存储在 database.json
npm start
```

### 使用 MongoDB
```bash
# 1. 启动 MongoDB 服务
# 2. 设置环境变量
export USE_MONGODB=true
export MONGODB_URI=mongodb://localhost:27017/express-auth

# 3. 迁移数据
node scripts/migrate-to-mongodb.js

# 4. 启动服务器
npm start
```

## API 认证

API 使用 JWT Token 认证：

```bash
# 1. 登录获取 Token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123456"}'

# 2. 使用 Token 访问受保护接口
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```
