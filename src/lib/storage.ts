import { Novel, Character, Chapter, WorldSetting } from './types';
import { getCurrentUser } from './auth';

// Re-export types for use in components
export type { Novel, Character, Chapter, WorldSetting };

const STORAGE_KEYS = {
  NOVELS: 'ai_novels',
  BACKUPS: 'ai_novels_backups',
  METADATA: 'ai_novels_metadata',
};

// Helper function to generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =====================================================
// Novel Operations
// =====================================================

// 获取所有小说（不过滤用户）
const getAllNovelsFromStorage = (): Novel[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOVELS);
    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] getAllNovelsFromStorage 失败:', error);
    return [];
  }
};

// 保存所有小说到存储
const saveNovelsToStorage = (novels: Novel[]): void => {
  if (typeof window === 'undefined') {
    console.error('[Storage] saveNovelsToStorage 失败：window 对象不可用');
    return;
  }

  try {
    const dataToSave = JSON.stringify(novels);
    localStorage.setItem(STORAGE_KEYS.NOVELS, dataToSave);
  } catch (error) {
    console.error('[Storage] saveNovelsToStorage 失败:', error);
  }
};

export const getAllNovels = (): Novel[] => {
  if (typeof window === 'undefined') {
    console.warn('[Storage] getAllNovels: window 对象不可用，返回空数组');
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOVELS);

    if (!data) {
      return [];
    }

    const allNovels = JSON.parse(data);

    // 检查是否有旧数据（没有 userId 的小说）
    const novelsWithoutUserId = allNovels.filter((n: Novel) => !n.userId);
    if (novelsWithoutUserId.length > 0) {
      console.warn('[Storage] 发现没有 userId 的旧数据，这些小说将不会被显示:', {
        count: novelsWithoutUserId.length
      });
    }

    // 返回所有小说（用户过滤应该在前端或 API 层进行）
    return allNovels;
  } catch (error) {
    console.error('[Storage] getAllNovels 失败:', error);
    return [];
  }
};

export const saveNovel = (novel: Novel, userId?: string): void => {
  if (typeof window === 'undefined') {
    console.error('[Storage] saveNovel 失败：window 对象不可用');
    return;
  }

  if (!userId) {
    console.error('[Storage] saveNovel 失败：用户未登录');
    return;
  }

  try {
    // 检查小说归属
    if (novel.userId && novel.userId !== userId) {
      throw new Error('无权修改其他用户的小说');
    }

    // 获取所有小说
    const allNovels = getAllNovelsFromStorage();
    const index = allNovels.findIndex(n => n.id === novel.id);

    if (index >= 0) {
      // 更新现有小说，确保 userId 正确
      allNovels[index] = { ...novel, userId, updatedAt: new Date().toISOString() };
    } else {
      // 添加新小说
      allNovels.push({ ...novel, userId });
    }

    saveNovelsToStorage(allNovels);
    updateMetadata();
  } catch (error) {
    console.error('[Storage] saveNovel 失败:', error);
  }
};

export const deleteNovel = (novelId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    // 使用 getAllNovelsFromStorage 而不是 getAllNovels，以避免过滤问题
    const allNovels = getAllNovelsFromStorage();
    const novels = allNovels.filter(n => n.id !== novelId);
    saveNovelsToStorage(novels);
    updateMetadata();
  } catch (error) {
    console.error('[Storage] deleteNovel 失败:', error);
  }
};

export const getNovelById = (novelId: string): Novel | undefined => {
  const novels = getAllNovels();
  const found = novels.find(n => n.id === novelId);
  return found;
};

export const createNovel = (title: string, description: string, genre: string, userId?: string): Novel => {
  if (!userId) {
    throw new Error('用户未登录');
  }

  const novel: Novel = {
    id: generateId(),
    userId,
    title,
    description,
    genre,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    characters: [],
    chapters: [],
    worldSettings: [],
  };
  saveNovel(novel, userId);
  return novel;
};

// =====================================================
// Character Operations
// =====================================================

export const addCharacter = (novelId: string, character: Character): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  if (!character.id) {
    character.id = generateId();
  }
  
  novel.characters.push(character);
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

export const updateCharacter = (novelId: string, character: Character): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  const index = novel.characters.findIndex(c => c.id === character.id);
  if (index >= 0) {
    novel.characters[index] = character;
    novel.updatedAt = new Date().toISOString();
    saveNovel(novel, novel.userId);
  }
};

export const deleteCharacter = (novelId: string, characterId: string): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  novel.characters = novel.characters.filter(c => c.id !== characterId);
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

// =====================================================
// Chapter Operations
// =====================================================

export const addChapter = (novelId: string, chapter: Chapter): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  chapter.novelId = novelId;
  chapter.order = novel.chapters.length + 1;
  chapter.version = 1; // 新章节版本号为 1
  chapter.createdAt = new Date().toISOString();
  chapter.updatedAt = new Date().toISOString();

  novel.chapters.push(chapter);
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

export const updateChapter = (novelId: string, chapter: Chapter): void => {
  const novel = getNovelById(novelId);
  if (!novel) {
    console.error('[Storage] updateChapter 失败：小说不存在', novelId);
    return;
  }
  
  const index = novel.chapters.findIndex(c => c.id === chapter.id);
  if (index >= 0) {
    novel.chapters[index] = chapter;
    novel.updatedAt = new Date().toISOString();
    saveNovel(novel, novel.userId);
  } else {
    console.error('[Storage] updateChapter 失败：章节不存在', {
      novelId,
      chapterId: chapter.id,
      totalChapters: novel.chapters.length
    });
  }
};

export const deleteChapter = (novelId: string, chapterId: string): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  novel.chapters = novel.chapters.filter(c => c.id !== chapterId);
  // Reorder chapters
  novel.chapters.forEach((chapter, index) => {
    chapter.order = index + 1;
  });
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

export const reorderChapter = (novelId: string, chapterId: string, newOrder: number): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  const chapterIndex = novel.chapters.findIndex(c => c.id === chapterId);
  if (chapterIndex === -1) return;
  
  const [chapter] = novel.chapters.splice(chapterIndex, 1);
  novel.chapters.splice(newOrder - 1, 0, chapter);
  
  novel.chapters.forEach((chapter, index) => {
    chapter.order = index + 1;
  });
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

// =====================================================
// World Setting Operations
// =====================================================

export const addWorldSetting = (novelId: string, setting: WorldSetting): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  if (!setting.id) {
    setting.id = generateId();
  }
  setting.novelId = novelId;
  setting.createdAt = new Date().toISOString();
  
  novel.worldSettings.push(setting);
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

export const updateWorldSetting = (novelId: string, setting: WorldSetting): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  const index = novel.worldSettings.findIndex(s => s.id === setting.id);
  if (index >= 0) {
    novel.worldSettings[index] = setting;
    novel.updatedAt = new Date().toISOString();
    saveNovel(novel, novel.userId);
  }
};

export const deleteWorldSetting = (novelId: string, settingId: string): void => {
  const novel = getNovelById(novelId);
  if (!novel) return;
  
  novel.worldSettings = novel.worldSettings.filter(s => s.id !== settingId);
  novel.updatedAt = new Date().toISOString();
  saveNovel(novel, novel.userId);
};

// =====================================================
// Data Export & Import
// =====================================================

export interface ExportData {
  version: string;
  exportDate: string;
  novels: Novel[];
  metadata: {
    totalNovels: number;
    totalCharacters: number;
    totalChapters: number;
    totalWorldSettings: number;
  };
}

export const exportAllData = (): ExportData => {
  const novels = getAllNovels();
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    novels,
    metadata: {
      totalNovels: novels.length,
      totalCharacters: novels.reduce((sum, n) => sum + n.characters.length, 0),
      totalChapters: novels.reduce((sum, n) => sum + n.chapters.length, 0),
      totalWorldSettings: novels.reduce((sum, n) => sum + n.worldSettings.length, 0),
    },
  };
};

export const exportNovel = (novelId: string): ExportData | null => {
  const novel = getNovelById(novelId);
  if (!novel) return null;
  
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    novels: [novel],
    metadata: {
      totalNovels: 1,
      totalCharacters: novel.characters.length,
      totalChapters: novel.chapters.length,
      totalWorldSettings: novel.worldSettings.length,
    },
  };
};

export const importData = (data: ExportData, overwrite: boolean = false): { success: boolean; message: string; imported: number } => {
  try {
    const existingNovels = getAllNovels();
    let importedCount = 0;
    
    for (const novel of data.novels) {
      const index = existingNovels.findIndex(n => n.id === novel.id);
      
      if (index >= 0) {
        if (overwrite) {
          existingNovels[index] = novel;
          importedCount++;
        }
        // else: skip existing novels
      } else {
        existingNovels.push(novel);
        importedCount++;
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.NOVELS, JSON.stringify(existingNovels));
    updateMetadata();
    
    return {
      success: true,
      message: `成功导入 ${importedCount} 部小说`,
      imported: importedCount,
    };
  } catch (error) {
    console.error('Failed to import data:', error);
    return {
      success: false,
      message: '导入失败：数据格式错误',
      imported: 0,
    };
  }
};

// =====================================================
// Data Backup & Restore
// =====================================================

export interface BackupRecord {
  id: string;
  name: string;
  date: string;
  size: number;
  novelsCount: number;
}

export const createBackup = (name?: string): string => {
  const data = exportAllData();
  const backupId = generateId();
  const backupName = name || `备份 ${new Date().toLocaleString('zh-CN')}`;
  const backupJson = JSON.stringify({ id: backupId, name: backupName, date: new Date().toISOString(), data, metadata: data.metadata });
  
  const backup = {
    id: backupId,
    name: backupName,
    date: new Date().toISOString(),
    size: backupJson.length,
    novelsCount: data.metadata.totalNovels,
    data,
    metadata: data.metadata,
  };
  
  const backups = getBackups();
  backups.push(backup);
  
  // Keep only last 10 backups
  const sortedBackups = backups.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10);
  
  localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(sortedBackups));
  return backupId;
};

export const getBackups = (): BackupRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    const backups = data ? JSON.parse(data) : [];
    return backups.map((b: any) => ({
      id: b.id,
      name: b.name,
      date: b.date,
      size: JSON.stringify(b).length,
      novelsCount: b.metadata.totalNovels,
    }));
  } catch (error) {
    console.error('Failed to load backups:', error);
    return [];
  }
};

export const restoreBackup = (backupId: string): { success: boolean; message: string } => {
  try {
    const backups = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUPS) || '[]');
    const backup = backups.find((b: any) => b.id === backupId);
    
    if (!backup) {
      return { success: false, message: '备份不存在' };
    }
    
    const result = importData(backup.data, true);
    return result.success 
      ? { success: true, message: '恢复成功' }
      : { success: false, message: result.message };
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return { success: false, message: '恢复失败' };
  }
};

export const deleteBackup = (backupId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const backups = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUPS) || '[]');
    const filteredBackups = backups.filter((b: any) => b.id !== backupId);
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(filteredBackups));
  } catch (error) {
    console.error('Failed to delete backup:', error);
  }
};

// =====================================================
// Data Statistics
// =====================================================

export interface StorageStats {
  totalNovels: number;
  totalCharacters: number;
  totalChapters: number;
  totalWorldSettings: number;
  totalWords: number;
  storageSize: number;
  lastUpdate: string;
  novelsByStatus: {
    draft: number;
    ongoing: number;
    completed: number;
  };
  novelsByGenre: Record<string, number>;
}

export const getStorageStats = (): StorageStats => {
  const novels = getAllNovels();
  const totalCharacters = novels.reduce((sum, n) => sum + n.characters.length, 0);
  const totalChapters = novels.reduce((sum, n) => sum + n.chapters.length, 0);
  const totalWorldSettings = novels.reduce((sum, n) => sum + n.worldSettings.length, 0);
  const totalWords = novels.reduce((sum, n) => 
    sum + n.chapters.reduce((chSum, ch) => chSum + ch.content.length, 0), 0
  );
  const storageSize = JSON.stringify(novels).length;
  
  const novelsByStatus = novels.reduce((acc, n) => {
    acc[n.status]++;
    return acc;
  }, { draft: 0, ongoing: 0, completed: 0 });
  
  const novelsByGenre = novels.reduce((acc, n) => {
    acc[n.genre] = (acc[n.genre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalNovels: novels.length,
    totalCharacters,
    totalChapters,
    totalWorldSettings,
    totalWords,
    storageSize,
    lastUpdate: novels.length > 0 
      ? novels.map(n => n.updatedAt).sort().reverse()[0]
      : new Date().toISOString(),
    novelsByStatus,
    novelsByGenre,
  };
};

// =====================================================
// Data Management
// =====================================================

export const clearAllData = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.NOVELS);
    localStorage.removeItem(STORAGE_KEYS.METADATA);
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
};

export const validateDataIntegrity = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const novels = getAllNovels();
  
  novels.forEach((novel, index) => {
    // Validate novel structure
    if (!novel.id) errors.push(`小说 ${index + 1} 缺少 ID`);
    if (!novel.title) errors.push(`小说 ${index + 1} 缺少标题`);
    
    // Validate characters
    novel.characters.forEach((char, charIndex) => {
      if (!char.id) errors.push(`小说 "${novel.title}" 的角色 ${charIndex + 1} 缺少 ID`);
      if (!char.name) errors.push(`小说 "${novel.title}" 的角色 ${charIndex + 1} 缺少名称`);
    });
    
    // Validate chapters
    novel.chapters.forEach((chapter, chIndex) => {
      if (!chapter.id) errors.push(`小说 "${novel.title}" 的章节 ${chIndex + 1} 缺少 ID`);
      if (!chapter.title) errors.push(`小说 "${novel.title}" 的章节 ${chIndex + 1} 缺少标题`);
      if (chapter.novelId !== novel.id) errors.push(`小说 "${novel.title}" 的章节 ${chIndex + 1} 关联错误`);
    });
    
    // Validate world settings
    novel.worldSettings.forEach((setting, settingIndex) => {
      if (!setting.id) errors.push(`小说 "${novel.title}" 的设定 ${settingIndex + 1} 缺少 ID`);
      if (!setting.title) errors.push(`小说 "${novel.title}" 的设定 ${settingIndex + 1} 缺少标题`);
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// =====================================================
// Metadata Management
// =====================================================

interface StorageMetadata {
  lastUpdated: string;
  version: string;
  dataSize: number;
}

function updateMetadata(): void {
  if (typeof window === 'undefined') return;
  try {
    // 使用 getAllNovelsFromStorage 统计所有数据
    const novels = getAllNovelsFromStorage();
    const metadata: StorageMetadata = {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      dataSize: JSON.stringify(novels).length,
    };
    localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error('[Storage] updateMetadata 失败:', error);
  }
}

export const getMetadata = (): StorageMetadata | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.METADATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load metadata:', error);
    return null;
  }
};

// =====================================================
// Chapter Version Management
// =====================================================

export interface ChapterVersion {
  version: number;
  content: string;
  title: string;
  keywords?: string;
  createdAt: string;
  updatedAt: string;
}

export const saveChapterVersion = (
  novelId: string,
  chapterId: string,
  versionNote?: string
): { success: boolean; version: number; message: string } => {
  const novel = getNovelById(novelId);
  if (!novel) {
    return { success: false, version: 0, message: '小说不存在' };
  }

  const chapter = novel.chapters.find(c => c.id === chapterId);
  if (!chapter) {
    return { success: false, version: 0, message: '章节不存在' };
  }

  // 递增版本号
  const newVersion = (chapter.version || 1) + 1;

  // 更新章节版本号
  chapter.version = newVersion;
  chapter.updatedAt = new Date().toISOString();

  // 保存版本历史到 localStorage
  const versionKey = `${STORAGE_KEYS.NOVELS}_versions_${chapterId}`;
  const versions: ChapterVersion[] = JSON.parse(
    localStorage.getItem(versionKey) || '[]'
  );

  versions.push({
    version: newVersion,
    content: chapter.content,
    title: chapter.title,
    keywords: chapter.keywords,
    createdAt: chapter.createdAt,
    updatedAt: new Date().toISOString(),
  });

  // 只保留最近 10 个版本
  const recentVersions = versions.slice(-10);
  localStorage.setItem(versionKey, JSON.stringify(recentVersions));

  // 保存小说
  saveNovel(novel, novel.userId);

  return {
    success: true,
    version: newVersion,
    message: `版本 ${newVersion} 已保存`
  };
};

export const getChapterVersions = (chapterId: string): ChapterVersion[] => {
  if (typeof window === 'undefined') return [];
  try {
    const versionKey = `${STORAGE_KEYS.NOVELS}_versions_${chapterId}`;
    const versions = JSON.parse(localStorage.getItem(versionKey) || '[]');
    return versions.sort((a: ChapterVersion, b: ChapterVersion) => b.version - a.version); // 按版本号降序排列
  } catch (error) {
    console.error('Failed to load chapter versions:', error);
    return [];
  }
};

export const restoreChapterVersion = (
  novelId: string,
  chapterId: string,
  version: number
): { success: boolean; message: string } => {
  const novel = getNovelById(novelId);
  if (!novel) {
    return { success: false, message: '小说不存在' };
  }

  const chapter = novel.chapters.find(c => c.id === chapterId);
  if (!chapter) {
    return { success: false, message: '章节不存在' };
  }

  const versions = getChapterVersions(chapterId);
  const targetVersion = versions.find(v => v.version === version);

  if (!targetVersion) {
    return { success: false, message: `版本 ${version} 不存在` };
  }

  // 恢复版本内容
  chapter.content = targetVersion.content;
  chapter.title = targetVersion.title;
  chapter.keywords = targetVersion.keywords;
  chapter.version = version;
  chapter.updatedAt = new Date().toISOString();

  // 保存小说
  saveNovel(novel, novel.userId);

  return { success: true, message: `已恢复到版本 ${version}` };
};

export const deleteChapterVersions = (chapterId: string): void => {
  if (typeof window === 'undefined') return;
  const versionKey = `${STORAGE_KEYS.NOVELS}_versions_${chapterId}`;
  localStorage.removeItem(versionKey);
};

// 小说所有章节版本接口
interface NovelVersion {
  id: string;
  novelId: string;
  versionName: string; // 格式: 月日时分，如 "03121430"
  chapters: {
    id: string;
    title: string;
    content: string;
    keywords?: string;
    order: number;
  }[];
  createdAt: string;
  description: string;
}

// 保存小说所有章节的版本
export const saveNovelAllVersion = (
  novelId: string,
  description?: string
): { success: boolean; versionName: string; message: string } => {
  const novel = getNovelById(novelId);
  if (!novel) {
    return { success: false, versionName: '', message: '小说不存在' };
  }

  // 生成日月时分格式的版本名称（月日时分，如 03121430）
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const versionName = `${month}${day}${hour}${minute}`;

  // 保存小说所有章节内容
  const versionKey = `${STORAGE_KEYS.NOVELS}_all_versions_${novelId}`;
  const versions: NovelVersion[] = JSON.parse(
    localStorage.getItem(versionKey) || '[]'
  );

  const newVersion: NovelVersion = {
    id: generateId(),
    novelId: novelId,
    versionName: versionName,
    chapters: novel.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content,
      keywords: chapter.keywords,
      order: chapter.order
    })),
    createdAt: now.toISOString(),
    description: description || `保存于 ${now.toLocaleString('zh-CN')}`
  };

  versions.push(newVersion);

  // 只保留最近 20 个版本
  const recentVersions = versions.slice(-20);
  localStorage.setItem(versionKey, JSON.stringify(recentVersions));

  return {
    success: true,
    versionName: versionName,
    message: `版本 ${versionName} 已保存`
  };
};

// 获取小说所有章节版本列表
export const getNovelAllVersions = (novelId: string): NovelVersion[] => {
  if (typeof window === 'undefined') return [];
  try {
    const versionKey = `${STORAGE_KEYS.NOVELS}_all_versions_${novelId}`;
    const versions = JSON.parse(localStorage.getItem(versionKey) || '[]');
    // 按创建时间降序排列
    return versions.sort((a: NovelVersion, b: NovelVersion) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[Storage] getNovelAllVersions 失败:', error);
    return [];
  }
};

// 恢复小说所有章节版本
export const restoreNovelAllVersion = (
  novelId: string,
  versionId: string
): { success: boolean; message: string } => {
  const novel = getNovelById(novelId);
  if (!novel) {
    return { success: false, message: '小说不存在' };
  }

  const versions = getNovelAllVersions(novelId);
  const targetVersion = versions.find(v => v.id === versionId);

  if (!targetVersion) {
    return { success: false, message: '版本不存在' };
  }

  // 恢复所有章节内容
  targetVersion.chapters.forEach(versionChapter => {
    const chapter = novel.chapters.find(c => c.id === versionChapter.id);
    if (chapter) {
      chapter.title = versionChapter.title;
      chapter.content = versionChapter.content;
      chapter.keywords = versionChapter.keywords;
      chapter.order = versionChapter.order;
      chapter.updatedAt = new Date().toISOString();
    }
  });

  // 保存小说
  saveNovel(novel, novel.userId);

  return {
    success: true,
    message: `已恢复到版本 ${targetVersion.versionName}`
  };
};

// 删除小说所有章节版本
export const deleteNovelAllVersion = (novelId: string, versionId: string): void => {
  if (typeof window === 'undefined') return;

  const versionKey = `${STORAGE_KEYS.NOVELS}_all_versions_${novelId}`;
  const versions = getNovelAllVersions(novelId);

  const filteredVersions = versions.filter(v => v.id !== versionId);
  localStorage.setItem(versionKey, JSON.stringify(filteredVersions));
};
