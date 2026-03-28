/**
 * 邮件服务
 * 提供各类邮件发送功能
 */

const ejs = require('ejs');
const path = require('path');
const { sendMail } = require('../config/email');

/**
 * 渲染邮件模板
 * @param {string} templateName - 模板名称
 * @param {object} data - 模板数据
 * @returns {Promise<string>} HTML 内容
 */
async function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, '..', 'config', 'email-templates', `${templateName}.ejs`);
  return ejs.renderFile(templatePath, data);
}

/**
 * 发送邮箱验证邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {string} verifyUrl - 验证链接
 * @param {number} expiresInHours - 过期时间（小时）
 */
async function sendVerificationEmail(to, username, verifyUrl, expiresInHours = 24) {
  try {
    const html = await renderTemplate('verification', {
      username,
      verifyUrl,
      expiresIn: `${expiresInHours}小时`,
      year: new Date().getFullYear()
    });
    
    const text = `
您好 ${username}，

感谢您注册我们的服务！请点击以下链接验证您的邮箱地址：
${verifyUrl}

此链接将在 ${expiresInHours}小时 后过期，请尽快完成验证。

如果您没有注册我们的服务，请忽略此邮件。
    `.trim();
    
    await sendMail({
      to,
      subject: '验证您的邮箱地址',
      text,
      html
    });
    
    console.log(`✉️ 验证邮件已发送至: ${to}`);
    return { success: true };
  } catch (error) {
    console.error('发送验证邮件失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送密码重置邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {string} resetUrl - 重置链接
 * @param {number} expiresInHours - 过期时间（小时）
 */
async function sendPasswordResetEmail(to, username, resetUrl, expiresInHours = 1) {
  try {
    const html = await renderTemplate('password-reset', {
      username,
      resetUrl,
      expiresIn: `${expiresInHours}小时`,
      year: new Date().getFullYear()
    });
    
    const text = `
您好 ${username}，

我们收到了您的密码重置请求。请点击以下链接重置密码：
${resetUrl}

此链接将在 ${expiresInHours}小时 后过期，请尽快完成操作。

如果您没有请求重置密码，请忽略此邮件。您的账户仍然安全。
    `.trim();
    
    await sendMail({
      to,
      subject: '重置您的密码',
      text,
      html
    });
    
    console.log(`✉️ 密码重置邮件已发送至: ${to}`);
    return { success: true };
  } catch (error) {
    console.error('发送密码重置邮件失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送通知邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} message - 邮件内容
 */
async function sendNotificationEmail(to, subject, message) {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    ${message}
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      &copy; ${new Date().getFullYear()} 用户认证系统
    </p>
  </div>
</body>
</html>
    `;
    
    await sendMail({
      to,
      subject,
      text: message.replace(/<[^>]*>/g, ''),
      html
    });
    
    console.log(`✉️ 通知邮件已发送至: ${to}`);
    return { success: true };
  } catch (error) {
    console.error('发送通知邮件失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 发送账户状态变更通知
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {boolean} isActivated - 是否被激活
 * @param {string} reason - 原因（可选）
 */
async function sendAccountStatusEmail(to, username, isActivated, reason = '') {
  const subject = isActivated ? '您的账户已恢复' : '您的账户已被禁用';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .status-icon {
      font-size: 48px;
      text-align: center;
      margin-bottom: 20px;
    }
    .status-box {
      background-color: ${isActivated ? '#d4edda' : '#f8d7da'};
      border: 1px solid ${isActivated ? '#c3e6cb' : '#f5c6cb'};
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-icon">${isActivated ? '✅' : '⚠️'}</div>
    <h2 style="text-align: center; color: #2c3e50;">${subject}</h2>
    
    <p>您好 ${username}，</p>
    
    <div class="status-box">
      <strong>${isActivated ? '您的账户已恢复正常使用。' : '您的账户已被管理员禁用。'}</strong>
      ${reason ? `<br><br>原因：${reason}` : ''}
    </div>
    
    ${isActivated 
      ? '<p>您现在可以正常登录并使用所有服务。</p>'
      : '<p>如果您对此有疑问，请联系管理员。</p>'
    }
    
    <div class="footer">
      <p>此邮件由系统自动发送，请勿回复。</p>
      <p>&copy; ${new Date().getFullYear()} 用户认证系统</p>
    </div>
  </div>
</body>
</html>
  `;
  
  await sendMail({
    to,
    subject,
    text: `${subject}\n\n您好 ${username}，\n\n${isActivated ? '您的账户已恢复正常使用。' : '您的账户已被管理员禁用。'}${reason ? `\n原因：${reason}` : ''}`,
    html
  });
  
  console.log(`✉️ 账户状态邮件已发送至: ${to}`);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendAccountStatusEmail
};
