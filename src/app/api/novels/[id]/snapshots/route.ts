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
 * POST /api/novels/[id]/snapshots - 创建快照
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此小说', 403);
    }

    const body = await request.json();
    const { snapshotType = 'auto', content } = body;

    if (!content) {
      return errorResponse('快照内容不能为空');
    }

    // 生成快照ID
    const snapshotId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 如果是自动快照，清理旧的快照（只保留最近3次）
    if (snapshotType === 'auto') {
      const { data: oldSnapshots } = await client
        .from('novel_snapshots')
        .select('id')
        .eq('novel_id', novelId)
        .eq('snapshot_type', 'auto')
        .order('created_at', { ascending: false })
        .range(3, 100);

      if (oldSnapshots && oldSnapshots.length > 0) {
        const oldSnapshotIds = oldSnapshots.map((s: any) => s.id);
        await client
          .from('novel_snapshots')
          .delete()
          .in('id', oldSnapshotIds);
      }
    }

    // 创建快照
    const { data: snapshot, error } = await client
      .from('novel_snapshots')
      .insert({
        id: snapshotId,
        novel_id: novelId,
        user_id: userId,
        snapshot_type: snapshotType,
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /snapshots] 创建快照失败:', error);
      return errorResponse('创建快照失败', 500);
    }

    return successResponse(snapshot, '快照创建成功');
  } catch (error: any) {
    console.error('[POST /snapshots] 创建快照异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * GET /api/novels/[id]/snapshots - 获取快照列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权查看此小说', 403);
    }

    const { searchParams } = new URL(request.url);
    const snapshotType = searchParams.get('type'); // 'manual' | 'auto' | null (all)

    let query = client
      .from('novel_snapshots')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (snapshotType) {
      query = query.eq('snapshot_type', snapshotType);
    }

    const { data: snapshots, error } = await query;

    if (error) {
      console.error('[GET /snapshots] 获取快照列表失败:', error);
      return errorResponse('获取快照列表失败', 500);
    }

    // 映射字段
    const mappedSnapshots = (snapshots || []).map((s: any) => ({
      ...s,
      novelId: s.novel_id,
      userId: s.user_id,
      snapshotType: s.snapshot_type,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return successResponse(mappedSnapshots, '获取快照列表成功');
  } catch (error: any) {
    console.error('[GET /snapshots] 获取快照列表异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
