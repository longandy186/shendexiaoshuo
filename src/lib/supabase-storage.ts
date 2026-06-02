import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Novel, Chapter, Character, WorldSetting } from './types';

// =====================================================
// 用户操作
// =====================================================

export const createOrGetUser = async (username: string): Promise<{ id: string; username: string }> => {
  const client = getSupabaseClient();

  // 先尝试查找现有用户
  const { data: existingUser, error: findError } = await client
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (!findError && existingUser) {
    console.log('[Supabase] 找到现有用户:', { id: existingUser.id, username: existingUser.username });
    return existingUser;
  }

  // 用户不存在，创建新用户
  const { data: newUser, error: createError } = await client
    .from('users')
    .insert({ username })
    .select('id, username')
    .single();

  if (createError) {
    console.error('[Supabase] 创建用户失败:', createError);
    throw new Error(`创建用户失败: ${createError.message}`);
  }

  console.log('[Supabase] 创建新用户成功:', { id: newUser.id, username: newUser.username });
  return newUser;
};

// =====================================================
// 小说操作
// =====================================================

export const getAllNovels = async (userId: string): Promise<Novel[]> => {
  const client = getSupabaseClient();

  const { data: novels, error } = await client
    .from('novels')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase] 获取小说列表失败:', error);
    return [];
  }

  if (!novels || novels.length === 0) {
    return [];
  }

  // 获取每个小说的章节、角色、世界观
  const novelsWithRelations = await Promise.all(
    novels.map(async (novel: any) => {
      const [chapters, characters, worldSettings] = await Promise.all([
        getChaptersByNovelId(novel.id),
        getCharactersByNovelId(novel.id),
        getWorldSettingsByNovelId(novel.id),
      ]);

      return {
        id: novel.id,
        userId: novel.user_id,
        title: novel.title,
        description: novel.description || '',
        coverImage: novel.cover_image,
        genre: novel.genre,
        status: novel.status,
        createdAt: novel.created_at,
        updatedAt: novel.updated_at,
        chapters,
        characters,
        worldSettings,
      } as Novel;
    })
  );

  console.log('[Supabase] 获取小说列表成功:', { userId, count: novelsWithRelations.length });
  return novelsWithRelations;
};

export const getNovelById = async (novelId: string, userId: string): Promise<Novel | undefined> => {
  const client = getSupabaseClient();

  const { data: novel, error } = await client
    .from('novels')
    .select('*')
    .eq('id', novelId)
    .eq('user_id', userId)
    .single();

  if (error || !novel) {
    console.error('[Supabase] 获取小说失败:', error || '小说不存在');
    return undefined;
  }

  // 获取关联数据
  const [chapters, characters, worldSettings] = await Promise.all([
    getChaptersByNovelId(novel.id),
    getCharactersByNovelId(novel.id),
    getWorldSettingsByNovelId(novel.id),
  ]);

  const result: Novel = {
    id: novel.id,
    userId: novel.user_id,
    title: novel.title,
    description: novel.description || '',
    coverImage: novel.cover_image,
    genre: novel.genre,
    status: novel.status,
    createdAt: novel.created_at,
    updatedAt: novel.updated_at,
    chapters,
    characters,
    worldSettings,
  };

  console.log('[Supabase] 获取小说成功:', { novelId, title: novel.title });
  return result;
};

export const createNovel = async (
  userId: string,
  title: string,
  description: string,
  genre: string
): Promise<Novel> => {
  const client = getSupabaseClient();

  const { data: novel, error } = await client
    .from('novels')
    .insert({
      user_id: userId,
      title,
      description,
      genre,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error || !novel) {
    console.error('[Supabase] 创建小说失败:', error);
    throw new Error(`创建小说失败: ${error?.message}`);
  }

  const result: Novel = {
    id: novel.id,
    userId: novel.user_id,
    title: novel.title,
    description: novel.description || '',
    genre: novel.genre,
    status: novel.status,
    createdAt: novel.created_at,
    updatedAt: novel.updated_at,
    chapters: [],
    characters: [],
    worldSettings: [],
  };

  console.log('[Supabase] 创建小说成功:', { novelId: novel.id, title: novel.title });
  return result;
};

export const updateNovel = async (novel: Novel): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('novels')
    .update({
      title: novel.title,
      description: novel.description,
      cover_image: novel.coverImage,
      genre: novel.genre,
      status: novel.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', novel.id)
    .eq('user_id', novel.userId);

  if (error) {
    console.error('[Supabase] 更新小说失败:', error);
    throw new Error(`更新小说失败: ${error.message}`);
  }

  console.log('[Supabase] 更新小说成功:', { novelId: novel.id, title: novel.title });
};

export const deleteNovel = async (novelId: string, userId: string): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('novels')
    .delete()
    .eq('id', novelId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Supabase] 删除小说失败:', error);
    throw new Error(`删除小说失败: ${error.message}`);
  }

  // 级联删除关联数据（chapters, characters, world_settings）
  await Promise.all([
    deleteChaptersByNovelId(novelId),
    deleteCharactersByNovelId(novelId),
    deleteWorldSettingsByNovelId(novelId),
  ]);

  console.log('[Supabase] 删除小说成功:', { novelId });
};

// =====================================================
// 章节操作
// =====================================================

export const getChaptersByNovelId = async (novelId: string): Promise<Chapter[]> => {
  const client = getSupabaseClient();

  const { data: chapters, error } = await client
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .order('order', { ascending: true });

  if (error) {
    console.error('[Supabase] 获取章节列表失败:', error);
    return [];
  }

  return (chapters || []).map((ch: any) => ({
    id: ch.id,
    novelId: ch.novel_id,
    title: ch.title,
    content: ch.content,
    order: ch.order,
    status: 'draft',
    version: 1,
    createdAt: ch.created_at,
    updatedAt: ch.updated_at,
  })) as Chapter[];
};

export const createChapter = async (
  novelId: string,
  title: string,
  order: number
): Promise<Chapter> => {
  const client = getSupabaseClient();

  const content = '';
  const wordCount = 0;

  const { data: chapter, error } = await client
    .from('chapters')
    .insert({
      novel_id: novelId,
      title,
      content,
      order,
      word_count: wordCount,
    })
    .select('*')
    .single();

  if (error || !chapter) {
    console.error('[Supabase] 创建章节失败:', error);
    throw new Error(`创建章节失败: ${error?.message}`);
  }

  const result: Chapter = {
    id: chapter.id,
    novelId: chapter.novel_id,
    title: chapter.title,
    content: chapter.content,
    order: chapter.order,
    status: 'draft',
    version: 1,
    createdAt: chapter.created_at,
    updatedAt: chapter.updated_at,
  };

  console.log('[Supabase] 创建章节成功:', { chapterId: chapter.id, title: chapter.title });
  return result;
};

export const updateChapter = async (chapter: Chapter): Promise<void> => {
  const client = getSupabaseClient();

  const wordCount = chapter.content.length;

  const { error } = await client
    .from('chapters')
    .update({
      title: chapter.title,
      content: chapter.content,
      order: chapter.order,
      word_count: wordCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chapter.id);

  if (error) {
    console.error('[Supabase] 更新章节失败:', error);
    throw new Error(`更新章节失败: ${error.message}`);
  }

  console.log('[Supabase] 更新章节成功:', { chapterId: chapter.id, title: chapter.title });
};

export const deleteChapter = async (chapterId: string): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('chapters')
    .delete()
    .eq('id', chapterId);

  if (error) {
    console.error('[Supabase] 删除章节失败:', error);
    throw new Error(`删除章节失败: ${error.message}`);
  }

  console.log('[Supabase] 删除章节成功:', { chapterId });
};

const deleteChaptersByNovelId = async (novelId: string): Promise<void> => {
  const client = getSupabaseClient();

  await client.from('chapters').delete().eq('novel_id', novelId);
};

// =====================================================
// 角色操作
// =====================================================

export const getCharactersByNovelId = async (novelId: string): Promise<Character[]> => {
  const client = getSupabaseClient();

  const { data: characters, error } = await client
    .from('characters')
    .select('*')
    .eq('novel_id', novelId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] 获取角色列表失败:', error);
    return [];
  }

  return (characters || []).map((ch: any) => ({
    id: ch.id,
    name: ch.name,
    age: ch.age,
    appearance: ch.appearance,
    personality: ch.personality,
    background: ch.background,
    role: ch.role,
    avatar: ch.avatar,
  })) as Character[];
};

export const createCharacter = async (novelId: string, character: Omit<Character, 'id'>): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('characters')
    .insert({
      novel_id: novelId,
      name: character.name,
      age: character.age,
      appearance: character.appearance,
      personality: character.personality,
      background: character.background,
      role: character.role,
      avatar: character.avatar,
    });

  if (error) {
    console.error('[Supabase] 创建角色失败:', error);
    throw new Error(`创建角色失败: ${error.message}`);
  }

  console.log('[Supabase] 创建角色成功:', { name: character.name });
};

export const updateCharacter = async (character: Character, novelId: string): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('characters')
    .update({
      name: character.name,
      age: character.age,
      appearance: character.appearance,
      personality: character.personality,
      background: character.background,
      role: character.role,
      avatar: character.avatar,
      updated_at: new Date().toISOString(),
    })
    .eq('id', character.id);

  if (error) {
    console.error('[Supabase] 更新角色失败:', error);
    throw new Error(`更新角色失败: ${error.message}`);
  }

  console.log('[Supabase] 更新角色成功:', { characterId: character.id, name: character.name });
};

export const deleteCharacter = async (characterId: string): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('characters')
    .delete()
    .eq('id', characterId);

  if (error) {
    console.error('[Supabase] 删除角色失败:', error);
    throw new Error(`删除角色失败: ${error.message}`);
  }

  console.log('[Supabase] 删除角色成功:', { characterId });
};

const deleteCharactersByNovelId = async (novelId: string): Promise<void> => {
  const client = getSupabaseClient();

  await client.from('characters').delete().eq('novel_id', novelId);
};

// =====================================================
// 世界观设定操作
// =====================================================

export const getWorldSettingsByNovelId = async (novelId: string): Promise<WorldSetting[]> => {
  const client = getSupabaseClient();

  const { data: settings, error } = await client
    .from('world_settings')
    .select('*')
    .eq('novel_id', novelId)
    .order('category', { ascending: true });

  if (error) {
    console.error('[Supabase] 获取世界观设定失败:', error);
    return [];
  }

  return (settings || []).map((s: any) => ({
    id: s.id,
    novelId: s.novel_id,
    category: s.category,
    title: s.name,
    content: s.description,
    createdAt: s.created_at,
  })) as WorldSetting[];
};

export const createWorldSetting = async (
  novelId: string,
  setting: Omit<WorldSetting, 'id' | 'novelId'>
): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('world_settings')
    .insert({
      novel_id: novelId,
      category: setting.category,
      name: setting.title,
      description: setting.content,
      relationships: null,
    });

  if (error) {
    console.error('[Supabase] 创建世界观设定失败:', error);
    throw new Error(`创建世界观设定失败: ${error.message}`);
  }

  console.log('[Supabase] 创建世界观设定成功:', { title: setting.title });
};

export const updateWorldSetting = async (
  setting: WorldSetting,
  novelId: string
): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('world_settings')
    .update({
      category: setting.category,
      name: setting.title,
      description: setting.content,
      relationships: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', setting.id);

  if (error) {
    console.error('[Supabase] 更新世界观设定失败:', error);
    throw new Error(`更新世界观设定失败: ${error.message}`);
  }

  console.log('[Supabase] 更新世界观设定成功:', { settingId: setting.id, title: setting.title });
};

export const deleteWorldSetting = async (settingId: string): Promise<void> => {
  const client = getSupabaseClient();

  const { error } = await client
    .from('world_settings')
    .delete()
    .eq('id', settingId);

  if (error) {
    console.error('[Supabase] 删除世界观设定失败:', error);
    throw new Error(`删除世界观设定失败: ${error.message}`);
  }

  console.log('[Supabase] 删除世界观设定成功:', { settingId });
};

const deleteWorldSettingsByNovelId = async (novelId: string): Promise<void> => {
  const client = getSupabaseClient();

  await client.from('world_settings').delete().eq('novel_id', novelId);
};

// =====================================================
// 数据迁移功能
// =====================================================

export const migrateLocalStorageToSupabase = async (
  userId: string,
  localStorageNovels: any[]
): Promise<void> => {
  console.log('[Supabase] 开始数据迁移:', { userId, novelCount: localStorageNovels.length });

  for (const novel of localStorageNovels) {
    try {
      // 创建小说
      const { data: dbNovel, error: novelError } = await getSupabaseClient()
        .from('novels')
        .insert({
          user_id: userId,
          title: novel.title,
          description: novel.description || '',
          genre: novel.genre,
          status: novel.status,
          cover_image: novel.coverImage,
        })
        .select('id')
        .single();

      if (novelError || !dbNovel) {
        console.error('[Supabase] 迁移小说失败:', novelError);
        continue;
      }

      // 迁移章节
      if (novel.chapters && novel.chapters.length > 0) {
        const chaptersToInsert = novel.chapters.map((ch: any) => ({
          novel_id: dbNovel.id,
          title: ch.title,
          content: ch.content || '',
          order: ch.order,
          word_count: ch.content ? ch.content.length : 0,
        }));

        await getSupabaseClient().from('chapters').insert(chaptersToInsert);
      }

      // 迁移角色
      if (novel.characters && novel.characters.length > 0) {
        const charactersToInsert = novel.characters.map((ch: any) => ({
          novel_id: dbNovel.id,
          name: ch.name,
          age: ch.age,
          appearance: ch.appearance,
          personality: ch.personality,
          background: ch.background,
          role: ch.role,
          avatar: ch.avatar,
        }));

        await getSupabaseClient().from('characters').insert(charactersToInsert);
      }

      // 迁移世界观
      if (novel.worldSettings && novel.worldSettings.length > 0) {
        const settingsToInsert = novel.worldSettings.map((ws: any) => ({
          novel_id: dbNovel.id,
          category: ws.category,
          name: ws.title,
          description: ws.content,
          relationships: null,
        }));

        await getSupabaseClient().from('world_settings').insert(settingsToInsert);
      }

      console.log('[Supabase] 迁移小说成功:', { novelId: dbNovel.id, title: novel.title });
    } catch (error) {
      console.error('[Supabase] 迁移小说异常:', error);
    }
  }

  console.log('[Supabase] 数据迁移完成');
};
