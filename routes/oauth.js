/**
 * OAuth 路由 - 处理第三方登录
 */
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// ==================== Google OAuth ====================

// Google 登录
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google 回调
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    // 登录成功
    req.session.user = req.user;
    req.flash('success', 'Google 登录成功！欢迎回来！');
    
    // 跳转到之前尝试访问的页面，或默认到用户中心
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// ==================== GitHub OAuth ====================

// GitHub 登录
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email']
  })
);

// GitHub 回调
router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    // 登录成功
    req.session.user = req.user;
    req.flash('success', 'GitHub 登录成功！欢迎回来！');
    
    // 跳转到之前尝试访问的页面，或默认到用户中心
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

module.exports = router;
