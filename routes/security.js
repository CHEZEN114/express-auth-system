/**
 * 安全路由 - 登录日志、会话管理
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getUserLoginLogs } = require('../middleware/security');

db = require('../db');

// 查看登录日志
router.get('/login-logs', requireAuth, async (req, res) => {
  try {
    const logs = await getUserLoginLogs(req.session.user.id, 20);
    res.render('security/login-logs', {
      title: '登录日志',
      logs,
      user: req.session.user
    });
  } catch (error) {
    console.error('获取登录日志错误:', error);
    req.flash('error', '获取登录日志失败');
    res.redirect('/dashboard');
  }
});

// 修改密码
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error', '请填写所有字段');
      return res.redirect('/profile');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error', '两次输入的新密码不一致');
      return res.redirect('/profile');
    }
    
    // 验证密码策略
    const { validatePasswordPolicy } = require('../middleware/security');
    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.valid) {
      req.flash('error', passwordCheck.errors.join('，'));
      return res.redirect('/profile');
    }
    
    // 获取完整用户信息
    const user = await db.findUserById(req.session.user.id);
    
    // 验证当前密码
    const { verifyPassword, updatePassword } = require('../db');
    const isValid = await verifyPassword(user, currentPassword);
    if (!isValid) {
      req.flash('error', '当前密码错误');
      return res.redirect('/profile');
    }
    
    // 更新密码
    await updatePassword(user.id, newPassword);
    
    req.flash('success', '密码修改成功！请使用新密码重新登录');
    res.redirect('/logout');
    
  } catch (error) {
    console.error('修改密码错误:', error);
    req.flash('error', '修改密码失败');
    res.redirect('/profile');
  }
});

module.exports = router;
