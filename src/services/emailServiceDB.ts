import nodemailer from 'nodemailer';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

let transporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从数据库获取邮件配置
 */
async function getEmailConfig(): Promise<EmailConfig | null> {
  // 检查缓存
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const client = getSupabaseClient();
    console.log('[EmailServiceDB] 查询邮件配置...');

    const { data: config, error } = await client
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[EmailServiceDB] 查询邮件配置失败:', error);
      return null;
    }

    if (!config) {
      console.error('[EmailServiceDB] 未找到邮件配置');
      return null;
    }

    console.log('[EmailServiceDB] 找到邮件配置:', config.host);

    const emailConfig: EmailConfig = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: config.password,
      from: config.from_email,
    };

    // 更新缓存
    cachedConfig = emailConfig;
    cacheExpiry = now + CACHE_DURATION;

    return emailConfig;
  } catch (error) {
    console.error('[EmailServiceDB] 获取邮件配置失败:', error);
    return null;
  }
}

/**
 * 获取或创建邮件发送器
 */
async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const config = await getEmailConfig();
  if (!config) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return transporter;
}

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
    const transporter = await getTransporter();
    if (!transporter) {
      return {
        success: false,
        message: '邮件配置未设置',
      };
    }

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
    const transporter = await getTransporter();
    if (!transporter) {
      return false;
    }
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('邮件配置测试失败:', error);
    return false;
  }
}

/**
 * 清除配置缓存
 */
export function clearEmailConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}
