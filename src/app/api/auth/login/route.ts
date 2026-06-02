import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/utils/jwt';

// 超级管理员配置
const SUPER_ADMIN_EMAILS = ['13960104@qq.com'];
const SUPER_ADMIN_USERNAME = '342';

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
    const { email, code, deviceId } = await request.json();

    // 验证必填字段（邮箱必须）
    if (!email) {
      return errorResponse('请输入邮箱地址');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('请输入有效的邮箱地址');
    }

    const client = getSupabaseClient();

    // 查找用户
    console.log('[Login] 查询用户信息, email:', email);
    const { data: user, error: userError } = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('[Login] 查询用户失败:', userError);
      return errorResponse('查询用户信息失败，请稍后重试');
    }

    if (!user) {
      console.log('[Login] 用户不存在:', email);
      return errorResponse('该邮箱未注册，请先注册');
    }

    console.log('[Login] 找到用户:', user.id, user.email, user.username);

    // 检查账号状态
    if (user.status !== 'active') {
      const statusText: Record<string, string> = {
        suspended: '您的账号已被暂停，请联系管理员',
        banned: '您的账号已被永久封禁',
        deleted: '您的账号已被删除',
      };
      return errorResponse(statusText[user.status] || '账号状态异常');
    }

    // 检查是否为超级管理员
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email) || user.username === SUPER_ADMIN_USERNAME;

    // 验证逻辑
    let needVerificationCode = true;

    if (isSuperAdmin) {
      // 超级管理员不需要验证码
      needVerificationCode = false;
    } else if (deviceId && user.device_id && deviceId === user.device_id) {
      // 普通用户：设备标识匹配，跳过验证码
      needVerificationCode = false;
    }

    // 如果需要验证码但未提供
    if (needVerificationCode && !code) {
      return errorResponse('请输入验证码');
    }

    // 验证验证码（如果需要）
    if (needVerificationCode && code) {
      const now = new Date();
      const { data: verification, error: verificationError } = await client
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('type', 'login')
        .is('verified_at', null)
        .single();

      if (verificationError || !verification) {
        return errorResponse('验证码错误或已失效');
      }

      // 检查验证码是否过期
      const expiresAt = new Date(verification.expires_at);
      if (expiresAt < now) {
        return errorResponse('验证码已过期，请重新获取');
      }

      // 标记验证码已验证
      await client
        .from('email_verifications')
        .update({ verified_at: now.toISOString() })
        .eq('id', verification.id);
    }

    // 更新设备标识（如果有提供）
    if (deviceId && !isSuperAdmin) {
      if (!user.device_id || user.device_id !== deviceId) {
        // 新设备或设备标识改变，更新设备标识
        await client
          .from('users')
          .update({ device_id: deviceId })
          .eq('id', user.id);
      }
    }

    // 更新最后登录时间
    const now = new Date();
    await client
      .from('users')
      .update({ last_login_at: now.toISOString() })
      .eq('id', user.id);

    // 生成JWT Token
    const token = generateToken({
      userId: user.id,
      email: user.email!,
      role: user.role!,
    });

    console.log('[Login API] 设置Cookie: auth_token');
    console.log('[Login API] Token值:', token.substring(0, 20) + '...');

    // 创建 Response 并设置 Cookie
    const response = NextResponse.json({
      code: 200,
      msg: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isSuperAdmin,
        },
        token,
      },
      timestamp: new Date().toISOString(),
    });

    // 使用 Set-Cookie header 设置 Cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: false, // 开发环境必须为 false，否则 localhost 无法设置 Cookie
      sameSite: 'lax', // lax 模式兼容性更好，适合大多数场景
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
      domain: undefined, // 不设置 domain，使用默认值
    });

    console.log('[Login API] Cookie设置完成，返回响应');

    return response;
  } catch (error: any) {
    console.error('登录失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
