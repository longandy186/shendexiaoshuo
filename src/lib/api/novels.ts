/**
 * 小说API服务层
 * 所有数据存储在数据库中，不再使用localStorage
 */

import { Novel, Character, Chapter, WorldSetting } from '../types';

// API响应格式
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  timestamp: string;
}

// 辅助函数：发起API请求
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiResponse<null> = await response.json();
    throw new Error(error.msg || '请求失败');
  }

  const result: ApiResponse<T> = await response.json();
  if (result.code !== 200) {
    throw new Error(result.msg || '操作失败');
  }

  return result.data;
}

// =====================================================
// 小说操作
// =====================================================

export const getAllNovels = async (): Promise<Novel[]> => {
  return fetchApi<Novel[]>('/novels');
};

export const getNovelById = async (novelId: string): Promise<Novel | null> => {
  try {
    return await fetchApi<Novel>(`/novels/${novelId}`);
  } catch (error) {
    console.error('[API] 获取小说失败:', error);
    return null;
  }
};

export const createNovel = async (title: string, description: string, genre: string): Promise<Novel> => {
  return fetchApi<Novel>('/novels', {
    method: 'POST',
    body: JSON.stringify({ title, description, genre }),
  });
};

export const saveNovel = async (novel: Novel): Promise<void> => {
  await fetchApi<void>(`/novels/${novel.id}`, {
    method: 'PUT',
    body: JSON.stringify(novel),
  });
};

export const deleteNovel = async (novelId: string): Promise<void> => {
  await fetchApi<void>(`/novels/${novelId}`, {
    method: 'DELETE',
  });
};

// =====================================================
// 角色操作
// =====================================================

export const addCharacter = async (novelId: string, character: Character): Promise<Character> => {
  return fetchApi<Character>(`/novels/${novelId}/characters`, {
    method: 'POST',
    body: JSON.stringify(character),
  });
};

export const updateCharacter = async (novelId: string, character: Character): Promise<void> => {
  // 角色更新包含在小说更新中
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedCharacters = novel.characters.map((c) =>
    c.id === character.id ? character : c
  );

  await saveNovel({
    ...novel,
    characters: updatedCharacters,
  });
};

export const deleteCharacter = async (novelId: string, characterId: string): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedCharacters = novel.characters.filter((c) => c.id !== characterId);

  await saveNovel({
    ...novel,
    characters: updatedCharacters,
  });
};

// =====================================================
// 章节操作
// =====================================================

export const addChapter = async (novelId: string, chapter: Chapter): Promise<Chapter> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const newChapter = {
    ...chapter,
    novelId: novelId,
    order: novel.chapters.length + 1,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedChapters = [...novel.chapters, newChapter];

  await saveNovel({
    ...novel,
    chapters: updatedChapters,
  });

  return newChapter;
};

export const updateChapter = async (novelId: string, chapter: Chapter): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedChapters = novel.chapters.map((c) =>
    c.id === chapter.id ? { ...chapter, updatedAt: new Date().toISOString() } : c
  );

  await saveNovel({
    ...novel,
    chapters: updatedChapters,
  });
};

export const deleteChapter = async (novelId: string, chapterId: string): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedChapters = novel.chapters.filter((c) => c.id !== chapterId);
  // 重新排序
  updatedChapters.forEach((ch, index) => {
    ch.order = index + 1;
  });

  await saveNovel({
    ...novel,
    chapters: updatedChapters,
  });
};

export const reorderChapter = async (novelId: string, chapterId: string, newOrder: number): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const chapterIndex = novel.chapters.findIndex((c) => c.id === chapterId);
  if (chapterIndex === -1) throw new Error('章节不存在');

  const [chapter] = novel.chapters.splice(chapterIndex, 1);
  novel.chapters.splice(newOrder - 1, 0, chapter);

  novel.chapters.forEach((ch, index) => {
    ch.order = index + 1;
  });

  await saveNovel(novel);
};

// =====================================================
// 世界观设定操作
// =====================================================

export const addWorldSetting = async (novelId: string, setting: WorldSetting): Promise<WorldSetting> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const newSetting = {
    ...setting,
    novelId: novelId,
    createdAt: new Date().toISOString(),
  };

  const updatedSettings = [...novel.worldSettings, newSetting];

  await saveNovel({
    ...novel,
    worldSettings: updatedSettings,
  });

  return newSetting;
};

export const updateWorldSetting = async (novelId: string, setting: WorldSetting): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedSettings = novel.worldSettings.map((s) =>
    s.id === setting.id ? { ...setting, updatedAt: new Date().toISOString() } : s
  );

  await saveNovel({
    ...novel,
    worldSettings: updatedSettings,
  });
};

export const deleteWorldSetting = async (novelId: string, settingId: string): Promise<void> => {
  const novel = await getNovelById(novelId);
  if (!novel) throw new Error('小说不存在');

  const updatedSettings = novel.worldSettings.filter((s) => s.id !== settingId);

  await saveNovel({
    ...novel,
    worldSettings: updatedSettings,
  });
};
