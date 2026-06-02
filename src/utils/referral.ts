/**
 * 生成推荐码（8位随机字符）
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成推荐链接
 * @param referralCode 推荐码
 */
export function generateReferralUrl(referralCode: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/?ref=${referralCode}`;
  }
  return `/?ref=${referralCode}`;
}

/**
 * 从URL中提取推荐码
 * @param url URL字符串或当前URL
 */
export function extractReferralCode(url: string | URL = window.location.href): string | null {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    return urlObj.searchParams.get('ref');
  } catch {
    return null;
  }
}

/**
 * 验证推荐码格式
 * @param code 推荐码
 */
export function isValidReferralCode(code: string): boolean {
  // 8位大写字母或数字
  return /^[A-Z0-9]{8}$/.test(code);
}
