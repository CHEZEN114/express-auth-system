/**
 * 微信 OAuth 登录路由
 * Phase 8: 更多 OAuth 支持
 */
const express = require('express');
const router = express.Router();

// 微信登录页面
router.get('/auth/wechat', (req, res) => {
  // 实际实现需要使用微信开放平台 SDK
  res.status(501).json({
    success: false,
    message: '微信登录功能需要配置微信开放平台应用'
  });
});

module.exports = router;
