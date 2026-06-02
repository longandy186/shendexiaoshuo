/**
 * 数据迁移工具
 * 用于将 localStorage 中的提示词数据迁移到数据库
 */

import { getLanguageStyles, type LanguageStyle } from './prompt-library';

const STORAGE_KEY = 'languageStyles';

/**
 * 从 localStorage 迁移提示词到数据库
 * @param userId 用户ID
 * @returns 迁移结果
 */
export async function migratePromptsFromLocalStorage(userId?: string): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    // 检查是否需要迁移
    const localStorageData = localStorage.getItem(STORAGE_KEY);
    if (!localStorageData) {
      return {
        success: true,
        migratedCount: 0,
        error: 'localStorage 中没有提示词数据',
      };
    }

    const styles: LanguageStyle[] = JSON.parse(localStorageData);

    // 过滤出自定义提示词（ID以custom开头）
    const customStyles = styles.filter((style) => style.id.startsWith('custom-'));

    if (customStyles.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        error: '没有自定义提示词需要迁移',
      };
    }

    // 通过 API 保存到数据库
    const migratedCount = customStyles.length;
    for (const style of customStyles) {
      try {
        const response = await fetch('/api/language-styles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(style),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`迁移提示词 ${style.id} 失败:`, errorData);
        }
      } catch (error) {
        console.error(`迁移提示词 ${style.id} 时发生错误:`, error);
      }
    }

    // 迁移成功后，可选：是否清除 localStorage 中的自定义提示词
    // 目前保留，作为备份
    // const systemStyles = styles.filter((style) => !style.id.startsWith('custom-'));
    // localStorage.setItem(STORAGE_KEY, JSON.stringify(systemStyles));

    return {
      success: true,
      migratedCount,
    };
  } catch (error) {
    console.error('迁移提示词时发生错误:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 检查是否需要迁移
 * @returns 是否需要迁移
 */
export function needsMigration(): boolean {
  const localStorageData = localStorage.getItem(STORAGE_KEY);
  if (!localStorageData) return false;

  const styles: LanguageStyle[] = JSON.parse(localStorageData);
  return styles.some((style) => style.id.startsWith('custom-'));
}
