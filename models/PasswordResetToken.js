/**
 * 密码重置令牌模型
 */
const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 3600000); // 默认1小时过期
    }
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 索引：自动清理过期令牌
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ userId: 1 });

// 检查令牌是否有效
passwordResetTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
