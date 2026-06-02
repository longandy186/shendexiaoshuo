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
 * PUT /api/novels/[id]/chapters/[chapterId] - 更新单个章节
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, chapterId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此小说', 403);
    }

    // 验证章节是否属于该小说
    const { data: existingChapter, error: chapterError } = await client
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('novel_id', novelId)
      .single();

    if (chapterError || !existingChapter) {
      return errorResponse('章节不存在或无权访问', 404);
    }

    const body = await request.json();
    const { title, content, outline, order } = body;

    // 构建更新数据（只更新提供的字段）
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = content;
      updateData.word_count = content.length;
    }
    if (outline !== undefined) updateData.outline = outline;
    if (order !== undefined) updateData.order = order;
    updateData.updated_at = new Date().toISOString();

    // 更新章节
    const { data: updatedChapter, error: updateError } = await client
      .from('chapters')
      .update(updateData)
      .eq('id', chapterId)
      .eq('novel_id', novelId)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT /chapters/[chapterId]] 更新章节失败:', updateError);
      return errorResponse('更新章节失败', 500);
    }

    // 映射返回数据
    const mappedChapter = {
      ...updatedChapter,
      novelId: updatedChapter.novel_id,
      createdAt: updatedChapter.created_at,
      updatedAt: updatedChapter.updated_at,
    };

    return successResponse(mappedChapter, '更新章节成功');
  } catch (error: any) {
    console.error('[PUT /chapters/[chapterId]] 更新章节异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * DELETE /api/novels/[id]/chapters/[chapterId] - 删除单个章节
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, chapterId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此小说', 403);
    }

    // 验证章节是否属于该小说
    const { data: existingChapter, error: chapterError } = await client
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('novel_id', novelId)
      .single();

    if (chapterError || !existingChapter) {
      return errorResponse('章节不存在或无权访问', 404);
    }

    // 删除章节
    const { error: deleteError } = await client
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('novel_id', novelId);

    if (deleteError) {
      console.error('[DELETE /chapters/[chapterId]] 删除章节失败:', deleteError);
      return errorResponse('删除章节失败', 500);
    }

    return successResponse({ id: chapterId }, '删除章节成功');
  } catch (error: any) {
    console.error('[DELETE /chapters/[chapterId]] 删除章节异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
