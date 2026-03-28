/**
 * 数据库模块 - MongoDB 版本
 * 提供与 db.js 兼容的 API，但底层使用 MongoDB
 * 
 * 使用方式：
 * 1. 设置环境变量 USE_MONGODB=true
 * 2. 或者修改 app.js 中的 require 路径
 */

const { connectDatabase } = require('./config/database');
const { User, PasswordResetToken, EmailVerificationToken, LoginLog } = require('./models');
const { v4: uuidv4 } = require('uuid');

// 用户角色枚举
const UserRole = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// 初始化数据库
async function initDb() {
  await connectDatabase();
  console.log('✅ MongoDB 数据库初始化完成');
  return { data: {} };
}

// 获取数据库实例（兼容旧接口）
function getDb() {
  return { data: {} };
}

// ==================== 用户相关操作 ====================

// 根据邮箱查找用户
async function findUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  return user ? user.toPublicJSON() : null;
}

// 根据 ID 查找用户
async function findUserById(id) {
  const user = await User.findById(id);
  return user ? user.toPublicJSON() : null;
}

// 根据用户名查找用户
async function findUserByUsername(username) {
  const user = await User.findOne({ 
    username: { $regex: new RegExp(`^${username}$`, 'i') } 
  });
  return user ? user.toPublicJSON() : null;
}

// 创建新用户
async function createUser(username, email, password, isEmailVerified = false, role = UserRole.USER) {
  const user = new User({
    username,
    email: email.toLowerCase(),
    password,
    isEmailVerified,
    role,
    isActive: true
  });
  
  await user.save();
  return user.toPublicJSON();
}

// 验证用户密码
async function verifyPassword(user, password) {
  const fullUser = await User.findByEmailWithPassword(user.email);
  if (!fullUser) return false;
  return fullUser.verifyPassword(password);
}

// 更新用户密码
async function updatePassword(userId, newPassword) {
  const user = await User.findById(userId);
  if (!user) return null;
  
  user.password = newPassword;
  await user.save();
  return true;
}

// ==================== 密码重置令牌操作 ====================

// 创建密码重置令牌
async function createPasswordResetToken(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return null;
  
  // 删除该用户之前的令牌
  await PasswordResetToken.deleteMany({ userId: user._id });
  
  // 创建新令牌
  const token = uuidv4();
  await PasswordResetToken.create({
    token,
    userId: user._id,
    expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
  });
  
  return token;
}

// 验证密码重置令牌
async function verifyPasswordResetToken(token) {
  const resetToken = await PasswordResetToken.findOne({ token });
  if (!resetToken) return null;
  
  // 检查是否过期或已使用
  if (!resetToken.isValid()) {
    await PasswordResetToken.deleteOne({ token });
    return null;
  }
  
  return {
    token: resetToken.token,
    userId: resetToken.userId.toString()
  };
}

// 删除密码重置令牌
async function deletePasswordResetToken(token) {
  await PasswordResetToken.deleteOne({ token });
}

// ==================== 邮箱验证令牌操作 ====================

// 创建邮箱验证令牌
async function createEmailVerificationToken(userId) {
  // 删除该用户之前的令牌
  await EmailVerificationToken.deleteMany({ userId });
  
  // 创建新令牌
  const token = uuidv4();
  await EmailVerificationToken.create({
    token,
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
  });
  
  return token;
}

// 验证邮箱验证令牌
async function verifyEmailVerificationToken(token) {
  const verificationToken = await EmailVerificationToken.findOne({ token });
  if (!verificationToken) return null;
  
  // 检查是否过期或已使用
  if (!verificationToken.isValid()) {
    await EmailVerificationToken.deleteOne({ token });
    return null;
  }
  
  return {
    token: verificationToken.token,
    userId: verificationToken.userId.toString()
  };
}

// 删除邮箱验证令牌
async function deleteEmailVerificationToken(token) {
  await EmailVerificationToken.deleteOne({ token });
}

// 标记用户邮箱为已验证
async function markEmailAsVerified(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  
  user.isEmailVerified = true;
  await user.save();
  return true;
}

// 更新用户头像
async function updateUserAvatar(userId, avatarUrl) {
  const user = await User.findById(userId);
  if (!user) return null;
  
  user.avatar = avatarUrl;
  await user.save();
  return user.toPublicJSON();
}

// ==================== 用户角色和状态管理 ====================

// 获取所有用户（用于管理后台）
async function getAllUsers(options = {}) {
  const { page = 1, limit = 20, search = '', role = null, isActive = null } = options;
  
  const query = {};
  
  // 搜索过滤
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // 角色过滤
  if (role) {
    query.role = role;
  }
  
  // 状态过滤
  if (isActive !== null) {
    query.isActive = isActive;
  }
  
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  return {
    users: users.map(u => u.toPublicJSON()),
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
  if (!Object.values(UserRole).includes(newRole)) {
    throw new Error('无效的角色类型');
  }
  
  const user = await User.findById(userId);
  if (!user) return null;
  
  user.role = newRole;
  await user.save();
  return user.toPublicJSON();
}

// 禁用/启用用户账户
async function toggleUserStatus(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  
  user.isActive = !user.isActive;
  await user.save();
  return user.toPublicJSON();
}

// 删除用户
async function deleteUser(userId) {
  const result = await User.deleteOne({ _id: userId });
  return result.deletedCount > 0;
}

// 获取系统统计信息
async function getSystemStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    adminUsers,
    moderatorUsers,
    regularUsers,
    newToday,
    newThisMonth,
    totalLogs,
    todayLogs,
    successfulLogs,
    failedLogs
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'moderator' }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: thisMonth } }),
    LoginLog.countDocuments(),
    LoginLog.countDocuments({ timestamp: { $gte: today } }),
    LoginLog.countDocuments({ success: true }),
    LoginLog.countDocuments({ success: false })
  ]);
  
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      admins: adminUsers,
      moderators: moderatorUsers,
      regular: regularUsers,
      newToday,
      newThisMonth
    },
    loginLogs: {
      total: totalLogs,
      today: todayLogs,
      successful: successfulLogs,
      failed: failedLogs
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
