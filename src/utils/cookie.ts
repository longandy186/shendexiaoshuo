/**
 * 检查 Cookie 是否存在（仅用于调试）
 * 注意：由于 HttpOnly Cookie 无法通过 JavaScript 读取，这里只能检测非 HttpOnly Cookie
 */
export function checkCookies(): void {
  if (typeof window === 'undefined') return;

  console.log('[Cookie Check] 所有可访问的Cookie:');
  const cookies = document.cookie.split(';');
  cookies.forEach((cookie, index) => {
    console.log(`[Cookie Check] ${index + 1}: ${cookie.trim()}`);
  });

  console.log('[Cookie Check] 注意：HttpOnly Cookie 无法通过 JavaScript 访问');
  console.log('[Cookie Check] auth_token 是否存在：', document.cookie.includes('auth_token'));
}

/**
 * 尝试通过 fetch 检查 Cookie 是否存在
 */
export async function checkCookieViaAPI(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/me');
    const result = await response.json();
    console.log('[Cookie Check API] 返回结果:', result);
    return result.code === 200;
  } catch (error) {
    console.error('[Cookie Check API] 检查失败:', error);
    return false;
  }
}
