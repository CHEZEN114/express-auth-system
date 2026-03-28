/**
 * 模型索引文件
 * 统一导出所有 Mongoose 模型
 */

const User = require('./User');
const PasswordResetToken = require('./PasswordResetToken');
const EmailVerificationToken = require('./EmailVerificationToken');
const LoginLog = require('./LoginLog');

module.exports = {
  User,
  PasswordResetToken,
  EmailVerificationToken,
  LoginLog
};
