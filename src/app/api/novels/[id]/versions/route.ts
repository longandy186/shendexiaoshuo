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
 * POST /api/novels/[id]/versions - 创建版本
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
    const { content, changeSummary } = body;

    if (!content) {
      return errorResponse('版本内容不能为空');
    }

    // 获取当前最大版本号
    const { data: lastVersion } = await client
      .from('novel_versions')
      .select('version_number')
      .eq('novel_id', novelId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (lastVersion?.version_number || 0) + 1;

    // 生成版本ID
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 清理旧版本（只保留最近30个版本）
    const { data: oldVersions } = await client
      .from('novel_versions')
      .select('id')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false })
      .range(30, 100);

    if (oldVersions && oldVersions.length > 0) {
      const oldVersionIds = oldVersions.map((v: any) => v.id);
      await client
        .from('novel_versions')
        .delete()
        .in('id', oldVersionIds);
    }

    // 创建版本
    const { data: version, error } = await client
      .from('novel_versions')
      .insert({
        id: versionId,
        novel_id: novelId,
        user_id: userId,
        version_number: newVersionNumber,
        content: content,
        change_summary: changeSummary || `版本 ${newVersionNumber}`,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /versions] 创建版本失败:', error);
      return errorResponse('创建版本失败', 500);
    }

    return successResponse(version, '版本创建成功');
  } catch (error: any) {
    console.error('[POST /versions] 创建版本异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * GET /api/novels/[id]/versions - 获取版本列表
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
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: versions, error } = await client
      .from('novel_versions')
      .select('*')
      .eq('novel_id', novelId)
      .order('version_number', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /versions] 获取版本列表失败:', error);
      return errorResponse('获取版本列表失败', 500);
    }

    // 映射字段
    const mappedVersions = (versions || []).map((v: any) => ({
      ...v,
      novelId: v.novel_id,
      userId: v.user_id,
      versionNumber: v.version_number,
      changeSummary: v.change_summary,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    return successResponse(mappedVersions, '获取版本列表成功');
  } catch (error: any) {
    console.error('[GET /versions] 获取版本列表异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
