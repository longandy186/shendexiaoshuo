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
 * GET /api/novels/[id]/volumes/[volumeId]/chapters - 获取章节大纲列表
 */
export async function GET(
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

    const { data, error } = await client
      .from('chapter_outlines')
      .select('*')
      .eq('volume_id', volumeId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return successResponse(data || [], '获取章节大纲列表成功');
  } catch (error: any) {
    console.error('获取章节大纲列表失败:', error);
    return errorResponse('获取章节大纲列表失败', 500);
  }
}

/**
 * POST /api/novels/[id]/volumes/[volumeId]/chapters - 创建章节大纲
 */
export async function POST(
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

    const chapter = await request.json();
    console.log('[POST /chapters] 接收到的数据:', chapter);

    // 获取当前最大排序号和章节号
    const { data: maxResult } = await client
      .from('chapter_outlines')
      .select('sort_order, chapter_number')
      .eq('volume_id', volumeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = maxResult ? (maxResult.sort_order || 0) + 1 : 1;
    const nextChapterNumber = maxResult ? (maxResult.chapter_number || 0) + 1 : 1;

    const { data, error } = await client
      .from('chapter_outlines')
      .insert({
        volume_id: volumeId,
        chapter_number: chapter.chapter_number || nextChapterNumber,
        title: chapter.title || '',
        summary: chapter.summary || '',
        key_scenes: chapter.key_scenes || [],
        status: chapter.status || 'draft',
        sort_order: chapter.sort_order || nextSortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /chapters] 数据库插入错误:', error);
      throw error;
    }

    return successResponse(data, '创建章节大纲成功');
  } catch (error: any) {
    console.error('创建章节大纲失败:', error);
    return errorResponse(`创建章节大纲失败: ${error.message}`, 500);
  }
}
