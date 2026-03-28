/**
 * Express 用户认证系统
 * 功能：注册、登录、登出、密码重置、邮箱验证、OAuth 登录
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('./config/passport');

// 导入数据库和路由
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/user');
const securityRoutes = require('./routes/security');
const twoFaRoutes = require('./routes/twofa');
const { requireAuth, requireGuest } = require('./middleware/auth');
const i18n = require('./config/i18n');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件配置 ====================

// 解析请求体
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// Session 配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 生产环境设为 true（需要 HTTPS）
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// Flash 消息
app.use(flash());

// Cookie 解析器（必须在 i18n 之前）
app.use(cookieParser());

// i18n 国际化
app.use(i18n.init);

// Passport 初始化
app.use(passport.initialize());
app.use(passport.session());

// 设置全局模板变量
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.__ = res.__;
  res.locals.locale = req.getLocale();
  next();
});

// 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== 路由 ====================

// 认证路由
app.use('/', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/', userRoutes);
app.use('/', securityRoutes);
app.use('/', twoFaRoutes);

// 首页
app.get('/', (req, res) => {
  res.render('index', { title: '首页' });
});

// 受保护的页面示例（需要登录）
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { 
    title: '用户中心',
    user: req.session.user
  });
});



// 404 页面
app.use((req, res) => {
  res.status(404).render('404', { title: '页面不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: '服务器错误',
    message: '服务器发生错误，请稍后重试'
  });
});

// ==================== 启动服务器 ====================

async function startServer() {
  try {
    // 初始化数据库
    await initDb();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`\n🚀 服务器运行在 http://localhost:${PORT}`);
      console.log('\n可用路由：');
      console.log('  GET  /           - 首页');
      console.log('  GET  /register   - 注册页面');
      console.log('  POST /register   - 提交注册');
      console.log('  GET  /login      - 登录页面');
      console.log('  POST /login      - 提交登录');
      console.log('  GET  /logout     - 登出');
      console.log('  GET  /forgot-password      - 忘记密码');
      console.log('  POST /forgot-password      - 提交忘记密码');
      console.log('  GET  /reset-password/:token- 重置密码页面');
      console.log('  POST /reset-password       - 提交新密码');
      console.log('  GET  /dashboard  - 用户中心（需登录）');
      console.log('  GET  /profile    - 个人资料（需登录）');
      console.log('  GET  /lang/:lang - 切换语言');
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

// 导出 app 供测试使用
module.exports = app;

// 如果不是测试环境，启动服务器
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
