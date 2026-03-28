/**
 * 认证路由 - 处理注册、登录、登出、密码重置
 */
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const {
  findUserByEmail,
  findUserByUsername,
  createUser,
  verifyPassword,
  updatePassword,
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken
} = require('../db');

const { requireGuest, requireAuth } = require('../middleware/auth');

// ==================== 注册 ====================

// 注册页面
router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { title: '用户注册' });
});

// 处理注册
router.post('/register', requireGuest, async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // 验证输入
    const errors = [];
    
    if (!username || !email || !password) {
      errors.push('请填写所有必填字段');
    }
    
    if (password !== confirmPassword) {
      errors.push('两次输入的密码不一致');
    }
    
    if (password && password.length < 6) {
      errors.push('密码长度至少为6位');
    }
    
    if (username && username.length < 3) {
      errors.push('用户名长度至少为3位');
    }
    
    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.push('请输入有效的邮箱地址');
    }
    
    if (errors.length > 0) {
      req.flash('error', errors.join('，'));
      return res.redirect('/register');
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      req.flash('error', '该邮箱已被注册');
      return res.redirect('/register');
    }
    
    // 检查用户名是否已存在
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      req.flash('error', '该用户名已被使用');
      return res.redirect('/register');
    }
    
    // 创建用户
    const user = await createUser(username, email, password);
    
    // 自动登录
    req.session.user = user;
    
    req.flash('success', '注册成功！欢迎加入！');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('注册错误:', error);
    req.flash('error', '注册过程中发生错误，请稍后重试');
    res.redirect('/register');
  }
});

// ==================== 登录 ====================

// 登录页面
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { title: '用户登录' });
});

// 处理登录
router.post('/login', requireGuest, async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    
    // 验证输入
    if (!email || !password) {
      req.flash('error', '请输入邮箱和密码');
      return res.redirect('/login');
    }
    
    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      req.flash('error', '邮箱或密码错误');
      return res.redirect('/login');
    }
    
    // 验证密码
    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      req.flash('error', '邮箱或密码错误');
      return res.redirect('/login');
    }
    
    // 设置 session
    const { password: _, ...userWithoutPassword } = user;
    req.session.user = userWithoutPassword;
    
    // 记住我（延长 session 有效期）
    if (remember) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    }
    
    req.flash('success', '登录成功！欢迎回来！');
    
    // 跳转到之前尝试访问的页面，或默认到用户中心
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);
    
  } catch (error) {
    console.error('登录错误:', error);
    req.flash('error', '登录过程中发生错误，请稍后重试');
    res.redirect('/login');
  }
});

// ==================== 登出 ====================

// 处理登出
router.get('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出错误:', err);
    }
    res.redirect('/');
  });
});

// ==================== 忘记密码 ====================

// 忘记密码页面
router.get('/forgot-password', requireGuest, (req, res) => {
  res.render('auth/forgot-password', { title: '忘记密码' });
});

// 处理忘记密码请求
router.post('/forgot-password', requireGuest, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      req.flash('error', '请输入邮箱地址');
      return res.redirect('/forgot-password');
    }
    
    // 检查用户是否存在
    const user = await findUserByEmail(email);
    if (!user) {
      // 为了安全，即使邮箱不存在也显示相同消息
      req.flash('success', '如果该邮箱已注册，我们将发送重置密码链接');
      return res.redirect('/forgot-password');
    }
    
    // 创建重置令牌
    const token = await createPasswordResetToken(email);
    
    // 构建重置链接
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
    
    // 发送邮件（实际项目中使用真实邮件服务）
    // 这里为了演示，我们在控制台输出链接
    console.log('\n========== 密码重置邮件 ==========');
    console.log('收件人:', email);
    console.log('主题: 密码重置请求');
    console.log('内容:');
    console.log(`您好 ${user.username}，`);
    console.log('我们收到了您的密码重置请求。');
    console.log('请点击以下链接重置密码（1小时内有效）：');
    console.log(resetUrl);
    console.log('如果您没有请求重置密码，请忽略此邮件。');
    console.log('================================\n');
    
    // 在开发环境中直接显示链接给用户
    req.flash('success', '密码重置链接已生成（请查看控制台输出）');
    req.flash('info', `重置链接（开发模式）：${resetUrl}`);
    res.redirect('/forgot-password');
    
  } catch (error) {
    console.error('忘记密码错误:', error);
    req.flash('error', '处理请求时发生错误，请稍后重试');
    res.redirect('/forgot-password');
  }
});

// ==================== 重置密码 ====================

// 重置密码页面
router.get('/reset-password/:token', requireGuest, async (req, res) => {
  try {
    const { token } = req.params;
    
    // 验证令牌
    const resetToken = await verifyPasswordResetToken(token);
    if (!resetToken) {
      req.flash('error', '重置链接已过期或无效，请重新申请');
      return res.redirect('/forgot-password');
    }
    
    res.render('auth/reset-password', { 
      title: '重置密码',
      token 
    });
    
  } catch (error) {
    console.error('重置密码页面错误:', error);
    req.flash('error', '发生错误，请稍后重试');
    res.redirect('/forgot-password');
  }
});

// 处理重置密码
router.post('/reset-password', requireGuest, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    // 验证输入
    const errors = [];
    
    if (!password || !confirmPassword) {
      errors.push('请填写所有字段');
    }
    
    if (password !== confirmPassword) {
      errors.push('两次输入的密码不一致');
    }
    
    if (password && password.length < 6) {
      errors.push('密码长度至少为6位');
    }
    
    if (errors.length > 0) {
      req.flash('error', errors.join('，'));
      return res.redirect(`/reset-password/${token}`);
    }
    
    // 验证令牌
    const resetToken = await verifyPasswordResetToken(token);
    if (!resetToken) {
      req.flash('error', '重置链接已过期或无效，请重新申请');
      return res.redirect('/forgot-password');
    }
    
    // 更新密码
    await updatePassword(resetToken.userId, password);
    
    // 删除已使用的令牌
    await deletePasswordResetToken(token);
    
    req.flash('success', '密码重置成功，请使用新密码登录');
    res.redirect('/login');
    
  } catch (error) {
    console.error('重置密码错误:', error);
    req.flash('error', '重置密码时发生错误，请稍后重试');
    res.redirect('/forgot-password');
  }
});

module.exports = router;
