/**
 * 认证中间件
 */

// 需要登录才能访问
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  // 保存用户尝试访问的URL，登录后跳转回来
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }
  req.flash('error', '请先登录');
  res.redirect('/login');
}

// 已登录用户不能访问（如登录页、注册页）
function requireGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

// 可选：检查用户角色（如果需要角色权限系统）
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', '请先登录');
      return res.redirect('/login');
    }
    
    if (req.session.user.role !== role) {
      req.flash('error', '您没有权限访问此页面');
      return res.redirect('/');
    }
    
    next();
  };
}

module.exports = {
  requireAuth,
  requireGuest,
  requireRole
};
