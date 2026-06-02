/**
 * 语言风格提示词库
 * 用于 AI 创作时的语言风格指导
 * 
 * 注意：此文件现在仅提供类型定义，实际数据从 localStorage 读取
 * 使用 src/lib/prompt-library.ts 中的函数进行管理
 */

import { getLanguageStyles, getLanguageStyleById, getRecommendedStyles } from './prompt-library';

export type { LanguageStyle } from './prompt-library';

/**
 * 获取所有语言风格（从 localStorage 读取）
 */
export const LANGUAGE_STYLES = getLanguageStyles();

/**
 * 根据 ID 获取语言风格
 */
export { getLanguageStyleById };

/**
 * 获取推荐的语言风格（根据类型）
 */
export { getRecommendedStyles };
