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
 * GET /api/novels/[id]/volumes - 获取分卷列表（含章节大纲）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    // 使用嵌套查询一次性获取分卷和章节大纲
    const { data: volumes, error: volumesError } = await client
      .from('volumes')
      .select('*, chapter_outlines(*)')
      .eq('novel_id', novelId)
      .order('sort_order', { ascending: true });

    if (volumesError) throw volumesError;

    // 组装返回数据
    const result = (volumes || []).map((volume: any) => ({
      id: volume.id,
      novelId: volume.novel_id,
      title: volume.title,
      description: volume.description,
      mainConflict: volume.main_conflict,
      keyEvents: volume.key_events || [],
      sortOrder: volume.sort_order,
      createdAt: volume.created_at,
      updatedAt: volume.updated_at,
      chapters: (volume.chapter_outlines || []).map((ch: any) => ({
        id: ch.id,
        volumeId: ch.volume_id,
        chapterNumber: ch.chapter_number,
        title: ch.title,
        summary: ch.summary,
        keyScenes: ch.key_scenes || [],
        status: ch.status,
        sortOrder: ch.sort_order,
        createdAt: ch.created_at,
        updatedAt: ch.updated_at,
      })),
    }));

    return successResponse(result, '获取分卷列表成功');
  } catch (error: any) {
    console.error('获取分卷列表失败:', error);
    return errorResponse('获取分卷列表失败', 500);
  }
}

/**
 * POST /api/novels/[id]/volumes - 创建新分卷
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const volume = await request.json();
    console.log('[POST /volumes] 接收到的数据:', volume);

    // 获取当前最大排序号
    const { data: maxOrderResult } = await client
      .from('volumes')
      .select('sort_order')
      .eq('novel_id', novelId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = maxOrderResult ? (maxOrderResult.sort_order || 0) + 1 : 1;

    const { data, error } = await client
      .from('volumes')
      .insert({
        novel_id: novelId,
        title: volume.title || '',
        description: volume.description || '',
        main_conflict: volume.main_conflict || '',
        key_events: volume.key_events || [],
        sort_order: nextSortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /volumes] 数据库插入错误:', error);
      throw error;
    }

    return successResponse(data, '创建分卷成功');
  } catch (error: any) {
    console.error('创建分卷失败:', error);
    return errorResponse(`创建分卷失败: ${error.message}`, 500);
  }
}
