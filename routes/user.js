/**
 * 用户路由 - 处理个人资料、头像上传等
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../config/upload');
const { requireAuth } = require('../middleware/auth');
const { findUserById, updateUserAvatar } = require('../db');

// ==================== 个人资料页面 ====================

// 显示个人资料
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.session.user.id);
    if (!user) {
      req.flash('error', '用户不存在');
      return res.redirect('/');
    }
    
    res.render('profile', {
      title: '个人资料',
      user: user
    });
  } catch (error) {
    console.error('获取个人资料错误:', error);
    req.flash('error', '获取个人资料失败');
    res.redirect('/dashboard');
  }
});

// ==================== 头像上传 ====================

// 处理头像上传
router.post('/profile/avatar', requireAuth, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer 错误
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', '头像文件大小不能超过 5MB');
      } else {
        req.flash('error', '文件上传错误: ' + err.message);
      }
      return res.redirect('/profile');
    } else if (err) {
      // 其他错误
      req.flash('error', err.message);
      return res.redirect('/profile');
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error', '请选择要上传的头像文件');
      return res.redirect('/profile');
    }
    
    // 获取旧头像路径
    const user = await findUserById(req.session.user.id);
    const oldAvatar = user.avatar;
    
    // 生成新的头像 URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 更新数据库
    await updateUserAvatar(req.session.user.id, avatarUrl);
    
    // 删除旧头像文件（如果是本地文件）
    if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
      const oldAvatarPath = path.join('public', oldAvatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    // 更新 session 中的用户信息
    req.session.user.avatar = avatarUrl;
    
    req.flash('success', '头像上传成功！');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('头像上传错误:', error);
    req.flash('error', '头像上传失败，请稍后重试');
    res.redirect('/profile');
  }
});

// ==================== 更新个人资料 ====================

// 处理个人资料更新
router.post('/profile', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.length < 3) {
      req.flash('error', '用户名长度至少为3位');
      return res.redirect('/profile');
    }
    
    // 获取用户
    const user = await findUserById(req.session.user.id);
    if (!user) {
      req.flash('error', '用户不存在');
      return res.redirect('/');
    }
    
    // 更新用户名
    user.username = username;
    user.updatedAt = new Date().toISOString();
    await require('../db').getDb().write();
    
    // 更新 session
    req.session.user.username = username;
    
    req.flash('success', '个人资料更新成功！');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('更新个人资料错误:', error);
    req.flash('error', '更新失败，请稍后重试');
    res.redirect('/profile');
  }
});

module.exports = router;
