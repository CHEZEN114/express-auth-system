/**
 * 数据库模块 - 使用 LowDB (纯 JSON 数据库)
 */
const { JSONFilePreset } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// 数据库文件路径
const DB_FILE = 'database.json';

// 默认数据结构
const defaultData = {
  users: [],
  passwordResetTokens: [], // 存储密码重置令牌
  emailVerificationTokens: [], // 存储邮箱验证令牌
  loginLogs: [], // 登录日志
  apiTokens: [] // API Token 列表
};

// 初始化数据库
let db;

async function initDb() {
  db = await JSONFilePreset(DB_FILE, defaultData);
  await db.write();
  console.log('✅ 数据库初始化完成');
  return db;
}

// 获取数据库实例
function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return db;
}

// ==================== 用户相关操作 ====================

// 根据邮箱查找用户
async function findUserByEmail(email) {
  const data = db.data;
  return data.users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

// 根据 ID 查找用户
async function findUserById(id) {
  const data = db.data;
  return data.users.find(user => user.id === id);
}

// 根据用户名查找用户
async function findUserByUsername(username) {
  const data = db.data;
  return data.users.find(user => user.username.toLowerCase() === username.toLowerCase());
}

// 用户角色枚举
const UserRole = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// 创建新用户
async function createUser(username, email, password, isEmailVerified = false, role = UserRole.USER) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: uuidv4(),
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
    isEmailVerified,
    role: role, // 用户角色: admin, moderator, user
    isActive: true, // 账户是否启用
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  db.data.users.push(newUser);
  await db.write();
  
  // 返回时不包含密码
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

// 验证用户密码
async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password);
}

// 更新用户密码
async function updatePassword(userId, newPassword) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  user.password = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date().toISOString();
  await db.write();
  return true;
}

// ==================== 密码重置令牌操作 ====================

// 创建密码重置令牌
async function createPasswordResetToken(email) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  
  // 删除该用户之前的令牌
  db.data.passwordResetTokens = db.data.passwordResetTokens.filter(
    token => token.userId !== user.id
  );
  
  // 创建新令牌（1小时有效）
  const resetToken = {
    token: uuidv4(),
    userId: user.id,
    expiresAt: new Date(Date.now() + 3600000).toISOString() // 1小时后过期
  };
  
  db.data.passwordResetTokens.push(resetToken);
  await db.write();
  
  return resetToken.token;
}

// 验证密码重置令牌
async function verifyPasswordResetToken(token) {
  const resetToken = db.data.passwordResetTokens.find(t => t.token === token);
  if (!resetToken) return null;
  
  // 检查是否过期
  if (new Date(resetToken.expiresAt) < new Date()) {
    // 删除过期令牌
    db.data.passwordResetTokens = db.data.passwordResetTokens.filter(t => t.token !== token);
    await db.write();
    return null;
  }
  
  return resetToken;
}

// 删除密码重置令牌
async function deletePasswordResetToken(token) {
  db.data.passwordResetTokens = db.data.passwordResetTokens.filter(t => t.token !== token);
  await db.write();
}

// ==================== 邮箱验证令牌操作 ====================

// 创建邮箱验证令牌
async function createEmailVerificationToken(userId) {
  // 删除该用户之前的令牌
  db.data.emailVerificationTokens = db.data.emailVerificationTokens.filter(
    token => token.userId !== userId
  );
  
  // 创建新令牌（24小时有效）
  const verificationToken = {
    token: uuidv4(),
    userId: userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
  };
  
  db.data.emailVerificationTokens.push(verificationToken);
  await db.write();
  
  return verificationToken.token;
}

// 验证邮箱验证令牌
async function verifyEmailVerificationToken(token) {
  const verificationToken = db.data.emailVerificationTokens.find(t => t.token === token);
  if (!verificationToken) return null;
  
  // 检查是否过期
  if (new Date(verificationToken.expiresAt) < new Date()) {
    // 删除过期令牌
    db.data.emailVerificationTokens = db.data.emailVerificationTokens.filter(t => t.token !== token);
    await db.write();
    return null;
  }
  
  return verificationToken;
}

// 删除邮箱验证令牌
async function deleteEmailVerificationToken(token) {
  db.data.emailVerificationTokens = db.data.emailVerificationTokens.filter(t => t.token !== token);
  await db.write();
}

// 标记用户邮箱为已验证
async function markEmailAsVerified(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  user.isEmailVerified = true;
  user.updatedAt = new Date().toISOString();
  await db.write();
  return true;
}

// 更新用户头像
async function updateUserAvatar(userId, avatarUrl) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  user.avatar = avatarUrl;
  user.updatedAt = new Date().toISOString();
  await db.write();
  return user;
}

// ==================== 用户角色和状态管理 ====================

// 获取所有用户（用于管理后台）
async function getAllUsers(options = {}) {
  const { page = 1, limit = 20, search = '', role = null, isActive = null } = options;
  
  let users = db.data.users;
  
  // 搜索过滤
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(user => 
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }
  
  // 角色过滤
  if (role) {
    users = users.filter(user => user.role === role);
  }
  
  // 状态过滤
  if (isActive !== null) {
    users = users.filter(user => user.isActive === isActive);
  }
  
  // 按创建时间倒序
  users = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // 分页
  const total = users.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = users.slice(start, end).map(user => {
    const { password, twoFactorSecret, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  });
  
  return {
    users: paginatedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// 更新用户角色
async function updateUserRole(userId, newRole) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  if (!Object.values(UserRole).includes(newRole)) {
    throw new Error('无效的角色类型');
  }
  
  user.role = newRole;
  user.updatedAt = new Date().toISOString();
  await db.write();
  return user;
}

// 禁用/启用用户账户
async function toggleUserStatus(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  
  user.isActive = !user.isActive;
  user.updatedAt = new Date().toISOString();
  await db.write();
  return user;
}

// 删除用户
async function deleteUser(userId) {
  const userIndex = db.data.users.findIndex(user => user.id === userId);
  if (userIndex === -1) return null;
  
  db.data.users.splice(userIndex, 1);
  await db.write();
  return true;
}

// 获取系统统计信息
async function getSystemStats() {
  const users = db.data.users;
  const loginLogs = db.data.loginLogs || [];
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    users: {
      total: users.length,
      active: users.filter(u => u.isActive !== false).length,
      inactive: users.filter(u => u.isActive === false).length,
      admins: users.filter(u => u.role === UserRole.ADMIN).length,
      moderators: users.filter(u => u.role === UserRole.MODERATOR).length,
      regular: users.filter(u => u.role === UserRole.USER || !u.role).length,
      newToday: users.filter(u => new Date(u.createdAt) >= today).length,
      newThisMonth: users.filter(u => new Date(u.createdAt) >= thisMonth).length
    },
    loginLogs: {
      total: loginLogs.length,
      today: loginLogs.filter(log => new Date(log.timestamp) >= today).length,
      successful: loginLogs.filter(log => log.success).length,
      failed: loginLogs.filter(log => !log.success).length
    }
  };
}

module.exports = {
  initDb,
  getDb,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  createUser,
  verifyPassword,
  updatePassword,
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  deleteEmailVerificationToken,
  markEmailAsVerified,
  updateUserAvatar,
  UserRole,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getSystemStats
};
