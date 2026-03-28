/**
 * 双因素认证 (2FA) 路由
 */
const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { requireAuth } = require('../middleware/auth');
const { findUserById, getDb } = require('../db');

// 显示 2FA 设置页面
router.get('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.session.user.id);
    
    // 如果已启用 2FA，显示管理页面
    if (user.twoFactorEnabled) {
      return res.render('security/2fa-manage', {
        title: '管理双重认证',
        user: req.session.user,
        enabled: true
      });
    }
    
    // 生成新的 2FA 密钥
    const secret = speakeasy.generateSecret({
      name: `UserSystem:${user.email}`,
      length: 32
    });
    
    // 临时保存到 session（确认后才保存到数据库）
    req.session.temp2FASecret = secret.base32;
    
    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.render('security/2fa-setup', {
      title: '设置双重认证',
      user: req.session.user,
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
    
  } catch (error) {
    console.error('2FA 设置错误:', error);
    req.flash('error', '设置双重认证失败');
    res.redirect('/profile');
  }
});

// 验证并启用 2FA
router.post('/2fa/verify', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const tempSecret = req.session.temp2FASecret;
    
    if (!tempSecret) {
      req.flash('error', '设置已过期，请重新设置');
      return res.redirect('/2fa/setup');
    }
    
    // 验证 TOTP
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      req.flash('error', '验证码错误，请重试');
      return res.redirect('/2fa/setup');
    }
    
    // 保存到数据库
    const user = await findUserById(req.session.user.id);
    user.twoFactorSecret = tempSecret;
    user.twoFactorEnabled = true;
    await getDb().write();
    
    // 清除临时密钥
    delete req.session.temp2FASecret;
    
    req.flash('success', '双重认证已启用！下次登录时需要输入验证码');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('2FA 验证错误:', error);
    req.flash('error', '验证失败');
    res.redirect('/2fa/setup');
  }
});

// 禁用 2FA
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await findUserById(req.session.user.id);
    
    // 验证密码
    const { verifyPassword } = require('../db');
    const isValid = await verifyPassword(user, password);
    
    if (!isValid) {
      req.flash('error', '密码错误');
      return res.redirect('/profile');
    }
    
    // 禁用 2FA
    delete user.twoFactorSecret;
    user.twoFactorEnabled = false;
    await getDb().write();
    
    req.flash('success', '双重认证已禁用');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('禁用 2FA 错误:', error);
    req.flash('error', '禁用失败');
    res.redirect('/profile');
  }
});

// 登录时的 2FA 验证页面
router.get('/2fa/login', (req, res) => {
  if (!req.session.pending2FAUser) {
    return res.redirect('/login');
  }
  
  res.render('security/2fa-login', {
    title: '双重认证',
    email: req.session.pending2FAUser.email
  });
});

// 验证登录时的 2FA
router.post('/2fa/login', async (req, res) => {
  try {
    const { token } = req.body;
    const pendingUser = req.session.pending2FAUser;
    
    if (!pendingUser) {
      return res.redirect('/login');
    }
    
    const user = await findUserById(pendingUser.id);
    
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.redirect('/login');
    }
    
    // 验证 TOTP
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      req.flash('error', '验证码错误');
      return res.redirect('/2fa/login');
    }
    
    // 验证通过，完成登录
    delete req.session.pending2FAUser;
    const { password, twoFactorSecret, ...userWithoutSensitive } = user;
    req.session.user = userWithoutSensitive;
    
    req.flash('success', '登录成功！欢迎回来！');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('2FA 登录验证错误:', error);
    req.flash('error', '验证失败');
    res.redirect('/2fa/login');
  }
});

module.exports = router;
