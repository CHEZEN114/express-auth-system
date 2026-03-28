/**
 * 初始化管理员账户脚本
 * 用法: node scripts/init-admin.js [email] [password]
 * 默认: email=admin@example.com, password=Admin@123456
 */

const { initDb, findUserByEmail, getDb } = require('../db');
const bcrypt = require('bcryptjs');

async function initAdmin() {
  try {
    // 初始化数据库
    await initDb();
    const db = getDb();
    
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'Admin@123456';
    const username = 'admin';
    
    // 检查是否已存在管理员
    const existingUser = await findUserByEmail(email);
    
    if (existingUser) {
      // 如果用户存在，将其升级为管理员
      existingUser.role = 'admin';
      existingUser.isActive = true;
      existingUser.isEmailVerified = true;
      await db.write();
      console.log(`✅ 已将用户 ${email} 升级为管理员`);
    } else {
      // 创建新管理员账户
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const adminUser = {
        id: require('uuid').v4(),
        username: username,
        email: email.toLowerCase(),
        password: hashedPassword,
        isEmailVerified: true,
        role: 'admin',
        isActive: true,
        avatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      db.data.users.push(adminUser);
      await db.write();
      
      console.log('✅ 管理员账户创建成功！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  邮箱:    ${email}`);
      console.log(`  密码:    ${password}`);
      console.log(`  用户名:  ${username}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('请使用以上信息登录管理后台');
      console.log('访问: http://localhost:3000/login');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员失败:', error);
    process.exit(1);
  }
}

initAdmin();
