import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken, extractTokenFromHeader } from '@/utils/jwt';

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

export async function GET(request: NextRequest) {
  try {
    // 从Cookie中获取Token
    const token = request.cookies.get('auth_token')?.value;

    console.log('[Me API] 收到请求');
    console.log('[Me API] 所有Cookie:', request.cookies.getAll());
    console.log('[Me API] Cookie中是否有auth_token:', !!token);
    console.log('[Me API] auth_token值:', token ? token.substring(0, 20) + '...' : 'null');

    if (!token) {
      console.log('[Me API] 未找到auth_token，返回401');
      return errorResponse('未登录', 401);
    }

    console.log('[Me API] 开始验证token...');

    // 验证Token
    const payload = verifyToken(token);

    console.log('[Me API] Token验证结果:', !!payload);

    if (!payload) {
      console.log('[Me API] Token无效或已过期');
      return errorResponse('Token无效或已过期', 401);
    }

    console.log('[Me API] Token有效，用户ID:', payload.userId);

    // 查询用户信息（包含会员信息）
    const client = getSupabaseClient();
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, email, username, role, status, last_login_at, created_at, updated_at, is_premium, premium_expires_at')
      .eq('id', payload.userId)
      .single();

    console.log('[Me API] 查询用户结果:', user ? '成功' : '失败');
    console.log('[Me API] userError:', userError ? JSON.stringify(userError) : 'null');
    console.log('[Me API] userId:', payload.userId);

    if (userError || !user) {
      console.log('[Me API] 用户不存在');
      return errorResponse('用户不存在', 404);
    }

    // 检查账号状态
    if (user.status !== 'active') {
      const statusText: Record<string, string> = {
        suspended: '您的账号已被暂停',
        banned: '您的账号已被永久封禁',
        deleted: '您的账号已被删除',
      };
      console.log('[Me API] 账号状态异常:', user.status);
      return errorResponse(statusText[user.status] || '账号状态异常', 403);
    }

    console.log('[Me API] 返回用户信息:', user.email);

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isPremium: user.is_premium,
        premiumExpiresAt: user.premium_expires_at,
      },
    });
  } catch (error: any) {
    console.error('[Me API] 获取用户信息失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
