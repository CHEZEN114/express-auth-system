/**
 * RESTful API 路由 v1
 * 基础路径: /api/v1
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-this-in-production';

// 导入数据库函数
const {
  findUserByEmail,
  findUserById,
  verifyPassword,
  createUser,
  createEmailVerificationToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  updatePassword,
  markEmailAsVerified,
  deleteEmailVerificationToken,
  getAllUsers,
  getSystemStats
} = require('../../db');

// 导入模型（如果使用 MongoDB）
const { User } = require('../../models');

// ==================== 中间件 ====================

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供访问令牌'
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '令牌无效或已过期'
      });
    }
    
    req.user = user;
    next();
  });
}

// 检查管理员权限
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
}

// 处理验证错误
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '验证失败',
      errors: errors.array()
    });
  }
  next();
}

// ==================== 认证 API ====================

// 用户注册
router.post('/auth/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
    }
    
    // 检查用户名是否已存在
    const existingUsername = await findUserById(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: '该用户名已被使用'
      });
    }
    
    // 创建用户
    const user = await createUser(username, email, password, false);
    
    // 创建验证令牌并发送邮件
    const verificationToken = await createEmailVerificationToken(user.id);
    const { sendVerificationEmail } = require('../../services/emailService');
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;
    sendVerificationEmail(email, username, verifyUrl, 24);
    
    res.status(201).json({
      success: true,
      message: '注册成功，请验证邮箱',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('API 注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败'
    });
  }
});

// 用户登录
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱和密码'
      });
    }
    
    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 检查账户状态
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用'
      });
    }
    
    // 验证密码
    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 检查邮箱验证
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: '请先验证邮箱地址'
      });
    }
    
    // 检查 2FA
    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        message: '需要双因素认证',
        data: {
          requires2FA: true,
          userId: user.id
        }
      });
    }
    
    // 生成 JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // 更新最后登录时间
    if (process.env.USE_MONGODB === 'true') {
      await User.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });
    }
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('API 登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

// 获取当前用户信息
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// ==================== 用户管理 API（管理员） ====================

// 获取用户列表
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || null;
    
    const result = await getAllUsers({ page, limit, search, role });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('API 获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 获取系统统计
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('API 获取统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

// ==================== 健康检查 ====================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API 服务正常运行',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
