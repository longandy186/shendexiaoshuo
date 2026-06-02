import { MEMBERSHIP_PLANS, PAYMENT_METHODS } from '@/config/payment';
import { generateOrderNo, generateTransactionId } from '@/utils/order';

export interface CreatePaymentParams {
  userId: string;
  planId: string;
  paymentMethod: 'wechat' | 'alipay';
}

export interface PaymentResult {
  success: boolean;
  orderNo?: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
}

/**
 * 创建支付订单（模拟）
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<PaymentResult> {
  try {
    const { userId, planId, paymentMethod } = params;

    // 验证套餐
    const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, error: '套餐不存在' };
    }

    // 验证支付方式
    const paymentMethodConfig = Object.values(PAYMENT_METHODS).find(
      (m) => m.id === paymentMethod
    );
    if (!paymentMethodConfig || !paymentMethodConfig.enabled) {
      return { success: false, error: '支付方式不可用' };
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 模拟支付URL（实际需要调用微信/支付宝API）
    const paymentUrl = `/payment/mock?orderNo=${orderNo}&method=${paymentMethod}`;

    // 模拟二维码（实际需要从微信/支付宝API获取）
    const qrCode = `mock_qr_code_${orderNo}`;

    return {
      success: true,
      orderNo,
      paymentUrl,
      qrCode,
    };
  } catch (error: any) {
    console.error('创建支付失败:', error);
    return { success: false, error: '创建支付失败' };
  }
}

/**
 * 查询支付状态（模拟）
 */
export async function queryPaymentStatus(orderNo: string): Promise<{
  paid: boolean;
  transactionId?: string;
}> {
  // 模拟：实际需要调用微信/支付宝API查询订单状态
  // 这里返回未支付状态
  return { paid: false };
}

/**
 * 模拟支付成功回调
 */
export async function mockPaymentSuccess(orderNo: string): Promise<{
  success: boolean;
  transactionId: string;
}> {
  return {
    success: true,
    transactionId: generateTransactionId(),
  };
}
