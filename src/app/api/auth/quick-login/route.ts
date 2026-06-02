import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/utils/jwt';

/**
 * 免验证登录接口（仅用于超级管理员测试）
 * 支持使用用户名"342"或邮箱"13960104@qq.com"直接登录
 */
export async function POST(request: NextRequest) {
  try {
    const { account } = await request.json();

    if (!account) {
      return NextResponse.json({
        code: 400,
        msg: '请输入账号',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 查找用户（支持用户名或邮箱）
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .or(`username.eq.${account},email.eq.${account}`)
      .single();

    if (error || !user) {
      return NextResponse.json({
        code: 404,
        msg: '用户不存在',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // 检查是否为管理员
    if (user.role !== 'admin') {
      return NextResponse.json({
        code: 403,
        msg: '无权使用此登录方式',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    // 检查账号状态
    if (user.status !== 'active') {
      return NextResponse.json({
        code: 403,
        msg: '账号已被禁用',
        data: null,
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    // 更新最后登录时间
    await client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // 生成JWT Token
    const token = generateToken({
      userId: user.id,
      email: user.email!,
      role: user.role!,
    });

    // 返回成功响应
    const response = NextResponse.json({
      code: 200,
      msg: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isPremium: user.is_premium,
          premiumExpiresAt: user.premium_expires_at,
        },
        token,
      },
      timestamp: new Date().toISOString(),
    });

    // 设置HttpOnly Cookie
    // 注意：在HTTPS环境下必须设置 secure: true
    const isProduction = process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:';
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('免验证登录失败:', error);
    return NextResponse.json({
      code: 500,
      msg: '服务器错误',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
