import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/utils/auth';

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

/**
 * 将数据库字段转换为前端驼峰命名
 */
function transformUserFields(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    updatedAt: user.updated_at,
    isPremium: user.is_premium,
    premiumExpiresAt: user.premium_expires_at,
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    referralRewards: user.referral_rewards,
  };
}

/**
 * GET - 获取所有用户列表（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 权限检查
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponse('权限不足', 403);
    }

    const client = getSupabaseClient();

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    // 构建查询
    let query = client
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 搜索过滤
    if (search) {
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    // 状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    // 角色过滤
    if (role) {
      query = query.eq('role', role);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // 执行查询
    const { data: users, error, count } = await query;

    if (error) {
      console.error('获取用户列表失败:', error);
      return errorResponse('获取用户列表失败');
    }

    return successResponse({
      users: users ? users.map(transformUserFields) : [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
