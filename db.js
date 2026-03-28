/**
 * 数据库模块 - 统一入口
 * 根据环境变量自动选择 LowDB 或 MongoDB
 * 
 * 环境变量:
 * - USE_MONGODB=true : 使用 MongoDB
 * - USE_MONGODB=false 或不存在 : 使用 LowDB (默认)
 */

const useMongoDB = process.env.USE_MONGODB === 'true';

if (useMongoDB) {
  console.log('📦 使用 MongoDB 数据库');
  module.exports = require('./db-mongodb');
} else {
  console.log('📦 使用 LowDB (JSON) 数据库');
  module.exports = require('./db-lowdb');
}
