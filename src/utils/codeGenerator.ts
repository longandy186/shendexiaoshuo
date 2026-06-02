/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * 生成验证码过期时间（5分钟后）
 */
export function generateCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);
  return expiry;
}
