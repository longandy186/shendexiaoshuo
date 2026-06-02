import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth } from '@/utils/auth';
import { queryPaymentStatus, mockPaymentSuccess } from '@/services/paymentService';

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
 * GET - 查询订单状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const { orderNo } = await params;

    const client = getSupabaseClient();

    // 查询订单
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .eq('user_id', user.userId)
      .single();

    if (orderError || !order) {
      return errorResponse('订单不存在', 404);
    }

    // 如果订单已支付，返回用户会员信息
    if (order.status === 'paid') {
      const { data: userData } = await client
        .from('users')
        .select('is_premium, premium_expires_at')
        .eq('id', user.userId)
        .single();

      return successResponse({
        order: transformOrderFields(order),
        userMembership: {
          isPremium: userData?.is_premium || false,
          premiumExpiresAt: userData?.premium_expires_at,
        },
      });
    }

    // 模拟查询支付状态
    const paymentStatus = await queryPaymentStatus(orderNo);

    // 如果支付成功，更新订单状态和用户会员信息
    if (paymentStatus.paid && paymentStatus.transactionId) {
      const now = new Date();

      // 更新订单状态
      await client
        .from('orders')
        .update({
          status: 'paid',
          transaction_id: paymentStatus.transactionId,
          paid_at: now.toISOString(),
        })
        .eq('id', order.id);

      // 更新用户会员信息
      const { data: currentUser } = await client
        .from('users')
        .select('premium_expires_at')
        .eq('id', user.userId)
        .single();

      const currentExpires = currentUser?.premium_expires_at
        ? new Date(currentUser.premium_expires_at)
        : new Date();
      const newExpires = new Date(currentExpires);
      newExpires.setDate(newExpires.getDate() + order.duration);

      await client
        .from('users')
        .update({
          is_premium: true,
          premium_expires_at: newExpires.toISOString(),
        })
        .eq('id', user.userId);

      // 获取更新后的用户信息
      const { data: updatedUser } = await client
        .from('users')
        .select('is_premium, premium_expires_at')
        .eq('id', user.userId)
        .single();

      return successResponse({
        order: transformOrderFields({
          ...order,
          status: 'paid',
          transaction_id: paymentStatus.transactionId,
          paid_at: now.toISOString(),
        }),
        userMembership: {
          isPremium: updatedUser?.is_premium || false,
          premiumExpiresAt: updatedUser?.premium_expires_at,
        },
      });
    }

    return successResponse({ order: transformOrderFields(order) });
  } catch (error: any) {
    console.error('查询订单失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}

/**
 * POST - 模拟支付成功（仅用于测试）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const { orderNo } = await params;

    const client = getSupabaseClient();

    // 查询订单
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .eq('user_id', user.userId)
      .eq('status', 'pending')
      .single();

    if (orderError || !order) {
      return errorResponse('订单不存在或已支付', 404);
    }

    const now = new Date();

    // 生成模拟交易号
    const { transactionId } = await mockPaymentSuccess(orderNo);

    // 更新订单状态
    await client
      .from('orders')
      .update({
        status: 'paid',
        transaction_id: transactionId,
        paid_at: now.toISOString(),
      })
      .eq('id', order.id);

    // 更新用户会员信息
    const { data: currentUser } = await client
      .from('users')
      .select('premium_expires_at')
      .eq('id', user.userId)
      .single();

    const currentExpires = currentUser?.premium_expires_at
      ? new Date(currentUser.premium_expires_at)
      : new Date();
    const newExpires = new Date(currentExpires);
    newExpires.setDate(newExpires.getDate() + order.duration);

    await client
      .from('users')
      .update({
        is_premium: true,
        premium_expires_at: newExpires.toISOString(),
      })
      .eq('id', user.userId);

    // 获取更新后的用户信息
    const { data: updatedUser } = await client
      .from('users')
      .select('is_premium, premium_expires_at')
      .eq('id', user.userId)
      .single();

    return successResponse({
      order: transformOrderFields({
        ...order,
        status: 'paid',
        transaction_id: transactionId,
        paid_at: now.toISOString(),
      }),
      userMembership: {
        isPremium: updatedUser?.is_premium || false,
        premiumExpiresAt: updatedUser?.premium_expires_at,
      },
    }, '支付成功');
  } catch (error: any) {
    console.error('模拟支付失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
