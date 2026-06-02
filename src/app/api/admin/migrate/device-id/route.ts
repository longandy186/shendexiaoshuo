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
 * 验证JWT Token并获取用户ID和角色
 */
function getUserInfoFromRequest(request: NextRequest): { userId: string | null; role: string | null } {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return { userId: null, role: null };

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return { userId: null, role: null };

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Token验证失败:', error);
    return { userId: null, role: null };
  }
}

/**
 * 执行数据库迁移：添加device_id字段
 * POST /api/admin/migrate/device-id
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户信息
    const { userId, role } = getUserInfoFromRequest(request);

    if (!userId) {
      return errorResponse('未登录', 401);
    }

    // 只有超级管理员可以执行迁移
    if (role !== 'admin' && role !== 'superadmin') {
      return errorResponse('权限不足', 403);
    }

    const client = getSupabaseClient();

    // 检查device_id列是否存在
    const { data: columns, error: checkError } = await client.rpc('check_column_exists', {
      table_name: 'users',
      column_name: 'device_id',
    });

    // 如果check_column_exists函数不存在或返回错误，尝试直接添加列
    if (checkError || !columns) {
      // 使用Supabase SQL API添加列
      const { error: alterError } = await client.rpc('exec_sql', {
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;'
      });

      if (alterError) {
        console.error('添加device_id列失败:', alterError);
        return errorResponse('数据库迁移失败，请手动执行SQL: ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;', 500);
      }
    }

    return successResponse({ success: true }, '数据库迁移成功');
  } catch (error: any) {
    console.error('数据库迁移失败:', error);
    return errorResponse('数据库迁移失败: ' + error.message, 500);
  }
}
