/**
 * Redis 缓存配置
 * 用于会话存储和频繁查询数据缓存
 */

const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

/**
 * 连接到 Redis
 */
async function connectRedis() {
  if (client) return client;
  
  try {
    client = redis.createClient({
      url: REDIS_URL
    });
    
    client.on('error', (err) => {
      console.error('Redis 连接错误:', err);
    });
    
    client.on('connect', () => {
      console.log('✅ Redis 连接成功');
    });
    
    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    console.log('⚠️  继续使用内存存储');
    return null;
  }
}

/**
 * 获取 Redis 客户端
 */
function getRedisClient() {
  return client;
}

/**
 * 设置缓存
 */
async function setCache(key, value, expireSeconds = 3600) {
  if (!client) return false;
  
  try {
    await client.setEx(key, expireSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis set 错误:', error);
    return false;
  }
}

/**
 * 获取缓存
 */
async function getCache(key) {
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get 错误:', error);
    return null;
  }
}

/**
 * 删除缓存
 */
async function deleteCache(key) {
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis del 错误:', error);
    return false;
  }
}

/**
 * 清除匹配模式的缓存
 */
async function clearCachePattern(pattern) {
  if (!client) return false;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Redis clear 错误:', error);
    return false;
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern
};
