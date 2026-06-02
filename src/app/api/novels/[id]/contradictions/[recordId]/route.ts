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
 * GET /api/novels/[id]/contradictions/[recordId] - 获取特定矛盾检测记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, recordId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const { data, error } = await client
      .from('contradiction_checks')
      .select('*')
      .eq('id', recordId)
      .eq('novel_id', novelId)
      .single();

    if (error) {
      console.error('[GET /contradictions/:recordId] 查询错误:', error);
      return errorResponse('记录不存在', 404);
    }

    return successResponse(data, '获取矛盾检测记录成功');
  } catch (error: any) {
    console.error('[GET /contradictions/:recordId] 获取矛盾检测记录失败:', error);
    return errorResponse('获取矛盾检测记录失败', 500);
  }
}

/**
 * DELETE /api/novels/[id]/contradictions/[recordId] - 删除矛盾检测记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId, recordId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const { data, error } = await client
      .from('contradiction_checks')
      .delete()
      .eq('id', recordId)
      .eq('novel_id', novelId)
      .select()
      .single();

    if (error) {
      console.error('[DELETE /contradictions/:recordId] 删除错误:', error);
      return errorResponse('删除失败', 500);
    }

    return successResponse({ deleted: true }, '删除矛盾检测记录成功');
  } catch (error: any) {
    console.error('[DELETE /contradictions/:recordId] 删除矛盾检测记录失败:', error);
    return errorResponse('删除矛盾检测记录失败', 500);
  }
}
