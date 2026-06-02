import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/utils/jwt';


/**
 * 按key对数组进行分组
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

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
 * GET /api/novels - 获取当前用户的所有小说
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    console.log('[GET /api/novels] 请求参数:', { userId });

    if (!userId) {
      console.log('[GET /api/novels] 用户未登录');
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 获取小说列表
    const { data: novels, error } = await client
      .from('novels')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    console.log('[GET /api/novels] 查询结果:', {
      userId,
      novelsCount: novels?.length || 0,
      error: error?.message
    });

    if (error) {
      console.error('获取小说列表失败:', error);
      return errorResponse('获取小说列表失败', 500);
    }

    // 使用批量查询获取所有小说的关联数据（修复N+1问题）
    const novelIds = novels.map(n => n.id);
    const [allCharacters, allChapters, allWorldSettings] = await Promise.all([
      client.from('characters').select('id,name,role,novel_id,created_at,updated_at,age,appearance,personality,background,avatar').in('novel_id', novelIds),
      client.from('chapters').select('id,title,order,status,novel_id,created_at,updated_at,content,word_count').in('novel_id', novelIds).order('order', { ascending: true }),
      client.from('world_settings').select('id,name,description,category,novel_id,created_at,updated_at,relationships').in('novel_id', novelIds),
    ]);

    // 按novel_id分组
    const charactersByNovel = groupBy(allCharacters.data || [], 'novel_id');
    const chaptersByNovel = groupBy(allChapters.data || [], 'novel_id');
    const settingsByNovel = groupBy(allWorldSettings.data || [], 'novel_id');

    // 组装数据
    const novelsWithDetails = novels.map(novel => {
      // 映射章节数据字段
      const mappedChapters = (chaptersByNovel[novel.id] || []).map((ch: any) => ({
        ...ch,
        novelId: ch.novel_id,
        createdAt: ch.created_at,
        updatedAt: ch.updated_at,
        // 添加前端需要的但数据库不存在的字段的默认值
        keywords: '',
        outline: '',
        status: 'draft' as const,
        version: 1,
      }));

      // 映射角色数据字段
      const mappedCharacters = (charactersByNovel[novel.id] || []).map((char: any) => ({
        ...char,
        novelId: char.novel_id,
        createdAt: char.created_at,
        updatedAt: char.updated_at,
      }));

      // 映射世界观设定数据字段
      const mappedWorldSettings = (settingsByNovel[novel.id] || []).map((ws: any) => ({
        ...ws,
        novelId: ws.novel_id,
        title: ws.name,  // 数据库使用 name，前端使用 title
        content: ws.description,  // 数据库使用 description，前端使用 content
        createdAt: ws.created_at,
        updatedAt: ws.updated_at,
      }));

      return {
        ...novel,
        novelId: novel.id,  // 添加 novelId 字段
        createdAt: novel.created_at,  // 映射 created_at
        updatedAt: novel.updated_at,  // 映射 updated_at
        userId: novel.user_id,  // 映射 user_id
        coverImage: novel.cover_image,  // 映射 cover_image
        characters: mappedCharacters,
        chapters: mappedChapters,
        worldSettings: mappedWorldSettings,
      };
    });

    console.log('[GET /api/novels] 返回小说列表:', {
      count: novelsWithDetails.length,
      titles: novelsWithDetails.map(n => n.title)
    });

    return successResponse(novelsWithDetails, '获取小说列表成功');
  } catch (error: any) {
    console.error('获取小说列表失败:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}

/**
 * POST /api/novels - 创建新小说
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    console.log('[POST /api/novels] 开始创建小说，userId:', userId);

    if (!userId) {
      console.log('[POST /api/novels] 用户未登录');
      return errorResponse('未登录', 401);
    }

    const { title, description, genre } = await request.json();

    console.log('[POST /api/novels] 请求数据:', { title, description, genre });

    if (!title) {
      console.log('[POST /api/novels] 标题为空');
      return errorResponse('标题不能为空');
    }

    const client = getSupabaseClient();

    // 生成小说ID
    const novelId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('[POST /api/novels] 准备插入数据库:', { novelId, userId, title });

    // 创建小说
    const { data: novel, error } = await client
      .from('novels')
      .insert({
        id: novelId,
        user_id: userId,
        title,
        description: description || '',
        genre: genre || '',
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/novels] 创建小说失败:', error);
      return errorResponse('创建小说失败', 500);
    }

    console.log('[POST /api/novels] 创建小说成功:', { novelId, title });

    // 返回小说数据（包含空的关联数据）
    return successResponse({
      ...novel,
      characters: [],
      chapters: [],
      worldSettings: [],
    }, '创建小说成功');
  } catch (error: any) {
    console.error('[POST /api/novels] 创建小说异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
