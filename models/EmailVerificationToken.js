/**
 * 邮箱验证令牌模型
 */
const mongoose = require('mongoose');

const emailVerificationTokenSchema = new mongoose.Schema({
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
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 默认24小时过期
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
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationTokenSchema.index({ userId: 1 });

// 检查令牌是否有效
emailVerificationTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
