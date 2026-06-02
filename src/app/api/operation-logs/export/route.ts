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
 * GET /api/operation-logs/export - 导出操作日志
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 检查是否为管理员（只有管理员可以导出日志）
    const isAdminUser = await isAdmin(userId, client);
    
    if (!isAdminUser) {
      return errorResponse('权限不足，仅管理员可导出操作日志', 403);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // 'json' | 'csv'

    let query = client
      .from('operation_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // 应用过滤条件
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[GET /operation-logs/export] 获取操作日志失败:', error);
      return errorResponse('获取操作日志失败', 500);
    }

    if (format === 'csv') {
      // 导出为 CSV 格式
      const headers = ['ID', '用户ID', '用户名', '小说ID', '操作类型', '操作内容', '操作结果', 'IP地址', '创建时间'];
      const csvRows = [
        headers.join(','),
        ...(logs || []).map((log: any) => [
          log.id,
          log.user_id,
          log.user_name,
          log.novel_id || '',
          log.operation_type,
          JSON.stringify(log.operation_content).replace(/"/g, '""'),
          log.operation_result,
          log.ip_address || '',
          log.created_at,
        ].join(',')),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="operation-logs-${Date.now()}.csv"`,
        },
      });
    } else {
      // 导出为 JSON 格式
      const jsonContent = JSON.stringify(logs || [], null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="operation-logs-${Date.now()}.json"`,
        },
      });
    }
  } catch (error: any) {
    console.error('[GET /operation-logs/export] 导出操作日志异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
