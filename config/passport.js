/**
 * Passport 配置 - OAuth 认证
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const {
  findUserByEmail,
  createUser,
  findUserById
} = require('../db');

// 序列化用户（存储用户 ID 到 session）
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 反序列化用户（从 session 中恢复用户）
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    // 返回时不包含密码
    if (user) {
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } else {
      done(null, null);
    }
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth 策略
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // 查找或创建用户
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(null, false, { message: '无法获取您的邮箱地址' });
      }
      
      let user = await findUserByEmail(email);
      
      if (user) {
        // 更新用户的 Google ID 和头像（如果还没有）
        if (!user.googleId) {
          user.googleId = profile.id;
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
        }
        return done(null, user);
      }
      
      // 创建新用户
      const username = profile.displayName || email.split('@')[0];
      const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
      
      user = await createUser(
        username,
        email,
        // 生成随机密码（OAuth 用户不需要密码登录）
        Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16),
        true // 邮箱已通过 Google 验证
      );
      
      // 保存 OAuth 信息
      const dbUser = await findUserById(user.id);
      dbUser.googleId = profile.id;
      dbUser.avatar = avatar;
      await require('../db').getDb().write();
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// GitHub OAuth 策略
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // 查找或创建用户
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(null, false, { message: '无法获取您的邮箱地址，请确保您的 GitHub 账户已设置公开邮箱' });
      }
      
      let user = await findUserByEmail(email);
      
      if (user) {
        // 更新用户的 GitHub ID 和头像（如果还没有）
        if (!user.githubId) {
          user.githubId = profile.id;
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
        }
        return done(null, user);
      }
      
      // 创建新用户
      const username = profile.username || profile.displayName || email.split('@')[0];
      const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
      
      user = await createUser(
        username,
        email,
        // 生成随机密码
        Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16),
        true // 邮箱已通过 GitHub 验证
      );
      
      // 保存 OAuth 信息
      const dbUser = await findUserById(user.id);
      dbUser.githubId = profile.id;
      dbUser.avatar = avatar;
      await require('../db').getDb().write();
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

module.exports = passport;
