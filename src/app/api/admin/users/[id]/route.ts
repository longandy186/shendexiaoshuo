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
 * 将用户数据库字段转换为前端驼峰命名
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
    deviceId: user.device_id,
  };
}

/**
 * 将订单数据库字段转换为前端驼峰命名
 */
function transformOrderFields(order: any) {
  return {
    id: order.id,
    orderNo: order.order_no,
    userId: order.user_id,
    amount: order.amount,
    duration: order.duration,
    paymentMethod: order.payment_method,
    status: order.status,
    transactionId: order.transaction_id,
    paidAt: order.paid_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

/**
 * 将小说数据库字段转换为前端驼峰命名
 */
function transformNovelFields(novel: any) {
  return {
    id: novel.id,
    userId: novel.user_id,
    title: novel.title,
    description: novel.description,
    genre: novel.genre,
    status: novel.status,
    coverImage: novel.cover_image,
    chaptersCount: novel.chapters_count,
    wordsCount: novel.words_count,
    createdAt: novel.created_at,
    updatedAt: novel.updated_at,
  };
}

/**
 * GET - 获取用户详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponse('权限不足', 403);
    }

    const { id } = await params;
    const client = getSupabaseClient();

    // 获取用户基本信息
    const { data: user, error: userError } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return errorResponse('用户不存在', 404);
    }

    // 获取订单记录
    const { data: orders } = await client
      .from('orders')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 获取小说记录
    const { data: novels } = await client
      .from('novels')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    // 获取推荐记录（用户推荐的）
    const { data: referrals } = await client
      .from('users')
      .select('id, username, email, created_at')
      .eq('referred_by', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 统计数据
    const stats = {
      totalOrders: orders?.length || 0,
      paidOrders: orders?.filter(o => o.status === 'paid').length || 0,
      totalRevenue: orders?.filter(o => o.status === 'paid').reduce((sum, o) => sum + parseFloat(o.amount || '0'), 0) || 0,
      totalNovels: novels?.length || 0,
      totalChapters: novels?.reduce((sum, n) => sum + (n.chaptersCount || 0), 0) || 0,
      totalReferrals: referrals?.length || 0,
    };

    return successResponse({
      user: transformUserFields(user),
      orders: orders ? orders.map(transformOrderFields) : [],
      novels: novels ? novels.map(transformNovelFields) : [],
      referrals: referrals ? referrals.map((r: any) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        createdAt: r.created_at,
      })) : [],
      stats,
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}

/**
 * PUT - 更新用户状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponse('权限不足', 403);
    }

    const { id } = await params;
    const body = await request.json();

    const client = getSupabaseClient();

    // 更新用户状态
    const { data, error } = await client
      .from('users')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse('更新失败', 500);
    }

    return successResponse(transformUserFields(data), '用户状态已更新');
  } catch (error: any) {
    console.error('更新用户状态失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}

/**
 * DELETE - 删除用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponse('权限不足', 403);
    }

    const { id } = await params;
    const client = getSupabaseClient();

    // 软删除用户（设置状态为 deleted）
    const { data, error } = await client
      .from('users')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse('删除失败', 500);
    }

    return successResponse(transformUserFields(data), '用户已删除');
  } catch (error: any) {
    console.error('删除用户失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
