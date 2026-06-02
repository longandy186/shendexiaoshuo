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
 * 检查是否为管理员
 */
async function isAdmin(userId: string, client: any): Promise<boolean> {
  const { data: user } = await client
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return user?.role === 'admin' || user?.is_super_admin === true;
}

/**
 * GET /api/operation-logs - 获取操作日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 检查是否为管理员（只有管理员可以查看所有日志）
    const isAdminUser = await isAdmin(userId, client);
    
    if (!isAdminUser) {
      return errorResponse('权限不足，仅管理员可查看操作日志', 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userIdFilter = searchParams.get('userId');
    const novelIdFilter = searchParams.get('novelId');
    const operationTypeFilter = searchParams.get('operationType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = client
      .from('operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 应用过滤条件
    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }

    if (novelIdFilter) {
      query = query.eq('novel_id', novelIdFilter);
    }

    if (operationTypeFilter) {
      query = query.eq('operation_type', operationTypeFilter);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 清理90天前的日志
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    await client
      .from('operation_logs')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('[GET /operation-logs] 获取操作日志失败:', error);
      return errorResponse('获取操作日志失败', 500);
    }

    // 映射字段
    const mappedLogs = (logs || []).map((log: any) => ({
      ...log,
      userId: log.user_id,
      novelId: log.novel_id,
      operationType: log.operation_type,
      operationTime: log.operation_time,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    }));

    return successResponse({
      logs: mappedLogs,
      total: count || 0,
      limit,
      offset,
    }, '获取操作日志成功');
  } catch (error: any) {
    console.error('[GET /operation-logs] 获取操作日志异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
