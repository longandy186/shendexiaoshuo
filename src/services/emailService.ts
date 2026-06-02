import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// 邮箱配置
const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.163.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER || 'your_email@163.com',
  pass: process.env.EMAIL_PASS || 'your_password',
  from: process.env.EMAIL_FROM || 'your_email@163.com',
};

// 创建邮件发送器
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

/**
 * 发送验证码邮件
 * @param to 收件人邮箱
 * @param code 验证码
 * @param type 验证类型 (register/login)
 */
export async function sendVerificationCode(
  to: string,
  code: string,
  type: 'register' | 'login' = 'register'
): Promise<{ success: boolean; message: string }> {
  try {
    const typeText = type === 'register' ? '注册' : '登录';
    const subject = `【神的小说工坊】${typeText}验证码`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">神的小说工坊</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI智能创作平台</p>
        </div>
        <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            您好！
          </p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            您正在进行${typeText}操作，验证码为：
          </p>
          <div style="background: #ffffff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #667eea;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            验证码有效期为5分钟，请勿泄露给他人。如非本人操作，请忽略此邮件。
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              此邮件由系统自动发送，请勿直接回复<br/>
              © 2024 神的小说工坊 版权所有
            </p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      html,
    });

    return { success: true, message: '验证码已发送' };
  } catch (error: any) {
    console.error('发送邮件失败:', error);
    return {
      success: false,
      message: error.message || '发送邮件失败',
    };
  }
}

/**
 * 测试邮件配置
 */
export async function testEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('邮件配置测试失败:', error);
    return false;
  }
}
