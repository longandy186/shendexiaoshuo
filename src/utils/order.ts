import { format } from 'date-fns';

/**
 * 生成订单号
 * 格式: NO20240101120000XXXX (时间戳 + 4位随机数)
 */
export function generateOrderNo(): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `NO${timestamp}${random}`;
}

/**
 * 生成交易号（用于支付平台）
 */
export function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `TXN${timestamp}${random}`;
}
