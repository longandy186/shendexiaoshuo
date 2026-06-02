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
 * 检查用户权限
 */
async function checkPermission(
  novelId: string, 
  userId: string, 
  client: any
): Promise<{ hasPermission: boolean; level: string | null }> {
  // 检查是否为小说拥有者
  const { data: novel } = await client
    .from('novels')
    .select('user_id')
    .eq('id', novelId)
    .single();

  if (novel?.user_id === userId) {
    return { hasPermission: true, level: 'manage' };
  }

  // 检查权限表
  const { data: permission } = await client
    .from('novel_permissions')
    .select('permission_level')
    .eq('novel_id', novelId)
    .eq('user_id', userId)
    .single();

  if (permission) {
    return { hasPermission: true, level: permission.permission_level };
  }

  return { hasPermission: false, level: null };
}

/**
 * POST /api/novels/[id]/permissions - 添加权限
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
      return errorResponse('无权管理此小说的权限', 403);
    }

    const body = await request.json();
    const { targetUserId, permissionLevel } = body;

    if (!targetUserId || !permissionLevel) {
      return errorResponse('参数不完整');
    }

    if (!['view', 'edit', 'publish', 'manage'].includes(permissionLevel)) {
      return errorResponse('无效的权限级别');
    }

    // 生成权限ID
    const permissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 添加权限
    const { data: permission, error } = await client
      .from('novel_permissions')
      .insert({
        id: permissionId,
        novel_id: novelId,
        user_id: targetUserId,
        permission_level: permissionLevel,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /permissions] 添加权限失败:', error);
      return errorResponse('添加权限失败', 500);
    }

    return successResponse(permission, '权限添加成功');
  } catch (error: any) {
    console.error('[POST /permissions] 添加权限异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * GET /api/novels/[id]/permissions - 获取权限列表
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

    // 验证小说归属权或是否有管理权限
    const { hasPermission, level } = await checkPermission(novelId, userId, client);
    if (!hasPermission || (level !== 'manage' && level !== 'publish')) {
      return errorResponse('权限不足', 403);
    }

    const { data: permissions, error } = await client
      .from('novel_permissions')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /permissions] 获取权限列表失败:', error);
      return errorResponse('获取权限列表失败', 500);
    }

    return successResponse(permissions || [], '获取权限列表成功');
  } catch (error: any) {
    console.error('[GET /permissions] 获取权限列表异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * DELETE /api/novels/[id]/permissions - 删除权限
 */
export async function DELETE(
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
      return errorResponse('无权管理此小说的权限', 403);
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return errorResponse('缺少目标用户ID');
    }

    // 删除权限
    const { error } = await client
      .from('novel_permissions')
      .delete()
      .eq('novel_id', novelId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[DELETE /permissions] 删除权限失败:', error);
      return errorResponse('删除权限失败', 500);
    }

    return successResponse({ deleted: true }, '权限删除成功');
  } catch (error: any) {
    console.error('[DELETE /permissions] 删除权限异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
