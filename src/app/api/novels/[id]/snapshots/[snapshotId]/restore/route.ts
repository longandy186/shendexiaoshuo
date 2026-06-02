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
 * POST /api/novels/[id]/snapshots/[snapshotId]/restore - 恢复快照
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, snapshotId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此小说', 403);
    }

    // 获取快照内容
    const { data: snapshot, error: snapshotError } = await client
      .from('novel_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .eq('novel_id', novelId)
      .single();

    if (snapshotError || !snapshot) {
      return errorResponse('快照不存在', 404);
    }

    // 恢复小说内容（仅恢复章节、角色、世界观等关联数据）
    const { content } = snapshot;
    const { characters, chapters, worldSettings } = content;

    // 更新小说的关联数据
    const [novelData] = await Promise.all([
      client.from('novels').select('*').eq('id', novelId).single(),
    ]);

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
      { restoredFrom: snapshotId, restoredAt: new Date().toISOString() },
      '快照恢复成功'
    );
  } catch (error: any) {
    console.error('[POST /snapshots/restore] 恢复快照异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
