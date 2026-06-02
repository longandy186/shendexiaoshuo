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

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

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
 * PUT /api/novels/[id]/volumes/[volumeId] - 更新分卷
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; volumeId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, volumeId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const volume = await request.json();
    console.log('[PUT /volumes/:volumeId] 接收到的数据:', volume);

    const { data, error } = await client
      .from('volumes')
      .update({
        title: volume.title || '',
        description: volume.description || '',
        main_conflict: volume.main_conflict || '',
        key_events: volume.key_events || [],
        sort_order: volume.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', volumeId)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data, '更新分卷成功');
  } catch (error: any) {
    console.error('更新分卷失败:', error);
    return errorResponse('更新分卷失败', 500);
  }
}

/**
 * DELETE /api/novels/[id]/volumes/[volumeId] - 删除分卷
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; volumeId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, volumeId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    // 先删除该分卷下的所有章节大纲
    await client
      .from('chapter_outlines')
      .delete()
      .eq('volume_id', volumeId);

    // 再删除分卷
    const { data, error } = await client
      .from('volumes')
      .delete()
      .eq('id', volumeId)
      .select()
      .single();

    if (error) throw error;

    return successResponse({ deleted: true }, '删除分卷成功');
  } catch (error: any) {
    console.error('删除分卷失败:', error);
    return errorResponse('删除分卷失败', 500);
  }
}
