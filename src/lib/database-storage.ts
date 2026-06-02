/**
 * 数据库存储服务
 * 专门用于世界观和角色设定的持久化存储
 * 作为AI创作的"事实来源"，优先级高于其他设定
 *
 * 已从 localStorage 迁移到 Supabase，支持服务端调用
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// =====================================================
// 类型定义
// =====================================================

export interface DBWorldSetting {
  id: string;
  novelId: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  priority: 'high' | 'medium' | 'low'; // 设定优先级
}

interface DBCharacter {
  id: string;
  novelId: string;
  name: string;
  age?: number;
  appearance?: string;
  personality?: string;
  background?: string;
  role?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  priority: 'high' | 'medium' | 'low'; // 角色优先级
}

interface DBNovel {
  id: string;
  userId: string;
  title: string;
  description?: string;
  genre?: string;
  status: 'draft' | 'ongoing' | 'completed'; // 匹配 Novel 类型
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// 工具函数：数据库字段转换
// =====================================================

/**
 * 将 Supabase world_settings 行转换为 DBWorldSetting
 * 数据库字段映射：name -> title, description -> content
 */
function transformWorldSetting(row: any): DBWorldSetting {
  return {
    id: row.id,
    novelId: row.novel_id,
    category: row.category,
    title: row.name,           // 数据库字段 name -> title
    content: row.description,  // 数据库字段 description -> content
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    priority: row.priority || 'medium', // 数据库无此字段时默认 medium
  };
}

/**
 * 将 Supabase characters 行转换为 DBCharacter
 */
function transformCharacter(row: any): DBCharacter {
  return {
    id: row.id,
    novelId: row.novel_id,
    name: row.name,
    age: row.age,
    appearance: row.appearance,
    personality: row.personality,
    background: row.background,
    role: row.role,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    priority: row.priority || 'medium', // 数据库无此字段时默认 medium
  };
}

// =====================================================
// 世界观设定数据库操作
// =====================================================

/**
 * 获取小说的所有世界观设定
 */
export async function dbGetWorldSettingsByNovelId(novelId: string): Promise<DBWorldSetting[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('world_settings')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Database] 获取世界观设定失败:', error);
      return [];
    }

    return (data || []).map(transformWorldSetting);
  } catch (error) {
    console.error('[Database] 获取世界观设定异常:', error);
    return [];
  }
}

/**
 * 获取指定世界观设定
 */
export async function dbGetWorldSettingById(id: string): Promise<DBWorldSetting | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('world_settings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return transformWorldSetting(data);
  } catch (error) {
    console.error('[Database] 获取世界观设定失败:', error);
    return null;
  }
}

/**
 * 创建世界观设定
 */
export async function dbCreateWorldSetting(
  novelId: string,
  setting: Omit<DBWorldSetting, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>
): Promise<DBWorldSetting | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('world_settings')
      .insert({
        novel_id: novelId,
        category: setting.category,
        name: setting.title,           // title -> name
        description: setting.content,  // content -> description
        priority: setting.priority || 'medium',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[Database] 创建世界观设定失败:', error);
      return null;
    }

    console.log('[Database] 创建世界观设定:', { id: data.id, title: data.name });
    return transformWorldSetting(data);
  } catch (error) {
    console.error('[Database] 创建世界观设定异常:', error);
    return null;
  }
}

/**
 * 更新世界观设定
 */
export async function dbUpdateWorldSetting(
  id: string,
  updates: Partial<Omit<DBWorldSetting, 'id' | 'novelId' | 'createdAt'>>
): Promise<DBWorldSetting | null> {
  try {
    const client = getSupabaseClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.title !== undefined) dbUpdates.name = updates.title;           // title -> name
    if (updates.content !== undefined) dbUpdates.description = updates.content; // content -> description
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { data, error } = await client
      .from('world_settings')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[Database] 更新世界观设定失败:', error);
      return null;
    }

    console.log('[Database] 更新世界观设定:', { id, title: data.name });
    return transformWorldSetting(data);
  } catch (error) {
    console.error('[Database] 更新世界观设定异常:', error);
    return null;
  }
}

/**
 * 删除世界观设定
 */
export async function dbDeleteWorldSetting(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('world_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Database] 删除世界观设定失败:', error);
      return false;
    }

    console.log('[Database] 删除世界观设定:', { id });
    return true;
  } catch (error) {
    console.error('[Database] 删除世界观设定异常:', error);
    return false;
  }
}

/**
 * 批量创建世界观设定
 */
export async function dbBatchCreateWorldSettings(
  novelId: string,
  settings: Omit<DBWorldSetting, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>[]
): Promise<DBWorldSetting[]> {
  const results: DBWorldSetting[] = [];

  for (const setting of settings) {
    const result = await dbCreateWorldSetting(novelId, setting);
    if (result) {
      results.push(result);
    }
  }

  console.log('[Database] 批量创建世界观设定:', { count: results.length });
  return results;
}

/**
 * 按类别获取世界观设定
 */
export async function dbGetWorldSettingsByCategory(novelId: string, category: string): Promise<DBWorldSetting[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('world_settings')
      .select('*')
      .eq('novel_id', novelId)
      .eq('category', category)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Database] 按类别获取世界观设定失败:', error);
      return [];
    }

    return (data || []).map(transformWorldSetting);
  } catch (error) {
    console.error('[Database] 按类别获取世界观设定异常:', error);
    return [];
  }
}

// =====================================================
// 角色设定数据库操作
// =====================================================

/**
 * 获取小说的所有角色设定
 */
export async function dbGetCharactersByNovelId(novelId: string): Promise<DBCharacter[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('characters')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Database] 获取角色设定失败:', error);
      return [];
    }

    return (data || []).map(transformCharacter);
  } catch (error) {
    console.error('[Database] 获取角色设定异常:', error);
    return [];
  }
}

/**
 * 获取指定角色设定
 */
export async function dbGetCharacterById(id: string): Promise<DBCharacter | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return transformCharacter(data);
  } catch (error) {
    console.error('[Database] 获取角色设定失败:', error);
    return null;
  }
}

/**
 * 创建角色设定
 */
export async function dbCreateCharacter(
  novelId: string,
  character: Omit<DBCharacter, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>
): Promise<DBCharacter | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
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
        priority: character.priority || 'medium',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[Database] 创建角色设定失败:', error);
      return null;
    }

    console.log('[Database] 创建角色设定:', { id: data.id, name: data.name });
    return transformCharacter(data);
  } catch (error) {
    console.error('[Database] 创建角色设定异常:', error);
    return null;
  }
}

/**
 * 更新角色设定
 */
export async function dbUpdateCharacter(
  id: string,
  updates: Partial<Omit<DBCharacter, 'id' | 'novelId' | 'createdAt'>>
): Promise<DBCharacter | null> {
  try {
    const client = getSupabaseClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.age !== undefined) dbUpdates.age = updates.age;
    if (updates.appearance !== undefined) dbUpdates.appearance = updates.appearance;
    if (updates.personality !== undefined) dbUpdates.personality = updates.personality;
    if (updates.background !== undefined) dbUpdates.background = updates.background;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { data, error } = await client
      .from('characters')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[Database] 更新角色设定失败:', error);
      return null;
    }

    console.log('[Database] 更新角色设定:', { id, name: data.name });
    return transformCharacter(data);
  } catch (error) {
    console.error('[Database] 更新角色设定异常:', error);
    return null;
  }
}

/**
 * 删除角色设定
 */
export async function dbDeleteCharacter(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('characters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Database] 删除角色设定失败:', error);
      return false;
    }

    console.log('[Database] 删除角色设定:', { id });
    return true;
  } catch (error) {
    console.error('[Database] 删除角色设定异常:', error);
    return false;
  }
}

/**
 * 批量创建角色设定
 */
export async function dbBatchCreateCharacters(
  novelId: string,
  characters: Omit<DBCharacter, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>[]
): Promise<DBCharacter[]> {
  const results: DBCharacter[] = [];

  for (const character of characters) {
    const result = await dbCreateCharacter(novelId, character);
    if (result) {
      results.push(result);
    }
  }

  console.log('[Database] 批量创建角色设定:', { count: results.length });
  return results;
}

// =====================================================
// 小说数据库操作
// =====================================================

/**
 * 获取小说基本信息
 */
export async function dbGetNovelById(id: string): Promise<DBNovel | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('novels')
      .select('id, user_id, title, description, genre, status, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      genre: data.genre,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('[Database] 获取小说失败:', error);
    return null;
  }
}

/**
 * 创建小说
 */
export async function dbCreateNovel(
  novel: Omit<DBNovel, 'createdAt' | 'updatedAt'>
): Promise<DBNovel | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('novels')
      .insert({
        id: novel.id,
        user_id: novel.userId,
        title: novel.title,
        description: novel.description,
        genre: novel.genre,
        status: novel.status || 'draft',
      })
      .select('id, user_id, title, description, genre, status, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('[Database] 创建小说失败:', error);
      return null;
    }

    console.log('[Database] 创建小说:', { id: data.id, title: data.title });
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      genre: data.genre,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('[Database] 创建小说异常:', error);
    return null;
  }
}

// =====================================================
// AI创作专用接口
// =====================================================

/**
 * 获取小说的所有设定（世界观+角色）
 * 用于AI创作时提供完整的上下文
 */
export async function dbGetNovelSettingsForAI(novelId: string) {
  const [worldSettings, characters, novel] = await Promise.all([
    dbGetWorldSettingsByNovelId(novelId),
    dbGetCharactersByNovelId(novelId),
    dbGetNovelById(novelId),
  ]);

  return {
    novel,
    worldSettings: worldSettings.map(ws => ({
      id: ws.id,
      category: ws.category,
      title: ws.title,
      content: ws.content,
      priority: ws.priority,
    })),
    characters: characters.map(char => ({
      id: char.id,
      name: char.name,
      age: char.age,
      appearance: char.appearance,
      personality: char.personality,
      background: char.background,
      role: char.role,
      priority: char.priority,
    })),
  };
}

/**
 * 按优先级排序获取设定
 */
export async function dbGetPriorityWorldSettings(novelId: string): Promise<DBWorldSetting[]> {
  const settings = await dbGetWorldSettingsByNovelId(novelId);
  const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
  return settings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * 按优先级排序获取角色
 */
export async function dbGetPriorityCharacters(novelId: string): Promise<DBCharacter[]> {
  const characters = await dbGetCharactersByNovelId(novelId);
  const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
  return characters.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// =====================================================
// 数据迁移工具
// =====================================================

/**
 * 从Novel对象同步到数据库
 * 用于将数据同步到 Supabase
 */
export async function dbSyncNovelToDatabase(novel: any): Promise<void> {
  // 同步小说基本信息
  const existingNovel = await dbGetNovelById(novel.id);
  if (!existingNovel) {
    await dbCreateNovel({
      id: novel.id,
      userId: novel.userId,
      title: novel.title,
      description: novel.description,
      genre: novel.genre,
      status: novel.status || 'draft',
    });
  }

  // 同步世界观设定
  if (novel.worldSettings && Array.isArray(novel.worldSettings)) {
    for (const ws of novel.worldSettings) {
      const existing = await dbGetWorldSettingById(ws.id);
      if (!existing) {
        await dbCreateWorldSetting(novel.id, {
          category: ws.category,
          title: ws.title,
          content: ws.content,
          priority: 'medium',
        });
      }
    }
  }

  // 同步角色设定
  if (novel.characters && Array.isArray(novel.characters)) {
    for (const char of novel.characters) {
      const existing = await dbGetCharacterById(char.id);
      if (!existing) {
        await dbCreateCharacter(novel.id, {
          name: char.name,
          age: char.age,
          appearance: char.appearance,
          personality: char.personality,
          background: char.background,
          role: char.role,
          avatar: char.avatar,
          priority: 'medium',
        });
      }
    }
  }

  console.log('[Database] 同步小说到数据库完成:', { novelId: novel.id, title: novel.title });
}

/**
 * 清空数据库（慎用）
 */
export async function dbClearDatabase(): Promise<void> {
  try {
    const client = getSupabaseClient();

    await Promise.all([
      client.from('world_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      client.from('characters').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      client.from('novels').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);

    console.log('[Database] 数据库已清空');
  } catch (error) {
    console.error('[Database] 清空数据库失败:', error);
  }
}
