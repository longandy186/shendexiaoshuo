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
 * PUT /api/novels/[id]/foreshadowing/[itemId] - 更新伏线
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, itemId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const body = await request.json();
    const { status, description, resolvedChapter, notes, name, plantedChapter, plannedResolution, relatedCharacters } = body;

    // 构建更新对象，只包含提供的字段
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (resolvedChapter !== undefined) updateData.resolved_chapter = resolvedChapter;
    if (notes !== undefined) updateData.notes = notes;
    if (name !== undefined) updateData.name = name;
    if (plantedChapter !== undefined) updateData.planted_chapter = plantedChapter;
    if (plannedResolution !== undefined) updateData.planned_resolution = plannedResolution;
    if (relatedCharacters !== undefined) updateData.related_characters = relatedCharacters;

    const { data, error } = await client
      .from('foreshadowing')
      .update(updateData)
      .eq('id', itemId)
      .eq('novel_id', novelId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /foreshadowing/:itemId] 更新伏线失败:', error);
      return errorResponse('更新伏线失败', 500);
    }

    return successResponse(data, '更新伏线成功');
  } catch (error: any) {
    console.error('[PUT /foreshadowing/:itemId] 更新伏线失败:', error);
    return errorResponse(`更新伏线失败: ${error.message}`, 500);
  }
}

/**
 * DELETE /api/novels/[id]/foreshadowing/[itemId] - 删除伏线
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, itemId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const { data, error } = await client
      .from('foreshadowing')
      .delete()
      .eq('id', itemId)
      .eq('novel_id', novelId)
      .select()
      .single();

    if (error) {
      console.error('[DELETE /foreshadowing/:itemId] 删除伏线失败:', error);
      return errorResponse('删除伏线失败', 500);
    }

    return successResponse({ deleted: true }, '删除伏线成功');
  } catch (error: any) {
    console.error('[DELETE /foreshadowing/:itemId] 删除伏线失败:', error);
    return errorResponse('删除伏线失败', 500);
  }
}
