import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendVerificationCode } from '@/services/emailService';
import { generateVerificationCode, generateCodeExpiry } from '@/utils/codeGenerator';

/**
 * 统一响应格式
 */
function successResponse(data: any, message: string = '操作成功') {
  return NextResponse.json({
    code: 200,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(message: string, code: number = 400, data: any = null) {
  return NextResponse.json({
    code,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code });
}

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'register' } = await request.json();

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return errorResponse('请输入有效的邮箱地址');
    }

    // 验证类型
    if (type !== 'register' && type !== 'login') {
      return errorResponse('验证类型无效');
    }

    const client = getSupabaseClient();

    // 检查邮箱是否已存在（注册时）
    if (type === 'register') {
      const { data: existingUser } = await client
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return errorResponse('该邮箱已被注册，请直接登录');
      }
    }

    // 检查邮箱是否存在（登录时）
    if (type === 'login') {
      const { data: existingUser } = await client
        .from('users')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (!existingUser) {
        return errorResponse('该邮箱未注册，请先注册');
      }

      if (existingUser.status !== 'active') {
        const statusText: Record<string, string> = {
          suspended: '您的账号已被暂停',
          banned: '您的账号已被永久封禁',
          deleted: '您的账号已被删除',
        };
        return errorResponse(statusText[existingUser.status] || '账号状态异常');
      }
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = generateCodeExpiry();

    // 删除该邮箱旧的验证码
    await client
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .eq('type', type);

    // 保存验证码到数据库（使用数据库实际列名）
    const { error: insertError } = await client
      .from('email_verifications')
      .insert({
        email,
        code,
        type,
        expires_at: expiresAt.toISOString(), // 使用下划线命名
      });

    if (insertError) {
      console.error('保存验证码失败，数据库错误:', insertError);
      console.error('错误详情:', JSON.stringify(insertError, null, 2));
      return errorResponse(`验证码生成失败：${insertError.message}`);
    }

    // 发送验证码邮件
    const emailResult = await sendVerificationCode(email, code, type);

    if (!emailResult.success) {
      console.error('邮件发送失败:', emailResult.message);
      return errorResponse(`邮件发送失败：${emailResult.message}`);
    }

    return successResponse(
      { email, type },
      '验证码已发送至您的邮箱，5分钟内有效'
    );
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
