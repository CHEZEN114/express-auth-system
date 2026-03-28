/**
 * 认证路由 - 处理注册、登录、登出、密码重置
 */
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const {
  findUserByEmail,
  findUserById,
  findUserByUsername,
  createUser,
  verifyPassword,
  updatePassword,
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  deleteEmailVerificationToken,
  markEmailAsVerified
} = require('../db');

const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const { requireGuest, requireAuth } = require('../middleware/auth');
const { 
  checkAccountLock, 
  recordLoginFailure, 
  clearLoginFailure,
  validatePasswordPolicy,
  recordLoginLog 
} = require('../middleware/security');

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
    
    // 验证密码策略
    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
      errors.push(...passwordCheck.errors);
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
    
    // 创建用户（邮箱未验证）
    const user = await createUser(username, email, password, false);
    
    // 创建邮箱验证令牌
    const verificationToken = await createEmailVerificationToken(user.id);
    
    // 构建验证链接
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;
    
    // 异步发送验证邮件
    sendVerificationEmail(email, username, verifyUrl, 24);
    
    // 自动登录
    req.session.user = user;
    
    req.flash('success', '注册成功！验证邮件已发送，请查收');
    res.redirect('/verify-email');
    
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
router.post('/login', requireGuest, checkAccountLock, async (req, res) => {
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
      await recordLoginFailure(email);
      await recordLoginLog(null, email, false, req);
      req.flash('error', '邮箱或密码错误');
      return res.redirect('/login');
    }
    
    // 检查账户是否被禁用
    if (user.isActive === false) {
      await recordLoginLog(user.id, email, false, req);
      req.flash('error', '您的账户已被禁用，请联系管理员');
      return res.redirect('/login');
    }
    
    // 验证密码
    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      const record = await recordLoginFailure(email);
      await recordLoginLog(user.id, email, false, req);
      
      if (record.lockedUntil) {
        const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
        req.flash('error', `登录失败次数过多，账户已锁定，请 ${remainingMinutes} 分钟后重试`);
      } else {
        const remainingAttempts = 5 - record.attempts;
        req.flash('error', `邮箱或密码错误，还剩 ${remainingAttempts} 次尝试机会`);
      }
      return res.redirect('/login');
    }
    
    // 清除登录失败记录
    await clearLoginFailure(email);
    
    // 记录成功登录日志
    await recordLoginLog(user.id, email, true, req);
    
    // 检查邮箱是否已验证
    if (!user.isEmailVerified) {
      // 创建新的验证令牌
      const verificationToken = await createEmailVerificationToken(user.id);
      const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;
      
      // 异步发送验证邮件
      sendVerificationEmail(user.email, user.username, verifyUrl, 24);
      
      req.flash('error', '请先验证您的邮箱地址后再登录，新的验证邮件已发送');
      return res.redirect('/verify-email');
    }
    
    // 检查是否启用了 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      req.session.pending2FAUser = {
        id: user.id,
        email: user.email
      };
      return res.redirect('/2fa/login');
    }
    
    // 设置 session
    const { password: _, twoFactorSecret, ...userWithoutPassword } = user;
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
    
    // 异步发送密码重置邮件
    sendPasswordResetEmail(email, user.username, resetUrl, 1);
    
    req.flash('success', '密码重置邮件已发送，请查收您的邮箱');
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

// ==================== 邮箱验证 ====================

// 邮箱验证提示页面
router.get('/verify-email', requireGuest, (req, res) => {
  res.render('auth/verify-email', { 
    title: '验证邮箱',
    email: req.query.email || ''
  });
});

// 处理邮箱验证
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 验证令牌
    const verificationToken = await verifyEmailVerificationToken(token);
    if (!verificationToken) {
      req.flash('error', '验证链接已过期或无效');
      return res.redirect('/verify-email');
    }
    
    // 标记邮箱为已验证
    await markEmailAsVerified(verificationToken.userId);
    
    // 删除已使用的令牌
    await deleteEmailVerificationToken(token);
    
    req.flash('success', '邮箱验证成功！您现在可以登录了');
    res.redirect('/login');
    
  } catch (error) {
    console.error('邮箱验证错误:', error);
    req.flash('error', '验证过程中发生错误，请稍后重试');
    res.redirect('/verify-email');
  }
});

// 重新发送验证邮件
router.post('/resend-verification', requireGuest, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      req.flash('error', '请输入邮箱地址');
      return res.redirect('/verify-email');
    }
    
    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      // 为了安全，即使用户不存在也显示相同消息
      req.flash('success', '如果该邮箱已注册且未验证，我们将发送验证邮件');
      return res.redirect('/verify-email');
    }
    
    // 检查邮箱是否已验证
    if (user.isEmailVerified) {
      req.flash('info', '该邮箱已经验证过了，请直接登录');
      return res.redirect('/login');
    }
    
    // 创建新的验证令牌
    const verificationToken = await createEmailVerificationToken(user.id);
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;
    
    // 异步发送验证邮件
    sendVerificationEmail(email, user.username, verifyUrl, 24);
    
    req.flash('success', '验证邮件已重新发送，请查收您的邮箱');
    res.redirect('/verify-email');
    
  } catch (error) {
    console.error('重新发送验证邮件错误:', error);
    req.flash('error', '处理请求时发生错误，请稍后重试');
    res.redirect('/verify-email');
  }
});

// ==================== 语言切换 ====================

// 切换语言
router.get('/lang/:lang', (req, res) => {
  const lang = req.params.lang;
  if (['zh', 'en'].includes(lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1年
    req.setLocale(lang);
  }
  res.redirect(req.get('Referer') || '/');
});

module.exports = router;
