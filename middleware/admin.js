/**
 * 管理员权限中间件
 * 用于验证用户是否具有管理员或特定角色权限
 */

const { findUserById } = require('../db');

// 需要管理员权限
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', '请先登录');
    return res.redirect('/login');
  }
  
  // 检查用户角色
  if (req.session.user.role !== 'admin') {
    req.flash('error', '您没有权限访问此页面，需要管理员权限');
    return res.redirect('/dashboard');
  }
  
  next();
}

// 需要管理员或版主权限
function requireAdminOrModerator(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', '请先登录');
    return res.redirect('/login');
  }
  
  const allowedRoles = ['admin', 'moderator'];
  if (!allowedRoles.includes(req.session.user.role)) {
    req.flash('error', '您没有权限访问此页面');
    return res.redirect('/dashboard');
  }
  
  next();
}

// 需要特定角色（可传入单个角色或角色数组）
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', '请先登录');
      return res.redirect('/login');
    }
    
    if (!allowedRoles.includes(req.session.user.role)) {
      req.flash('error', '您没有权限执行此操作');
      return res.redirect('/dashboard');
    }
    
    next();
  };
}

// 检查账户是否被禁用（用于登录时检查）
async function checkUserActive(req, res, next) {
  if (!req.session || !req.session.user) {
    return next();
  }
  
  try {
    const user = await findUserById(req.session.user.id);
    
    if (!user) {
      req.session.destroy();
      req.flash('error', '用户不存在');
      return res.redirect('/login');
    }
    
    if (user.isActive === false) {
      req.session.destroy();
      req.flash('error', '您的账户已被禁用，请联系管理员');
      return res.redirect('/login');
    }
    
    next();
  } catch (error) {
    console.error('检查用户状态错误:', error);
    next();
  }
}

module.exports = {
  requireAdmin,
  requireAdminOrModerator,
  requireRole,
  checkUserActive
};
