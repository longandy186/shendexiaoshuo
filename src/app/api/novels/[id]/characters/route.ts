import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/utils/jwt';
import { getBasicFieldKeys } from '@/lib/character-template';

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
 * 将角色数据库字段转换为前端驼峰命名
 * Includes both basic columns and details JSONB
 */
function transformCharacterFields(char: any) {
  return {
    id: char.id,
    novelId: char.novel_id,
    name: char.name,
    age: char.age,
    appearance: char.appearance,
    personality: char.personality,
    background: char.background,
    role: char.role,
    avatar: char.avatar,
    details: char.details || {},
    createdAt: char.created_at,
    updatedAt: char.updated_at,
  };
}

/**
 * Split character data into basic columns and details JSONB
 */
function splitCharacterData(character: any) {
  const basicKeys = getBasicFieldKeys();
  const basic: Record<string, any> = {};
  const details: Record<string, any> = {};

  for (const [key, value] of Object.entries(character)) {
    if (key === 'id' || key === 'novelId') continue;
    if (basicKeys.includes(key)) {
      basic[key] = value;
    } else {
      details[key] = value;
    }
  }

  return { basic, details };
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

    const character = await request.json();
    console.log('[POST /characters] 接收到的角色数据:', character);

    // Split data into basic columns and details JSONB
    const { basic, details } = splitCharacterData(character);

    // 处理age字段：将字符串"未知"或其他非数字值转换为null
    let ageValue: number | null = null;
    if (basic.age !== null && basic.age !== undefined && basic.age !== '') {
      if (typeof basic.age === 'number') {
        ageValue = basic.age;
      } else if (typeof basic.age === 'string') {
        const num = parseInt(basic.age, 10);
        if (!isNaN(num)) {
          ageValue = num;
        } else {
          console.log('[POST /characters] 无法解析年龄值:', basic.age, '，设置为null');
          ageValue = null;
        }
      }
    }

    // 数据库会自动生成UUID，不需要传递id
    const characterData = {
      novel_id: novelId,
      name: basic.name || '',
      age: ageValue,
      appearance: basic.appearance || '',
      personality: basic.personality || '',
      background: basic.background || '',
      role: basic.role || '',
      avatar: basic.avatar || '',
      details: Object.keys(details).length > 0 ? details : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[POST /characters] 准备插入到数据库:', characterData);

    const { data, error } = await client
      .from('characters')
      .insert(characterData)
      .select()
      .single();

    if (error) {
      console.error('[POST /characters] 数据库插入错误:', error);
      console.error('[POST /characters] 错误详情:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log('[POST /characters] 插入成功:', data);
    return successResponse(transformCharacterFields(data), '添加角色成功');
  } catch (error: any) {
    console.error('[POST /characters] 添加角色失败:', error);
    console.error('[POST /characters] 错误堆栈:', error.stack);
    return errorResponse(`添加角色失败: ${error.message}`, 500);
  }
}

/**
 * PUT /api/novels/[id]/characters - 更新角色
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

    const character = await request.json();
    const characterId = character.id;

    if (!characterId) {
      return errorResponse('缺少角色ID', 400);
    }

    // Split data into basic columns and details JSONB
    const { basic, details } = splitCharacterData(character);

    // 处理age字段：将字符串"未知"或其他非数字值转换为null
    let ageValue: number | null = null;
    if (basic.age !== null && basic.age !== undefined && basic.age !== '') {
      if (typeof basic.age === 'number') {
        ageValue = basic.age;
      } else if (typeof basic.age === 'string') {
        const num = parseInt(basic.age, 10);
        if (!isNaN(num)) {
          ageValue = num;
        } else {
          console.log('[PUT /characters] 无法解析年龄值:', basic.age, '，设置为null');
          ageValue = null;
        }
      }
    }

    const { data, error } = await client
      .from('characters')
      .update({
        name: basic.name || '',
        age: ageValue,
        appearance: basic.appearance || '',
        personality: basic.personality || '',
        background: basic.background || '',
        role: basic.role || '',
        avatar: basic.avatar || '',
        details: Object.keys(details).length > 0 ? details : {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single();

    if (error) throw error;
    return successResponse(transformCharacterFields(data), '更新角色成功');
  } catch (error: any) {
    console.error('更新角色失败:', error);
    return errorResponse('更新角色失败', 500);
  }
}

/**
 * DELETE /api/novels/[id]/characters - 删除角色
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
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return errorResponse('缺少角色ID', 400);
    }

    const { data, error } = await client
      .from('characters')
      .delete()
      .eq('id', characterId)
      .select()
      .single();

    if (error) throw error;
    return successResponse({ deleted: true }, '删除角色成功');
  } catch (error: any) {
    console.error('删除角色失败:', error);
    return errorResponse('删除角色失败', 500);
  }
}
