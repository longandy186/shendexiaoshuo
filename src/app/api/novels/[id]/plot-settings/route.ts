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
 * GET /api/novels/[id]/plot-settings - 获取剧情设置
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

    const { data, error } = await client
      .from('plot_settings')
      .select('*')
      .eq('novel_id', novelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 没有找到行
      console.error('[GET /plot-settings] 查询错误:', error);
      throw error;
    }

    return successResponse(data || null, '获取剧情设置成功');
  } catch (error: any) {
    console.error('获取剧情设置失败:', error);
    return errorResponse('获取剧情设置失败', 500);
  }
}

/**
 * POST /api/novels/[id]/plot-settings - 创建或更新剧情设置
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

    const plotSettings = await request.json();
    console.log('[POST /plot-settings] 接收到的数据:', plotSettings);

    // 检查是否已存在
    const { data: existing } = await client
      .from('plot_settings')
      .select('id')
      .eq('novel_id', novelId)
      .single();

    let result;
    if (existing) {
      // 更新
      const { data, error } = await client
        .from('plot_settings')
        .update({
          core_conflict: plotSettings.core_conflict || '',
          main_plot: plotSettings.main_plot || '',
          sub_plots: plotSettings.sub_plots || [],
          turning_points: plotSettings.turning_points || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // 创建
      const { data, error } = await client
        .from('plot_settings')
        .insert({
          novel_id: novelId,
          core_conflict: plotSettings.core_conflict || '',
          main_plot: plotSettings.main_plot || '',
          sub_plots: plotSettings.sub_plots || [],
          turning_points: plotSettings.turning_points || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return successResponse(result, '保存剧情设置成功');
  } catch (error: any) {
    console.error('保存剧情设置失败:', error);
    return errorResponse(`保存剧情设置失败: ${error.message}`, 500);
  }
}
