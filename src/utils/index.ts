/**
 * 工具函数库
 * 提供常用的纯函数工具方法
 * 符合技术文档 7.1 utils/ 目录规范
 */

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        (clonedObj as any)[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * XSS 防护 - 转义 HTML 特殊字符
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 验证用户名
 */
export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, message: '用户名不能为空' };
  }

  if (username.length < 2) {
    return { valid: false, message: '用户名至少需要2个字符' };
  }

  if (username.length > 20) {
    return { valid: false, message: '用户名不能超过20个字符' };
  }

  // 只允许字母、数字、下划线、中文
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线和中文' };
  }

  return { valid: true };
}

/**
 * 验证邮箱
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: '邮箱不能为空' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }

  return { valid: true };
}

/**
 * 计算字符串字数（中文字符算2个字）
 */
export function countWords(text: string): number {
  if (!text) return 0;
  
  let count = 0;
  for (const char of text) {
    // 中文字符（包括标点）
    if (/[\u4e00-\u9fa5\uff00-\uffef]/.test(char)) {
      count += 1;
    } else {
      count += 0.5;
    }
  }
  
  return Math.floor(count);
}

/**
 * 截断文本
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 保存到 localStorage
 */
export function saveToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    console.error('[Storage] saveToLocalStorage: window 对象不可用');
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('保存到 localStorage 失败:', error);
  }
}

/**
 * 从 localStorage 加载
 */
export function loadFromLocalStorage<T>(key: string, defaultValue?: T): T | null {
  if (typeof window === 'undefined') {
    console.error('[Storage] loadFromLocalStorage: window 对象不可用');
    return defaultValue ?? null;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : (defaultValue ?? null);
  } catch (error) {
    console.error('从 localStorage 加载失败:', error);
    return defaultValue ?? null;
  }
}

/**
 * 从 localStorage 删除
 */
export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') {
    console.error('[Storage] removeFromLocalStorage: window 对象不可用');
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('从 localStorage 删除失败:', error);
  }
}

/**
 * 获取随机颜色
 */
export function getRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * 睡眠函数（用于测试和延迟）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
