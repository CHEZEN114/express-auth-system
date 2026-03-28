/**
 * 数据迁移脚本：从 LowDB 迁移到 MongoDB
 * 用法: node scripts/migrate-to-mongodb.js
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { User, PasswordResetToken, EmailVerificationToken, LoginLog } = require('../models');

const DB_FILE = path.join(__dirname, '..', 'database.json');

async function migrateData() {
  try {
    console.log('🚀 开始数据迁移...\n');
    
    // 连接到 MongoDB
    await connectDatabase();
    
    // 读取 LowDB 数据
    console.log('📖 读取 LowDB 数据...');
    const dbData = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
    
    // 清空现有数据（可选，谨慎使用）
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      console.log('🗑️  清空现有 MongoDB 数据...');
      await User.deleteMany({});
      await PasswordResetToken.deleteMany({});
      await EmailVerificationToken.deleteMany({});
      await LoginLog.deleteMany({});
    }
    
    // 迁移用户数据
    console.log('\n👥 迁移用户数据...');
    const userIdMap = new Map(); // 用于映射旧 ID 到新 ID
    
    if (dbData.users && dbData.users.length > 0) {
      for (const oldUser of dbData.users) {
        // 检查用户是否已存在
        const existingUser = await User.findOne({ email: oldUser.email });
        
        if (existingUser) {
          console.log(`  ⏭️  跳过已存在用户: ${oldUser.email}`);
          userIdMap.set(oldUser.id, existingUser._id);
          continue;
        }
        
        // 创建新用户
        const newUser = new User({
          _id: oldUser.id, // 保留原 ID
          username: oldUser.username,
          email: oldUser.email.toLowerCase(),
          password: oldUser.password, // 密码已经加密
          isEmailVerified: oldUser.isEmailVerified || false,
          role: oldUser.role || 'user',
          isActive: oldUser.isActive !== false,
          avatar: oldUser.avatar,
          twoFactorSecret: oldUser.twoFactorSecret,
          twoFactorEnabled: oldUser.twoFactorEnabled || false,
          createdAt: oldUser.createdAt ? new Date(oldUser.createdAt) : new Date(),
          updatedAt: oldUser.updatedAt ? new Date(oldUser.updatedAt) : new Date()
        });
        
        // 跳过密码加密中间件
        newUser.$__.saveOptions = { validateBeforeSave: false };
        
        await newUser.save();
        userIdMap.set(oldUser.id, newUser._id);
        console.log(`  ✅ 迁移用户: ${oldUser.username} (${oldUser.email})`);
      }
      console.log(`✅ 用户迁移完成，共 ${dbData.users.length} 个用户`);
    } else {
      console.log('  ℹ️  没有用户数据需要迁移');
    }
    
    // 迁移密码重置令牌
    console.log('\n🔑 迁移密码重置令牌...');
    if (dbData.passwordResetTokens && dbData.passwordResetTokens.length > 0) {
      let tokenCount = 0;
      for (const oldToken of dbData.passwordResetTokens) {
        const newUserId = userIdMap.get(oldToken.userId);
        if (!newUserId) {
          console.log(`  ⚠️  跳过无效用户令牌: ${oldToken.token}`);
          continue;
        }
        
        // 检查令牌是否已过期
        if (new Date(oldToken.expiresAt) < new Date()) {
          console.log(`  ⏭️  跳过过期令牌`);
          continue;
        }
        
        await PasswordResetToken.create({
          token: oldToken.token,
          userId: newUserId,
          expiresAt: new Date(oldToken.expiresAt)
        });
        tokenCount++;
      }
      console.log(`✅ 令牌迁移完成，共 ${tokenCount} 个有效令牌`);
    } else {
      console.log('  ℹ️  没有令牌数据需要迁移');
    }
    
    // 迁移邮箱验证令牌
    console.log('\n📧 迁移邮箱验证令牌...');
    if (dbData.emailVerificationTokens && dbData.emailVerificationTokens.length > 0) {
      let tokenCount = 0;
      for (const oldToken of dbData.emailVerificationTokens) {
        const newUserId = userIdMap.get(oldToken.userId);
        if (!newUserId) {
          console.log(`  ⚠️  跳过无效用户令牌`);
          continue;
        }
        
        // 检查令牌是否已过期
        if (new Date(oldToken.expiresAt) < new Date()) {
          console.log(`  ⏭️  跳过过期令牌`);
          continue;
        }
        
        await EmailVerificationToken.create({
          token: oldToken.token,
          userId: newUserId,
          expiresAt: new Date(oldToken.expiresAt)
        });
        tokenCount++;
      }
      console.log(`✅ 令牌迁移完成，共 ${tokenCount} 个有效令牌`);
    } else {
      console.log('  ℹ️  没有令牌数据需要迁移');
    }
    
    // 迁移登录日志
    console.log('\n📝 迁移登录日志...');
    if (dbData.loginLogs && dbData.loginLogs.length > 0) {
      let logCount = 0;
      const batchSize = 100; // 批量插入
      const logsToInsert = [];
      
      for (const oldLog of dbData.loginLogs) {
        const newUserId = oldLog.userId ? userIdMap.get(oldLog.userId) : null;
        
        logsToInsert.push({
          userId: newUserId,
          email: oldLog.email,
          success: oldLog.success,
          ip: oldLog.ip,
          userAgent: oldLog.userAgent,
          timestamp: oldLog.timestamp ? new Date(oldLog.timestamp) : new Date()
        });
        
        // 批量插入
        if (logsToInsert.length >= batchSize) {
          await LoginLog.insertMany(logsToInsert, { ordered: false });
          logCount += logsToInsert.length;
          logsToInsert.length = 0;
        }
      }
      
      // 插入剩余的日志
      if (logsToInsert.length > 0) {
        await LoginLog.insertMany(logsToInsert, { ordered: false });
        logCount += logsToInsert.length;
      }
      
      console.log(`✅ 日志迁移完成，共 ${logCount} 条记录`);
    } else {
      console.log('  ℹ️  没有日志数据需要迁移');
    }
    
    console.log('\n✨ 数据迁移完成！');
    console.log('\n📊 迁移统计:');
    console.log(`  - 用户数: ${await User.countDocuments()}`);
    console.log(`  - 密码重置令牌: ${await PasswordResetToken.countDocuments()}`);
    console.log(`  - 邮箱验证令牌: ${await EmailVerificationToken.countDocuments()}`);
    console.log(`  - 登录日志: ${await LoginLog.countDocuments()}`);
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// 检查是否有 --dry-run 参数
if (process.argv.includes('--dry-run')) {
  console.log('🏃 干运行模式，不实际写入数据');
}

migrateData();
