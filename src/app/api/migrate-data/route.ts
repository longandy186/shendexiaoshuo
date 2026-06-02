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
 * POST /api/migrate-data - 将localStorage中的小说数据迁移到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const { novels } = await request.json();

    if (!Array.isArray(novels)) {
      return errorResponse('数据格式错误：novels必须是数组');
    }

    const client = getSupabaseClient();

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const novel of novels) {
      try {
        // 检查小说是否已存在
        const { data: existingNovel } = await client
          .from('novels')
          .select('id')
          .eq('id', novel.id)
          .single();

        if (existingNovel) {
          skippedCount++;
          continue;
        }

        // 插入小说
        const { error: novelError } = await client
          .from('novels')
          .insert({
            id: novel.id,
            user_id: novel.userId || userId,
            title: novel.title,
            description: novel.description || '',
            genre: novel.genre || '',
            status: novel.status || 'draft',
            created_at: novel.createdAt,
            updated_at: novel.updatedAt,
          });

        if (novelError) throw novelError;

        // 插入角色
        if (novel.characters && Array.isArray(novel.characters)) {
          for (const character of novel.characters) {
            await client.from('characters').insert({
              id: character.id,
              novel_id: novel.id,
              user_id: userId,
              name: character.name,
              age: character.age || '',
              gender: character.gender || '',
              appearance: character.appearance || '',
              personality: character.personality || '',
              background: character.background || '',
              role: character.role || '',
              avatar: character.avatar || '',
              notes: character.notes || '',
              created_at: character.createdAt || new Date().toISOString(),
              updated_at: character.updatedAt || new Date().toISOString(),
            });
          }
        }

        // 插入章节
        if (novel.chapters && Array.isArray(novel.chapters)) {
          for (const chapter of novel.chapters) {
            await client.from('chapters').insert({
              id: chapter.id,
              novel_id: novel.id,
              user_id: userId,
              title: chapter.title,
              content: chapter.content || '',
              keywords: chapter.keywords || '',
              order_num: chapter.order || 0,
              version: chapter.version || 1,
              created_at: chapter.createdAt || new Date().toISOString(),
              updated_at: chapter.updatedAt || new Date().toISOString(),
            });
          }
        }

        // 插入世界观设定
        if (novel.worldSettings && Array.isArray(novel.worldSettings)) {
          for (const setting of novel.worldSettings) {
            await client.from('world_settings').insert({
              id: setting.id,
              novel_id: novel.id,
              user_id: userId,
              title: setting.title,
              category: setting.category || '',
              content: setting.content || '',
              created_at: setting.createdAt || new Date().toISOString(),
              updated_at: setting.updatedAt || new Date().toISOString(),
            });
          }
        }

        migratedCount++;
      } catch (error: any) {
        console.error(`迁移小说 ${novel.title} 失败:`, error);
        errors.push(`小说 "${novel.title}" 迁移失败: ${error.message}`);
      }
    }

    return successResponse({
      migrated: migratedCount,
      skipped: skippedCount,
      errors,
    }, `迁移完成：成功 ${migratedCount} 部，跳过 ${skippedCount} 部`);
  } catch (error: any) {
    console.error('数据迁移失败:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
