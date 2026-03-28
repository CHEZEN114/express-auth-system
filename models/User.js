/**
 * 用户模型 (Mongoose)
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基础信息
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名最多30个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 默认查询不返回密码
  },
  
  // 邮箱验证
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // 角色和状态
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 头像
  avatar: {
    type: String,
    default: null
  },
  
  // 双因素认证
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  // OAuth 相关
  oauth: {
    github: {
      id: String,
      username: String
    },
    google: {
      id: String,
      email: String
    },
    wechat: {
      id: String,
      nickname: String
    }
  },
  
  // 最后登录时间
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// 虚拟字段：格式化后的创建时间
userSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt ? this.createdAt.toLocaleString('zh-CN') : '';
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有在密码被修改时才重新加密
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.verifyPassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 返回用户信息（不包含敏感字段）
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    avatar: this.avatar,
    twoFactorEnabled: this.twoFactorEnabled,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt
  };
};

// 静态方法：根据邮箱查找用户（包含密码）
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// 静态方法：根据 ID 查找用户（包含 2FA 密钥）
userSchema.statics.findByIdWith2FA = function(id) {
  return this.findById(id).select('+twoFactorSecret');
};

module.exports = mongoose.model('User', userSchema);
