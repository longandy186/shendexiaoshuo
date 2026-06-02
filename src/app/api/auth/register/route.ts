import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/utils/jwt';
import { generateReferralCode } from '@/utils/referral';

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
    const { email, code, username, referralCode } = await request.json();

    // 验证必填字段
    if (!email || !code || !username) {
      return errorResponse('请填写完整信息');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('请输入有效的邮箱地址');
    }

    // 验证用户名
    if (username.length < 2 || username.length > 20) {
      return errorResponse('用户名长度应在2-20个字符之间');
    }

    // 验证推荐码（如果提供）
    let referrerId: string | null = null;
    if (referralCode) {
      if (!/^[A-Z0-9]{8}$/.test(referralCode)) {
        return errorResponse('推荐码格式无效');
      }

      const { data: referrer } = await getSupabaseClient()
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (!referrer) {
        return errorResponse('推荐码无效');
      }

      referrerId = referrer.id;
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUsername } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return errorResponse('该用户名已被使用');
    }

    // 检查邮箱是否已存在
    const { data: existingEmail } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      return errorResponse('该邮箱已被注册');
    }

    // 验证验证码
    const now = new Date();
    const { data: verification, error: verificationError } = await client
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'register')
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

    // 生成用户推荐码
    const userReferralCode = generateReferralCode();

    // 判断是否为超级管理员（支持多种识别方式）
    let role = 'user';

    // 方式1：通过邮箱识别
    if (email === 'longandy@163.com' || email === '13960104@qq.com') {
      role = 'admin';
    }

    // 方式2：通过用户名识别（342是超级管理员）
    if (username === '342') {
      role = 'admin';
    }

    // 计算会员到期时间（超级管理员无限期，普通用户7天免费试用）
    const premiumExpiresAt = role === 'admin'
      ? new Date('2099-12-31')  // 超级管理员无限期
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() + 7);
          return date;
        })();

    // 创建用户（直接使用正确的角色）
    const { data: newUser, error: userError } = await client
      .from('users')
      .insert({
        email,
        username,
        role: role,  // 使用正确的角色
        status: 'active',
        referral_code: userReferralCode,  // 使用下划线命名
        referred_by: referrerId,  // 使用下划线命名
        is_premium: true,  // 使用下划线命名
        premium_expires_at: premiumExpiresAt.toISOString(),  // 使用下划线命名
      })
      .select()
      .single();

    if (userError) {
      console.error('创建用户失败:', userError);
      return errorResponse('注册失败，请稍后重试');
    }

    // 标记验证码已验证
    await client
      .from('email_verifications')
      .update({ verified_at: now.toISOString() })  // 使用下划线命名
      .eq('id', verification.id);

    // 如果有推荐人，给推荐人增加7天奖励
    if (referrerId) {
      const { data: referrer } = await client
        .from('users')
        .select('premium_expires_at, referral_rewards')
        .eq('id', referrerId)
        .single();

      if (referrer) {
        const currentExpires = referrer.premium_expires_at
          ? new Date(referrer.premium_expires_at)
          : new Date();
        const newExpires = new Date(currentExpires);
        newExpires.setDate(newExpires.getDate() + 7);

        await client
          .from('users')
          .update({
            premium_expires_at: newExpires.toISOString(),  // 使用下划线命名
            is_premium: true,  // 使用下划线命名
            referral_rewards: (referrer.referral_rewards || 0) + 7,  // 使用下划线命名
          })
          .eq('id', referrerId);
      }
    }

    // 生成JWT Token（使用正确的角色）
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email!,
      role: role,
    });

    console.log('[Register API] 设置Cookie: auth_token');

    // 创建 Response 并设置 Cookie
    const response = NextResponse.json({
      code: 200,
      msg: '注册成功，已获得7天免费试用',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: role,
          isPremium: true,
          premiumExpiresAt: premiumExpiresAt.toISOString(),
        },
        token,
      },
      timestamp: new Date().toISOString(),
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: false, // 开发环境必须为 false，否则 localhost 无法设置 Cookie
      sameSite: 'lax', // lax 模式兼容性更好，适合大多数场景
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    console.log('[Register API] Cookie设置完成，返回响应');

    return response;
  } catch (error: any) {
    console.error('注册失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
