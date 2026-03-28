/**
 * 登录日志模型
 */
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // 未登录用户的尝试记录
  },
  email: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    required: true
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
loginLogSchema.index({ userId: 1, timestamp: -1 });
loginLogSchema.index({ timestamp: -1 });
loginLogSchema.index({ success: 1 });

// 静态方法：记录登录日志
loginLogSchema.statics.record = async function(data) {
  return this.create({
    userId: data.userId,
    email: data.email,
    success: data.success,
    ip: data.ip,
    userAgent: data.userAgent,
    timestamp: new Date()
  });
};

// 静态方法：获取用户最近的登录日志
loginLogSchema.statics.getRecentByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('LoginLog', loginLogSchema);
