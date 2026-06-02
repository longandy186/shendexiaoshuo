import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface EmailConfigRequest {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
}

/**
 * 测试邮件配置（仅管理员使用）
 */
export async function POST(request: NextRequest) {
  try {
    const body: EmailConfigRequest = await request.json();

    // 创建临时邮件发送器
    const transporter = nodemailer.createTransport({
      host: body.host,
      port: body.port,
      secure: body.secure,
      auth: {
        user: body.user,
        pass: body.password,
      },
    });

    // 测试连接
    await transporter.verify();

    // 发送测试邮件
    await transporter.sendMail({
      from: body.from_email,
      to: body.user,
      subject: '邮件配置测试',
      text: '这是一封测试邮件，如果收到此邮件，说明邮件配置成功。',
    });

    return NextResponse.json({
      code: 200,
      msg: '邮件配置测试成功，测试邮件已发送',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('邮件配置测试失败:', error);
    return NextResponse.json({
      code: 400,
      msg: `邮件配置测试失败：${error.message}`,
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }
}
