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
 * PUT /api/novels/[id]/volumes/[volumeId]/chapters/[chapterId] - 更新章节大纲
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; volumeId: string; chapterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, chapterId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const chapter = await request.json();
    console.log('[PUT /chapters/:chapterId] 接收到的数据:', chapter);

    const { data, error } = await client
      .from('chapter_outlines')
      .update({
        chapter_number: chapter.chapter_number,
        title: chapter.title || '',
        summary: chapter.summary || '',
        key_scenes: chapter.key_scenes || [],
        status: chapter.status || 'draft',
        sort_order: chapter.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chapterId)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data, '更新章节大纲成功');
  } catch (error: any) {
    console.error('更新章节大纲失败:', error);
    return errorResponse('更新章节大纲失败', 500);
  }
}

/**
 * DELETE /api/novels/[id]/volumes/[volumeId]/chapters/[chapterId] - 删除章节大纲
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; volumeId: string; chapterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, chapterId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const { data, error } = await client
      .from('chapter_outlines')
      .delete()
      .eq('id', chapterId)
      .select()
      .single();

    if (error) throw error;

    return successResponse({ deleted: true }, '删除章节大纲成功');
  } catch (error: any) {
    console.error('删除章节大纲失败:', error);
    return errorResponse('删除章节大纲失败', 500);
  }
}
