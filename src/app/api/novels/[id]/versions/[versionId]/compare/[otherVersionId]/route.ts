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
 * 对比两个版本的内容
 */
function compareVersions(version1: any, version2: any) {
  const content1 = version1.content || {};
  const content2 = version2.content || {};

  const changes: any[] = [];

  // 对比角色
  const chars1 = content1.characters || [];
  const chars2 = content2.characters || [];
  
  chars2.forEach((char2: any) => {
    const char1 = chars1.find((c: any) => c.id === char2.id);
    if (!char1) {
      changes.push({
        type: 'added',
        entityType: 'character',
        entityName: char2.name,
        entityId: char2.id,
        details: '新增角色',
      });
    } else {
      // 检查是否有变化
      const fields = ['name', 'age', 'appearance', 'personality', 'background', 'role'];
      const changedFields = fields.filter((field) => char1[field] !== char2[field]);
      
      if (changedFields.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'character',
          entityName: char2.name,
          entityId: char2.id,
          details: `修改字段: ${changedFields.join(', ')}`,
          changes: changedFields.map((field) => ({
            field,
            oldValue: char1[field],
            newValue: char2[field],
          })),
        });
      }
    }
  });

  chars1.forEach((char1: any) => {
    const char2 = chars2.find((c: any) => c.id === char1.id);
    if (!char2) {
      changes.push({
        type: 'deleted',
        entityType: 'character',
        entityName: char1.name,
        entityId: char1.id,
        details: '删除角色',
      });
    }
  });

  // 对比章节
  const chapters1 = content1.chapters || [];
  const chapters2 = content2.chapters || [];

  chapters2.forEach((ch2: any) => {
    const ch1 = chapters1.find((c: any) => c.id === ch2.id);
    if (!ch1) {
      changes.push({
        type: 'added',
        entityType: 'chapter',
        entityName: ch2.title,
        entityId: ch2.id,
        details: '新增章节',
      });
    } else {
      // 检查是否有变化
      const fields = ['title', 'content', 'order'];
      const changedFields = fields.filter((field) => ch1[field] !== ch2[field]);

      if (changedFields.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'chapter',
          entityName: ch2.title,
          entityId: ch2.id,
          details: `修改字段: ${changedFields.join(', ')}`,
          changes: changedFields.map((field) => ({
            field,
            oldValue: ch1[field],
            newValue: ch2[field],
          })),
        });
      }
    }
  });

  chapters1.forEach((ch1: any) => {
    const ch2 = chapters2.find((c: any) => c.id === ch1.id);
    if (!ch2) {
      changes.push({
        type: 'deleted',
        entityType: 'chapter',
        entityName: ch1.title,
        entityId: ch1.id,
        details: '删除章节',
      });
    }
  });

  // 对比世界观设定
  const settings1 = content1.worldSettings || [];
  const settings2 = content2.worldSettings || [];

  settings2.forEach((ws2: any) => {
    const ws1 = settings1.find((s: any) => s.id === ws2.id);
    if (!ws1) {
      changes.push({
        type: 'added',
        entityType: 'worldSetting',
        entityName: ws2.title,
        entityId: ws2.id,
        details: '新增世界观设定',
      });
    } else {
      // 检查是否有变化
      const fields = ['category', 'title', 'content', 'relationships'];
      const changedFields = fields.filter((field) => ws1[field] !== ws2[field]);

      if (changedFields.length > 0) {
        changes.push({
          type: 'modified',
          entityType: 'worldSetting',
          entityName: ws2.title,
          entityId: ws2.id,
          details: `修改字段: ${changedFields.join(', ')}`,
          changes: changedFields.map((field) => ({
            field,
            oldValue: ws1[field],
            newValue: ws2[field],
          })),
        });
      }
    }
  });

  settings1.forEach((ws1: any) => {
    const ws2 = settings2.find((s: any) => s.id === ws1.id);
    if (!ws2) {
      changes.push({
        type: 'deleted',
        entityType: 'worldSetting',
        entityName: ws1.title,
        entityId: ws1.id,
        details: '删除世界观设定',
      });
    }
  });

  return {
    version1: {
      id: version1.id,
      versionNumber: version1.version_number,
      createdAt: version1.created_at,
      changeSummary: version1.change_summary,
    },
    version2: {
      id: version2.id,
      versionNumber: version2.version_number,
      createdAt: version2.created_at,
      changeSummary: version2.change_summary,
    },
    changes,
    statistics: {
      added: changes.filter((c) => c.type === 'added').length,
      modified: changes.filter((c) => c.type === 'modified').length,
      deleted: changes.filter((c) => c.type === 'deleted').length,
    },
  };
}

/**
 * GET /api/novels/[id]/versions/[versionId]/compare/[otherVersionId] - 对比版本
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string; otherVersionId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();
    const { id: novelId, versionId, otherVersionId } = await params;

    // 验证小说归属权
    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) {
      return errorResponse('无权查看此小说', 403);
    }

    // 获取两个版本的内容
    const [version1, version2] = await Promise.all([
      client
        .from('novel_versions')
        .select('*')
        .eq('id', versionId)
        .eq('novel_id', novelId)
        .single(),
      client
        .from('novel_versions')
        .select('*')
        .eq('id', otherVersionId)
        .eq('novel_id', novelId)
        .single(),
    ]);

    if (!version1.data || !version2.data) {
      return errorResponse('版本不存在', 404);
    }

    // 对比版本
    const comparison = compareVersions(version1.data, version2.data);

    return successResponse(comparison, '版本对比成功');
  } catch (error: any) {
    console.error('[GET /versions/compare] 对比版本异常:', error);
    return errorResponse('服务器错误: ' + error.message, 500);
  }
}
