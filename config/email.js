/**
 * 邮件服务配置
 * 支持 SMTP、SendGrid 等多种邮件发送方式
 */

const nodemailer = require('nodemailer');

// 邮件服务配置
const emailConfig = {
  // 邮件服务提供商: 'smtp', 'sendgrid', 'console' (开发环境)
  provider: process.env.EMAIL_PROVIDER || 'console',
  
  // 发件人信息
  from: {
    name: process.env.EMAIL_FROM_NAME || '用户认证系统',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'
  },
  
  // SMTP 配置
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  
  // SendGrid 配置
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || ''
  }
};

// 创建 Nodemailer 传输器
let transporter = null;

async function createTransporter() {
  if (transporter) return transporter;
  
  switch (emailConfig.provider) {
    case 'smtp':
      transporter = nodemailer.createTransporter({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth,
        tls: {
          rejectUnauthorized: false
        }
      });
      break;
      
    case 'sendgrid':
      // 如果安装了 @sendgrid/mail 则使用它，否则使用 SMTP 方式
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(emailConfig.sendgrid.apiKey);
        transporter = {
          sendMail: async (options) => {
            const msg = {
              to: options.to,
              from: options.from,
              subject: options.subject,
              text: options.text,
              html: options.html
            };
            return sgMail.send(msg);
          }
        };
      } catch (error) {
        console.warn('SendGrid 未安装，切换到控制台模式');
        transporter = createConsoleTransporter();
      }
      break;
      
    case 'console':
    default:
      transporter = createConsoleTransporter();
      break;
  }
  
  return transporter;
}

// 控制台邮件发送器（开发环境）
function createConsoleTransporter() {
  return {
    sendMail: async (options) => {
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║                    📧 邮件发送（模拟）                    ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`  收件人: ${options.to}`);
      console.log(`  发件人: ${options.from}`);
      console.log(`  主题:   ${options.subject}`);
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('  内容:');
      console.log('─────────────────────────────────────────────────────────');
      if (options.html) {
        // 移除 HTML 标签，显示纯文本
        const textContent = options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
      } else {
        console.log(options.text);
      }
      console.log('─────────────────────────────────────────────────────────');
      console.log('╚══════════════════════════════════════════════════════════╝\n');
      
      return { messageId: 'console-' + Date.now() };
    }
  };
}

// 发送邮件（异步，不阻塞）
async function sendMail(options) {
  try {
    const transport = await createTransporter();
    
    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    // 异步发送，不等待结果
    transport.sendMail(mailOptions).catch(error => {
      console.error('邮件发送失败:', error);
    });
    
    return { success: true };
  } catch (error) {
    console.error('邮件发送错误:', error);
    return { success: false, error: error.message };
  }
}

// 验证邮件配置
async function verifyEmailConfig() {
  try {
    if (emailConfig.provider === 'console') {
      console.log('📧 邮件服务: 控制台模式（开发环境）');
      return true;
    }
    
    const transport = await createTransporter();
    
    if (emailConfig.provider === 'smtp') {
      await transport.verify();
    }
    
    console.log(`✅ 邮件服务配置正常 (${emailConfig.provider})`);
    return true;
  } catch (error) {
    console.error('❌ 邮件服务配置错误:', error.message);
    return false;
  }
}

module.exports = {
  emailConfig,
  sendMail,
  verifyEmailConfig
};
