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
 * GET /api/novels/[id]/foreshadowing - 获取伏线列表
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = client
      .from('foreshadowing')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /foreshadowing] 查询错误:', error);
      throw error;
    }

    return successResponse(data || [], '获取伏线列表成功');
  } catch (error: any) {
    console.error('[GET /foreshadowing] 获取伏线列表失败:', error);
    return errorResponse('获取伏线列表失败', 500);
  }
}

/**
 * POST /api/novels/[id]/foreshadowing - 创建伏线
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

    const body = await request.json();
    const { name, description, plantedChapter, plannedResolution, relatedCharacters } = body;

    if (!name) {
      return errorResponse('伏线名称不能为空');
    }

    const foreshadowingData = {
      novel_id: novelId,
      name: name,
      description: description || '',
      planted_chapter: plantedChapter || '',
      planned_resolution: plannedResolution || '',
      related_characters: relatedCharacters || [],
      status: 'planted',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('foreshadowing')
      .insert(foreshadowingData)
      .select()
      .single();

    if (error) {
      console.error('[POST /foreshadowing] 创建伏线失败:', error);
      throw error;
    }

    return successResponse(data, '创建伏线成功');
  } catch (error: any) {
    console.error('[POST /foreshadowing] 创建伏线失败:', error);
    return errorResponse(`创建伏线失败: ${error.message}`, 500);
  }
}
