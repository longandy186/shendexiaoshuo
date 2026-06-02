/**
 * 统一的时间格式化工具函数
 * 处理各种时间显示场景，提供一致的用户体验
 */

/**
 * 格式化日期时间为易读的相对时间或完整日期
 * @param dateString - 日期字符串（ISO 8601 格式）
 * @returns 格式化后的时间字符串
 * 
 * 显示规则：
 * - < 1分钟: "刚刚"
 * - < 1小时: "X分钟前"
 * - < 24小时: "X小时前"
 * - < 7天: "X天前"
 * - >= 7天: "YYYY/MM/DD"
 * 
 * 异常处理：
 * - 空值/undefined: 返回"未知时间"
 * - 无效日期: 返回"未知时间"
 * - 解析失败: 返回"未知时间"
 */
export function formatDateTime(dateString?: string | null): string {
  // 检查日期字符串是否存在
  if (!dateString) {
    console.warn('[DateUtils] formatDateTime: 日期字符串为空');
    return '未知时间';
  }

  try {
    const date = new Date(dateString);

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] formatDateTime: 无效的日期格式:', dateString);
      return '未知时间';
    }

    const now = new Date();

    // 检查 now 是否有效
    if (isNaN(now.getTime())) {
      console.error('[DateUtils] formatDateTime: 当前时间无效');
      return formatDate(date);
    }

    const diff = now.getTime() - date.getTime();

    // 检查时间差是否有效
    if (isNaN(diff) || diff < 0) {
      console.warn('[DateUtils] formatDateTime: 时间差计算异常:', {
        dateString,
        date: date.toISOString(),
        now: now.toISOString(),
        diff,
      });
      return formatDate(date);
    }

    const diffMins = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    // 相对时间显示
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    // 超过7天显示完整日期
    return formatDate(date);
  } catch (error) {
    console.error('[DateUtils] formatDateTime: 格式化日期时出错:', {
      dateString,
      error: error instanceof Error ? error.message : String(error),
    });
    return '未知时间';
  }
}

/**
 * 格式化日期为完整日期字符串
 * @param dateString - 日期字符串或 Date 对象
 * @returns 格式化后的日期字符串 (YYYY/MM/DD)
 */
export function formatDate(dateString?: string | null | Date): string {
  if (!dateString) return '未知时间';

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] formatDate: 无效的日期格式:', dateString);
      return '未知时间';
    }

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('[DateUtils] formatDate: 格式化日期时出错:', {
      dateString,
      error: error instanceof Error ? error.message : String(error),
    });
    return '未知时间';
  }
}

/**
 * 格式化日期时间为完整日期时间字符串
 * @param dateString - 日期字符串或 Date 对象
 * @returns 格式化后的日期时间字符串 (YYYY/MM/DD HH:mm)
 */
export function formatDateTimeFull(dateString?: string | null | Date): string {
  if (!dateString) return '未知时间';

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] formatDateTimeFull: 无效的日期格式:', dateString);
      return '未知时间';
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('[DateUtils] formatDateTimeFull: 格式化日期时出错:', {
      dateString,
      error: error instanceof Error ? error.message : String(error),
    });
    return '未知时间';
  }
}

/**
 * 检查日期是否有效
 * @param dateString - 日期字符串或 Date 对象
 * @returns 是否为有效日期
 */
export function isValidDate(dateString?: string | null | Date): boolean {
  if (!dateString) return false;

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
