/**
 * 安全配置
 */
module.exports = {
  // 登录失败锁定配置
  loginLock: {
    maxAttempts: 5,           // 最大尝试次数
    lockTime: 15 * 60 * 1000, // 锁定时间 15 分钟
    resetTime: 60 * 60 * 1000 // 重置时间 1 小时
  },
  
  // 密码策略
  passwordPolicy: {
    minLength: 8,             // 最小长度
    maxLength: 128,           // 最大长度
    requireUppercase: true,   // 需要大写字母
    requireLowercase: true,   // 需要小写字母
    requireNumbers: true,     // 需要数字
    requireSpecialChars: true // 需要特殊字符
  },
  
  // 会话配置
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    maxConcurrent: 3             // 最大并发会话数
  },
  
  // 请求限制
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100                   // 最多 100 个请求
  }
};
