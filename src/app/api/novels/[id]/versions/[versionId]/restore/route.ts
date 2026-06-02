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
 * POST /api/novels/[id]/versions/[versionId]/restore - 恢复版本
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, versionId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此小说', 403);
    }

    // 获取版本内容
    const { data: version, error: versionError } = await client
      .from('novel_versions')
      .select('*')
      .eq('id', versionId)
      .eq('novel_id', novelId)
      .single();

    if (versionError || !version) {
      return errorResponse('版本不存在', 404);
    }

    // 恢复小说内容（会创建新版本）
    const { content } = version;
    const { characters, chapters, worldSettings } = content;

    // 先创建当前状态为新版本（恢复前备份）
    const [currentNovel] = await Promise.all([
      client.from('novels').select('*').eq('id', novelId).single(),
      client.from('characters').select('*').eq('novel_id', novelId),
      client.from('chapters').select('*').eq('novel_id', novelId).order('order', { ascending: true }),
      client.from('world_settings').select('*').eq('novel_id', novelId),
    ]);

    if (currentNovel.data) {
      const { data: lastVersion } = await client
        .from('novel_versions')
        .select('version_number')
        .eq('novel_id', novelId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (lastVersion?.version_number || 0) + 1;
      const backupVersionId = `${Date.now()}-backup-${Math.random().toString(36).substr(2, 9)}`;

      await client.from('novel_versions').insert({
        id: backupVersionId,
        novel_id: novelId,
        user_id: userId,
        version_number: newVersionNumber,
        content: {
          characters: currentNovel.data[1]?.data || [],
          chapters: currentNovel.data[2]?.data || [],
          worldSettings: currentNovel.data[3]?.data || [],
        },
        change_summary: `恢复前备份（恢复至版本 ${version.version_number}）`,
      });
    }

    // 删除旧的关联数据
    await Promise.all([
      client.from('characters').delete().eq('novel_id', novelId),
      client.from('chapters').delete().eq('novel_id', novelId),
      client.from('world_settings').delete().eq('novel_id', novelId),
    ]);

    // 插入恢复的关联数据
    if (characters && characters.length > 0) {
      const charactersToInsert = characters.map((char: any) => ({
        id: char.id,
        novel_id: novelId,
        name: char.name,
        age: char.age,
        appearance: char.appearance,
        personality: char.personality,
        background: char.background,
        role: char.role,
        avatar: char.avatar,
        created_at: char.createdAt,
        updated_at: char.updatedAt,
      }));
      await client.from('characters').insert(charactersToInsert);
    }

    if (chapters && chapters.length > 0) {
      const chaptersToInsert = chapters.map((ch: any) => ({
        id: ch.id,
        novel_id: novelId,
        order: ch.order,
        title: ch.title,
        content: ch.content,
        word_count: ch.content.length,
        created_at: ch.createdAt,
        updated_at: ch.updatedAt,
      }));
      await client.from('chapters').insert(chaptersToInsert);
    }

    if (worldSettings && worldSettings.length > 0) {
      const settingsToInsert = worldSettings.map((ws: any) => ({
        id: ws.id,
        novel_id: novelId,
        category: ws.category,
        name: ws.title,
        description: ws.content,
        relationships: ws.relationships,
        created_at: ws.createdAt,
        updated_at: ws.updatedAt,
      }));
      await client.from('world_settings').insert(settingsToInsert);
    }

    return successResponse(
      { restoredFrom: versionId, restoredAt: new Date().toISOString() },
      '版本恢复成功'
    );
  } catch (error: any) {
    console.error('[POST /versions/restore] 恢复版本异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
