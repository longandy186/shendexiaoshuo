/**
 * 数据库 API 辅助函数
 * 用于从 Supabase 数据库加载小说数据
 */

/**
 * 从数据库加载单个小说
 */
export async function loadNovelFromDatabase(novelId: string) {
  try {
    const response = await fetch(`/api/novels/${novelId}`);
    
    if (!response.ok) {
      throw new Error('加载小说失败');
    }

    const result = await response.json();
    
    if (result.code === 200) {
      return result.data;
    } else {
      throw new Error(result.msg || '加载小说失败');
    }
  } catch (error) {
    console.error('加载小说失败:', error);
    throw error;
  }
}

/**
 * 从数据库加载小说列表
 */
export async function loadNovelsFromDatabase() {
  try {
    const response = await fetch('/api/novels');
    
    if (!response.ok) {
      throw new Error('加载小说列表失败');
    }

    const result = await response.json();
    
    if (result.code === 200) {
      return result.data || [];
    } else {
      throw new Error(result.msg || '加载小说列表失败');
    }
  } catch (error) {
    console.error('加载小说列表失败:', error);
    throw error;
  }
}
