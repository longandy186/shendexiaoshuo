import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth } from '@/utils/auth';
import { createPayment, mockPaymentSuccess } from '@/services/paymentService';
import { MEMBERSHIP_PLANS } from '@/config/payment';
import { generateOrderNo, generateTransactionId } from '@/utils/order';

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
 * GET - 获取会员套餐列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 获取用户会员信息
    const { data: userData } = await client
      .from('users')
      .select('is_premium, premium_expires_at, referral_code, referral_rewards')
      .eq('id', user.userId)
      .single();

    return successResponse({
      plans: MEMBERSHIP_PLANS,
      userMembership: {
        isPremium: userData?.is_premium || false,
        premiumExpiresAt: userData?.premium_expires_at,
        referralCode: userData?.referral_code,
        referralRewards: userData?.referral_rewards || 0,
      },
    });
  } catch (error: any) {
    console.error('获取会员信息失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}

/**
 * POST - 创建订单
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const { planId, paymentMethod } = await request.json();

    // 验证参数
    if (!planId || !paymentMethod) {
      return errorResponse('请选择套餐和支付方式');
    }

    // 验证套餐
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return errorResponse('套餐不存在');
    }

    // 验证支付方式
    if (!['wechat', 'alipay'].includes(paymentMethod)) {
      return errorResponse('支付方式无效');
    }

    const client = getSupabaseClient();
    const orderNo = generateOrderNo();

    // 创建订单
    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: user.userId,
        amount: plan.price.toString(),
        duration: plan.duration,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('创建订单失败:', orderError);
      return errorResponse('创建订单失败');
    }

    // 创建支付
    const paymentResult = await createPayment({
      userId: user.userId,
      planId,
      paymentMethod: paymentMethod as 'wechat' | 'alipay',
    });

    if (!paymentResult.success) {
      return errorResponse(paymentResult.error || '创建支付失败');
    }

    return successResponse({
      order: {
        id: order.id,
        orderNo: order.order_no,
        amount: plan.price,
        duration: plan.duration,
        paymentMethod,
        status: 'pending',
      },
      payment: {
        paymentUrl: paymentResult.paymentUrl,
        qrCode: paymentResult.qrCode,
      },
      plan,
    }, '订单创建成功');
  } catch (error: any) {
    console.error('创建订单失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
