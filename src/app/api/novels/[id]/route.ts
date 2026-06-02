import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/utils/jwt';


/**
 * 统一响应格式
 */
function successResponse(data: any, message: string = '操作成功') {
  return NextResponse.json({
    code: 200,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(message: string, code: number = 400, data: any = null) {
  return NextResponse.json({
    code,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code });
}

/**
 * 验证JWT Token并获取用户ID
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    return decoded.userId;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 验证小说归属权
 */
async function verifyNovelOwnership(novelId: string, userId: string, client: any): Promise<boolean> {
  const { data: novel } = await client
    .from('novels')
    .select('id')
    .eq('id', novelId)
    .eq('user_id', userId)
    .single();

  return !!novel;
}

/**
 * GET /api/novels/[id] - 获取单个小说详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    // 获取小说
    const { data: novel, error: novelError } = await client
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .eq('user_id', userId)
      .single();

    if (novelError || !novel) {
      return errorResponse('小说不存在', 404);
    }

    // 获取关联数据
    const [characters, chapters, worldSettings] = await Promise.all([
      client.from('characters').select('*').eq('novel_id', novelId),
      client.from('chapters').select('*').eq('novel_id', novelId).order('order', { ascending: true }),
      client.from('world_settings').select('*').eq('novel_id', novelId),
    ]);

    // 映射章节数据字段
    const mappedChapters = (chapters.data || []).map((ch: any) => ({
      ...ch,
      novelId: ch.novel_id,
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
      outline: ch.outline || '', // 章节大纲，从数据库读取
      // 添加前端需要的但数据库不存在的字段的默认值
      keywords: '',
      status: 'draft' as const,
      version: 1,
    }));

    // 映射角色数据字段
    const mappedCharacters = (characters.data || []).map((char: any) => ({
      ...char,
      novelId: char.novel_id,
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    }));

    // 映射世界观设定数据字段
    const mappedWorldSettings = (worldSettings.data || []).map((ws: any) => ({
      ...ws,
      novelId: ws.novel_id,
      title: ws.name,  // 数据库使用 name，前端使用 title
      content: ws.description,  // 数据库使用 description，前端使用 content
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    }));

    return successResponse({
      ...novel,
      novelId: novel.id,  // 添加 novelId 字段
      createdAt: novel.created_at,  // 映射 created_at
      updatedAt: novel.updated_at,  // 映射 updated_at
      userId: novel.user_id,  // 映射 user_id
      coverImage: novel.cover_image,  // 映射 cover_image
      notes: novel.notes || '', // 小说笔记，从数据库读取
      characters: mappedCharacters,
      chapters: mappedChapters,
      worldSettings: mappedWorldSettings,
    }, '获取小说成功');
  } catch (error: any) {
    console.error('获取小说失败:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * PUT /api/novels/[id] - 更新小说
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    console.log('[PUT /api/novels/[id]] 开始更新，userId:', userId);

    if (!userId) {
      console.log('[PUT /api/novels/[id]] 用户未登录');
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    console.log('[PUT /api/novels/[id]] novelId:', novelId);

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      console.log('[PUT /api/novels/[id]] 无权修改此小说');
      return errorResponse('无权修改此小说', 403);
    }

    const body = await request.json();
    const { title, description, notes, genre, status, characters, chapters, worldSettings } = body;

    console.log('[PUT /api/novels/[id]] 请求数据:', {
      title,
      description,
      notes: notes ? '有笔记内容' : '无笔记内容',
      genre,
      status,
      hasCharacters: !!characters,
      charactersCount: characters?.length,
      hasChapters: !!chapters,
      chaptersCount: chapters?.length,
      hasWorldSettings: !!worldSettings,
      worldSettingsCount: worldSettings?.length
    });

    // 更新小说基本信息（如果有提供）
    const hasBasicInfo = title !== undefined || description !== undefined || notes !== undefined || genre !== undefined || status !== undefined;

    if (hasBasicInfo) {
      const { data: novel, error: novelError } = await client
        .from('novels')
        .update({
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          notes: notes !== undefined ? notes : undefined,
          genre: genre !== undefined ? genre : undefined,
          status: status !== undefined ? status : undefined,
        })
        .eq('id', novelId)
        .select()
        .single();

      if (novelError) {
        console.error('[PUT /api/novels/[id]] 更新小说基本信息失败:', novelError);
        return errorResponse('更新小说失败', 500);
      }

      console.log('[PUT /api/novels/[id]] 小说基本信息更新成功');
    } else {
      console.log('[PUT /api/novels/[id]] 跳过更新小说基本信息');
    }

    // 更新关联数据（如果提供）
    if (characters) {
      console.log('[PUT /api/novels/[id]] 开始更新角色');
      // 先删除旧的角色
      const { error: deleteCharError } = await client.from('characters').delete().eq('novel_id', novelId);
      if (deleteCharError) {
        console.error('[PUT /api/novels/[id]] 删除旧角色失败:', deleteCharError);
      }
      // 插入新角色
      if (characters.length > 0) {
        const charactersToInsert = characters.map((char: any) => {
          // 清理不需要的字段
          const { novelId: _novelId, createdAt: _createdAt, updatedAt: _updatedAt, ...cleanChar } = char;
          return {
            id: char.id,
            novel_id: novelId,
            name: char.name || '',
            age: char.age || null,
            appearance: char.appearance || '',
            personality: char.personality || '',
            background: char.background || '',
            role: char.role || '',
            avatar: char.avatar || '',
            created_at: char.createdAt || new Date().toISOString(),
            updated_at: char.updatedAt || new Date().toISOString(),
          };
        });
        const { error: insertCharError } = await client.from('characters').insert(charactersToInsert);
        if (insertCharError) {
          console.error('[PUT /api/novels/[id]] 插入新角色失败:', insertCharError);
          throw new Error(`插入角色失败: ${insertCharError.message}`);
        }
      }
    }

    if (chapters) {
      console.log('[PUT /api/novels/[id]] 开始更新章节');
      // 先删除旧的章节
      const { error: deleteChapterError } = await client.from('chapters').delete().eq('novel_id', novelId);
      if (deleteChapterError) {
        console.error('[PUT /api/novels/[id]] 删除旧章节失败:', deleteChapterError);
      }
      // 插入新章节
      if (chapters.length > 0) {
        const chaptersToInsert = chapters.map((ch: any, index: number) => {
          // 清理不需要的字段
          const { id, novelId: _novelId, createdAt: _createdAt, updatedAt: _updatedAt, status: _status, version: _version, userId: _userId, ...cleanChapter } = ch;
          
          // 计算字数
          const wordCount = (ch.content || '').length;
          
          return {
            id: ch.id,
            novel_id: novelId,
            order: ch.order || index + 1,
            title: ch.title || '',
            content: ch.content || '',
            word_count: wordCount,
            created_at: ch.createdAt || new Date().toISOString(),
            updated_at: ch.updatedAt || new Date().toISOString(),
          };
        });

        console.log('[PUT /api/novels/[id]] 准备插入章节数据:', {
          count: chaptersToInsert.length,
          firstChapter: chaptersToInsert[0]
        });

        const { error: insertChapterError } = await client.from('chapters').insert(chaptersToInsert);
        if (insertChapterError) {
          console.error('[PUT /api/novels/[id]] 插入新章节失败:', insertChapterError);
          throw new Error(`插入章节失败: ${insertChapterError.message}`);
        }
      }
      console.log('[PUT /api/novels/[id]] 章节更新成功');
    }

    if (worldSettings) {
      console.log('[PUT /api/novels/[id]] 开始更新世界观设定');
      // 先删除旧的世界观设定
      const { error: deleteSettingError } = await client.from('world_settings').delete().eq('novel_id', novelId);
      if (deleteSettingError) {
        console.error('[PUT /api/novels/[id]] 删除旧世界观设定失败:', deleteSettingError);
      }
      // 插入新世界观设定
      if (worldSettings.length > 0) {
        const settingsToInsert = worldSettings.map((setting: any) => {
          // 清理不需要的字段
          const { novelId: _novelId, title: _title, content: _content, createdAt: _createdAt, ...cleanSetting } = setting;
          return {
            id: setting.id,
            novel_id: novelId,
            category: setting.category || '',
            name: setting.title || '',
            description: setting.content || '',
            relationships: setting.relationships || '',
            created_at: setting.createdAt || new Date().toISOString(),
            updated_at: setting.updatedAt || new Date().toISOString(),
          };
        });
        const { error: insertSettingError } = await client.from('world_settings').insert(settingsToInsert);
        if (insertSettingError) {
          console.error('[PUT /api/novels/[id]] 插入世界观设定失败:', insertSettingError);
          throw new Error(`插入世界观设定失败: ${insertSettingError.message}`);
        }
      }
      console.log('[PUT /api/novels/[id]] 世界观设定更新成功');
    }

    // 重新获取更新后的完整数据
    const [novelData, updatedCharacters, updatedChapters, updatedWorldSettings] = await Promise.all([
      client.from('novels').select('*').eq('id', novelId).single(),
      client.from('characters').select('*').eq('novel_id', novelId),
      client.from('chapters').select('*').eq('novel_id', novelId).order('order', { ascending: true }),
      client.from('world_settings').select('*').eq('novel_id', novelId),
    ]);

    // 映射章节数据字段
    const mappedChapters = (updatedChapters.data || []).map((ch: any) => ({
      ...ch,
      novelId: ch.novel_id,
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
      outline: ch.outline || '', // 章节大纲，从数据库读取
      // 添加前端需要的但数据库不存在的字段的默认值
      keywords: '',
      status: 'draft' as const,
      version: 1,
    }));

    // 映射角色数据字段
    const mappedCharacters = (updatedCharacters.data || []).map((char: any) => ({
      ...char,
      novelId: char.novel_id,
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    }));

    // 映射世界观设定数据字段
    const mappedWorldSettings = (updatedWorldSettings.data || []).map((ws: any) => ({
      ...ws,
      novelId: ws.novel_id,
      title: ws.name,  // 数据库使用 name，前端使用 title
      content: ws.description,  // 数据库使用 description，前端使用 content
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    }));

    console.log('[PUT /api/novels/[id]] 更新完成，返回数据', {
      chaptersCount: mappedChapters.length
    });

    return successResponse({
      ...novelData.data,
      notes: novelData.data?.notes || '', // 小说笔记，从数据库读取
      characters: mappedCharacters,
      chapters: mappedChapters,
      worldSettings: mappedWorldSettings,
    }, '更新小说成功');
  } catch (error: any) {
    console.error('[PUT /api/novels/[id]] 更新小说异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * DELETE /api/novels/[id] - 删除小说
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权删除此小说', 403);
    }

    // 删除小说（由于设置了ON DELETE CASCADE，关联的角色、章节、世界观会自动删除）
    const { error } = await client
      .from('novels')
      .delete()
      .eq('id', novelId);

    if (error) {
      console.error('删除小说失败:', error);
      return errorResponse('删除小说失败', 500);
    }

    return successResponse({ id: novelId }, '删除小说成功');
  } catch (error: any) {
    console.error('删除小说失败:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
