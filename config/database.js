/**
 * MongoDB 数据库连接配置
 */
const mongoose = require('mongoose');

// MongoDB 连接字符串
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/express-auth';

// 连接配置选项
const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// 连接状态
let isConnected = false;

/**
 * 连接到 MongoDB
 */
async function connectDatabase() {
  if (isConnected) {
    console.log('✅ 使用已有的 MongoDB 连接');
    return mongoose.connection;
  }

  try {
    console.log('🔄 正在连接 MongoDB...');
    await mongoose.connect(MONGODB_URI, connectOptions);
    
    isConnected = true;
    console.log('✅ MongoDB 连接成功');
    
    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB 连接错误:', error);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB 连接断开');
      isConnected = false;
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    throw error;
  }
}

/**
 * 断开 MongoDB 连接
 */
async function disconnectDatabase() {
  if (!isConnected) return;
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ MongoDB 连接已关闭');
  } catch (error) {
    console.error('❌ 关闭 MongoDB 连接失败:', error);
  }
}

/**
 * 检查数据库连接状态
 */
function checkConnection() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  checkConnection,
  mongoose
};
