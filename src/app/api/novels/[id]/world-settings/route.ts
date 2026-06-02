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
 * POST /api/novels/[id]/world-settings - 创建世界观设定
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

    const setting = await request.json();
    console.log('[POST /world-settings] 接收到的设定数据:', setting);

    // 字段长度验证
    const title = setting.title || setting.name || '';
    const content = setting.content || setting.description || '';
    const category = setting.category || '其他';

    // name 字段最大长度 256 字符
    const MAX_NAME_LENGTH = 256;
    if (title.length > MAX_NAME_LENGTH) {
      console.warn('[POST /world-settings] title 超过长度限制:', {
        original: title,
        length: title.length,
        maxLength: MAX_NAME_LENGTH,
        truncated: title.substring(0, MAX_NAME_LENGTH)
      });
    }

    // 字段映射：title -> name, content -> description
    // 自动截断超长的 title，避免数据库插入失败
    const settingData = {
      novel_id: novelId,
      category: category,
      name: title.length > MAX_NAME_LENGTH ? title.substring(0, MAX_NAME_LENGTH) : title,
      description: content,
      relationships: setting.relationships || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[POST /world-settings] 准备插入到数据库:', settingData);

    const { data, error } = await client
      .from('world_settings')
      .insert(settingData)
      .select()
      .single();

    if (error) {
      console.error('[POST /world-settings] 数据库插入错误:', error);
      console.error('[POST /world-settings] 错误详情:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log('[POST /world-settings] 插入成功:', data);
    return successResponse(data, '添加世界观设定成功');
  } catch (error: any) {
    console.error('[POST /world-settings] 添加世界观设定失败:', error);
    console.error('[POST /world-settings] 错误堆栈:', error.stack);
    return errorResponse(`添加世界观设定失败: ${error.message}`, 500);
  }
}

/**
 * PUT /api/novels/[id]/world-settings - 更新世界观设定
 */
export async function PUT(
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

    const setting = await request.json();
    const settingId = setting.id;

    if (!settingId) {
      return errorResponse('缺少设定ID', 400);
    }

    // 字段长度验证
    const title = setting.title || setting.name || '';
    const content = setting.content || setting.description || '';
    const category = setting.category || '其他';

    // name 字段最大长度 256 字符
    const MAX_NAME_LENGTH = 256;
    if (title.length > MAX_NAME_LENGTH) {
      console.warn('[PUT /world-settings] title 超过长度限制:', {
        original: title,
        length: title.length,
        maxLength: MAX_NAME_LENGTH,
        truncated: title.substring(0, MAX_NAME_LENGTH)
      });
    }

    // 字段映射：title -> name, content -> description
    // 自动截断超长的 title，避免数据库插入失败
    const { data, error } = await client
      .from('world_settings')
      .update({
        category: category,
        name: title.length > MAX_NAME_LENGTH ? title.substring(0, MAX_NAME_LENGTH) : title,
        description: content,
        relationships: setting.relationships || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingId)
      .select()
      .single();

    if (error) throw error;
    return successResponse(data, '更新世界观设定成功');
  } catch (error: any) {
    console.error('更新世界观设定失败:', error);
    return errorResponse('更新世界观设定失败', 500);
  }
}

/**
 * DELETE /api/novels/[id]/world-settings - 删除世界观设定
 */
export async function DELETE(
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
    const settingId = searchParams.get('settingId');

    if (!settingId) {
      return errorResponse('缺少设定ID', 400);
    }

    const { data, error } = await client
      .from('world_settings')
      .delete()
      .eq('id', settingId)
      .select()
      .single();

    if (error) throw error;
    return successResponse({ deleted: true }, '删除世界观设定成功');
  } catch (error: any) {
    console.error('删除世界观设定失败:', error);
    return errorResponse('删除世界观设定失败', 500);
  }
}
