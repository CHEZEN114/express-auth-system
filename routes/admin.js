/**
 * 管理后台路由
 * 处理管理员功能：用户管理、系统统计等
 */
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/admin');
const { 
  getAllUsers, 
  updateUserRole, 
  toggleUserStatus, 
  deleteUser, 
  getSystemStats,
  findUserById,
  UserRole 
} = require('../db');
const { getUserLoginLogs } = require('../middleware/security');
const { sendAccountStatusEmail } = require('../services/emailService');

// 所有路由都需要管理员权限
router.use(requireAdmin);

// ==================== 管理后台首页 ====================

// 管理后台仪表盘
router.get('/admin', async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.render('admin/dashboard', {
      title: '管理后台',
      user: req.session.user,
      stats
    });
  } catch (error) {
    console.error('管理后台仪表盘错误:', error);
    req.flash('error', '加载仪表盘失败');
    res.redirect('/dashboard');
  }
});

// ==================== 用户管理 ====================

// 用户列表
router.get('/admin/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || null;
    const isActive = req.query.isActive === 'true' ? true : 
                     req.query.isActive === 'false' ? false : null;
    
    const result = await getAllUsers({ page, limit, search, role, isActive });
    
    res.render('admin/users', {
      title: '用户管理',
      user: req.session.user,
      users: result.users,
      pagination: result.pagination,
      filters: { search, role, isActive },
      UserRole
    });
  } catch (error) {
    console.error('用户列表错误:', error);
    req.flash('error', '加载用户列表失败');
    res.redirect('/admin');
  }
});

// 用户详情
router.get('/admin/users/:id', async (req, res) => {
  try {
    const targetUser = await findUserById(req.params.id);
    
    if (!targetUser) {
      req.flash('error', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 获取用户登录日志
    const loginLogs = await getUserLoginLogs(targetUser.id, 10);
    
    // 移除敏感信息
    const { password, twoFactorSecret, ...userWithoutSensitive } = targetUser;
    
    res.render('admin/user-detail', {
      title: '用户详情',
      user: req.session.user,
      targetUser: userWithoutSensitive,
      loginLogs,
      UserRole
    });
  } catch (error) {
    console.error('用户详情错误:', error);
    req.flash('error', '加载用户详情失败');
    res.redirect('/admin/users');
  }
});

// 更新用户角色
router.post('/admin/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // 防止管理员降级自己
    if (id === req.session.user.id && role !== 'admin') {
      req.flash('error', '您不能降级自己的管理员权限');
      return res.redirect('/admin/users');
    }
    
    const updatedUser = await updateUserRole(id, role);
    
    if (!updatedUser) {
      req.flash('error', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    req.flash('success', `用户角色已更新为 ${role}`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('更新用户角色错误:', error);
    req.flash('error', error.message || '更新用户角色失败');
    res.redirect('/admin/users');
  }
});

// 禁用/启用用户账户
router.post('/admin/users/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 防止管理员禁用自己
    if (id === req.session.user.id) {
      req.flash('error', '您不能禁用自己的账户');
      return res.redirect('/admin/users');
    }
    
    const updatedUser = await toggleUserStatus(id);
    
    if (!updatedUser) {
      req.flash('error', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    const status = updatedUser.isActive ? '启用' : '禁用';
    
    // 异步发送账户状态变更通知邮件
    sendAccountStatusEmail(updatedUser.email, updatedUser.username, updatedUser.isActive);
    
    req.flash('success', `用户账户已${status}，通知邮件已发送`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('切换用户状态错误:', error);
    req.flash('error', '操作失败');
    res.redirect('/admin/users');
  }
});

// 删除用户
router.post('/admin/users/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 防止管理员删除自己
    if (id === req.session.user.id) {
      req.flash('error', '您不能删除自己的账户');
      return res.redirect('/admin/users');
    }
    
    const result = await deleteUser(id);
    
    if (!result) {
      req.flash('error', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    req.flash('success', '用户已删除');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('删除用户错误:', error);
    req.flash('error', '删除用户失败');
    res.redirect('/admin/users');
  }
});

// ==================== 系统统计 ====================

// 系统统计页面
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.render('admin/stats', {
      title: '系统统计',
      user: req.session.user,
      stats
    });
  } catch (error) {
    console.error('系统统计错误:', error);
    req.flash('error', '加载统计信息失败');
    res.redirect('/admin');
  }
});

// API: 获取系统统计（用于图表）
router.get('/admin/api/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('API 统计错误:', error);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

module.exports = router;
