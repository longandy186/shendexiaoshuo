/**
 * 存储规则配置
 * 
 * 【强制规则】所有数据存储必须使用数据库，禁止使用本地存储
 * 
 * 原因：
 * 1. 数据安全：本地存储容易被清除，数据丢失风险高
 * 2. 多端同步：数据库存储支持多设备访问
 * 3. 数据备份：数据库有完善的备份机制
 * 4. 权限控制：数据库可以实现精细的权限管理
 * 
 * 禁止使用的存储方式：
 * - localStorage
 * - sessionStorage
 * - IndexedDB
 * - Cookie（仅用于会话管理除外）
 * 
 * 允许的存储方式：
 * - Supabase PostgreSQL 数据库
 * - 对象存储（用于文件）
 */

// 存储类型定义
export const STORAGE_RULES = {
  // 数据库存储（推荐）
  DATABASE: 'database',
  
  // 对象存储（用于文件）
  OBJECT_STORAGE: 'object_storage',
  
  // 会话存储（仅用于登录状态）
  SESSION: 'session',
} as const;

/**
 * 检查是否允许使用本地存储
 * 在开发环境下会输出警告，生产环境抛出错误
 */
export function checkLocalStorageUsage(context: string): void {
  const message = `[存储规则违规] ${context} 尝试使用 localStorage。所有数据必须存储到数据库！`;
  
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

/**
 * 获取数据库存储的表名配置
 */
export const DATABASE_TABLES = {
  USERS: 'users',
  NOVELS: 'novels',
  CHAPTERS: 'chapters',
  CHAPTER_OUTLINES: 'chapter_outlines',  // 章节大纲
  NOVEL_NOTES: 'novel_notes',              // 小说笔记
  OPERATION_LOGS: 'operation_logs',
  ORDERS: 'orders',
  REFERRALS: 'referrals',
} as const;

/**
 * 存储数据类型
 */
export type StorageTable = typeof DATABASE_TABLES[keyof typeof DATABASE_TABLES];
