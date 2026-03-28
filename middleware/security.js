/**
 * 安全中间件 - 登录失败锁定、密码策略
 */
const { getDb } = require('../db');
const securityConfig = require('../config/security');

// 登录失败记录存储（内存中，生产环境可用 Redis）
const loginAttempts = new Map();

// 检查账户是否被锁定
async function checkAccountLock(req, res, next) {
  const { email } = req.body;
  if (!email) return next();
  
  const now = Date.now();
  const record = loginAttempts.get(email.toLowerCase());
  
  if (record) {
    const { attempts, lastAttempt, lockedUntil } = record;
    
    // 检查是否处于锁定状态
    if (lockedUntil && now < lockedUntil) {
      const remainingMinutes = Math.ceil((lockedUntil - now) / 60000);
      return res.status(423).json({
        success: false,
        message: `账户已被锁定，请 ${remainingMinutes} 分钟后重试`
      });
    }
    
    // 如果过了重置时间，清除记录
    if (now - lastAttempt > securityConfig.loginLock.resetTime) {
      loginAttempts.delete(email.toLowerCase());
    }
  }
  
  next();
}

// 记录登录失败
async function recordLoginFailure(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = loginAttempts.get(key) || { attempts: 0, lastAttempt: now };
  
  record.attempts += 1;
  record.lastAttempt = now;
  
  // 超过最大尝试次数，锁定账户
  if (record.attempts >= securityConfig.loginLock.maxAttempts) {
    record.lockedUntil = now + securityConfig.loginLock.lockTime;
    console.log(`🚨 账户 ${email} 已被锁定 ${securityConfig.loginLock.lockTime / 60000} 分钟`);
  }
  
  loginAttempts.set(key, record);
  return record;
}

// 清除登录失败记录
async function clearLoginFailure(email) {
  loginAttempts.delete(email.toLowerCase());
}

// 验证密码策略
function validatePasswordPolicy(password) {
  const policy = securityConfig.passwordPolicy;
  const errors = [];
  
  if (password.length < policy.minLength) {
    errors.push(`密码长度至少为 ${policy.minLength} 位`);
  }
  
  if (password.length > policy.maxLength) {
    errors.push(`密码长度不能超过 ${policy.maxLength} 位`);
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*...)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 记录登录日志
async function recordLoginLog(userId, email, success, req) {
  try {
    const db = getDb();
    const logEntry = {
      id: require('uuid').v4(),
      userId,
      email,
      success,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };
    
    // 初始化登录日志数组
    if (!db.data.loginLogs) {
      db.data.loginLogs = [];
    }
    
    db.data.loginLogs.push(logEntry);
    
    // 只保留最近 1000 条记录
    if (db.data.loginLogs.length > 1000) {
      db.data.loginLogs = db.data.loginLogs.slice(-1000);
    }
    
    await db.write();
  } catch (error) {
    console.error('记录登录日志失败:', error);
  }
}

// 获取用户的登录日志
async function getUserLoginLogs(userId, limit = 10) {
  try {
    const db = getDb();
    if (!db.data.loginLogs) return [];
    
    return db.data.loginLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    console.error('获取登录日志失败:', error);
    return [];
  }
}

module.exports = {
  checkAccountLock,
  recordLoginFailure,
  clearLoginFailure,
  validatePasswordPolicy,
  recordLoginLog,
  getUserLoginLogs
};
