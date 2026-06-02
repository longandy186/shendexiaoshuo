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
 * GET /api/novels/[id]/characters/[characterId]/versions
 * List all versions for a character (ordered by created_at desc)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, characterId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权查看此角色', 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: versions, error } = await client
      .from('character_versions')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /character-versions] 获取版本列表失败:', error);
      return errorResponse('获取版本列表失败', 500);
    }

    // Map fields to camelCase
    const mappedVersions = (versions || []).map((v: any) => ({
      id: v.id,
      characterId: v.character_id,
      novelId: v.novel_id,
      userId: v.user_id,
      versionNumber: v.version_number,
      characterData: v.character_data,
      changeSummary: v.change_summary,
      createdAt: v.created_at,
    }));

    return successResponse(mappedVersions, '获取版本列表成功');
  } catch (error: any) {
    console.error('[GET /character-versions] 获取版本列表异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * POST /api/novels/[id]/characters/[characterId]/versions
 * Create a new version snapshot (saves current character data as a version)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, characterId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权操作此角色', 403);
    }

    const body = await request.json();
    const { characterData, changeSummary } = body;

    if (!characterData) {
      return errorResponse('角色数据不能为空');
    }

    // Get current max version number
    const { data: lastVersion } = await client
      .from('character_versions')
      .select('version_number')
      .eq('character_id', characterId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (lastVersion?.version_number || 0) + 1;

    // Generate version ID
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Clean up old versions (keep only last 30)
    const { data: oldVersions } = await client
      .from('character_versions')
      .select('id')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .range(30, 100);

    if (oldVersions && oldVersions.length > 0) {
      const oldVersionIds = oldVersions.map((v: any) => v.id);
      await client
        .from('character_versions')
        .delete()
        .in('id', oldVersionIds);
    }

    // Create version
    const { data: version, error } = await client
      .from('character_versions')
      .insert({
        id: versionId,
        character_id: characterId,
        novel_id: novelId,
        user_id: userId,
        version_number: newVersionNumber,
        character_data: characterData,
        change_summary: changeSummary || `版本 ${newVersionNumber}`,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /character-versions] 创建版本失败:', error);
      return errorResponse('创建版本失败', 500);
    }

    return successResponse({
      id: version.id,
      characterId: version.character_id,
      novelId: version.novel_id,
      versionNumber: version.version_number,
      changeSummary: version.change_summary,
      createdAt: version.created_at,
    }, '版本创建成功');
  } catch (error: any) {
    console.error('[POST /character-versions] 创建版本异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
