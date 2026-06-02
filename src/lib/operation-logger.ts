import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface LogOptions {
  userId: string;
  userName: string;
  novelId?: string;
  operationType: 'create' | 'update' | 'delete' | 'publish' | 'restore' | 'export' | 'import';
  operationContent: any;
  operationResult: 'success' | 'failure' | 'partial';
  ipAddress?: string;
}

/**
 * 记录操作日志
 */
export async function logOperation(options: LogOptions): Promise<void> {
  try {
    const client = getSupabaseClient();
    
    const logId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 脱敏处理
    const sanitizedContent = sanitizeSensitiveData(options.operationContent);

    await client.from('operation_logs').insert({
      id: logId,
      user_id: options.userId,
      user_name: options.userName,
      novel_id: options.novelId || null,
      operation_type: options.operationType,
      operation_content: sanitizedContent,
      operation_result: options.operationResult,
      ip_address: options.ipAddress || null,
    });

    console.log('[OperationLogger] 操作日志记录成功:', options.operationType);
  } catch (error) {
    console.error('[OperationLogger] 记录操作日志失败:', error);
    // 日志记录失败不影响主流程
  }
}

/**
 * 脱敏处理敏感数据
 */
function sanitizeSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    const value = data[key];

    // 脱敏敏感字段
    if (key.toLowerCase().includes('api') && 
        (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'))) {
      // 只显示后4位
      if (typeof value === 'string' && value.length > 4) {
        sanitized[key] = '****' + value.slice(-4);
      } else {
        sanitized[key] = '****';
      }
    } else if (key.toLowerCase().includes('password')) {
      sanitized[key] = '****';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 记录小说创建操作
 */
export async function logNovelCreation(userId: string, userName: string, novelId: string, novelTitle: string, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'create',
    operationContent: {
      entityType: 'novel',
      novelId,
      novelTitle,
    },
    operationResult: result,
  });
}

/**
 * 记录小说更新操作
 */
export async function logNovelUpdate(userId: string, userName: string, novelId: string, changes: any, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'update',
    operationContent: {
      entityType: 'novel',
      novelId,
      changes,
    },
    operationResult: result,
  });
}

/**
 * 记录章节创建操作
 */
export async function logChapterCreation(userId: string, userName: string, novelId: string, chapterId: string, chapterTitle: string, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'create',
    operationContent: {
      entityType: 'chapter',
      chapterId,
      chapterTitle,
    },
    operationResult: result,
  });
}

/**
 * 记录章节更新操作
 */
export async function logChapterUpdate(userId: string, userName: string, novelId: string, chapterId: string, changes: any, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'update',
    operationContent: {
      entityType: 'chapter',
      chapterId,
      changes,
    },
    operationResult: result,
  });
}

/**
 * 记录章节删除操作
 */
export async function logChapterDeletion(userId: string, userName: string, novelId: string, chapterId: string, chapterTitle: string, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'delete',
    operationContent: {
      entityType: 'chapter',
      chapterId,
      chapterTitle,
    },
    operationResult: result,
  });
}

/**
 * 记录版本恢复操作
 */
export async function logVersionRestore(userId: string, userName: string, novelId: string, fromVersion: number, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'restore',
    operationContent: {
      entityType: 'version',
      fromVersion,
    },
    operationResult: result,
  });
}

/**
 * 记录导出操作
 */
export async function logExport(userId: string, userName: string, novelId: string, format: 'txt' | 'docx', result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'export',
    operationContent: {
      format,
    },
    operationResult: result,
  });
}

/**
 * 记录导入操作
 */
export async function logImport(userId: string, userName: string, novelId: string, format: string, result: 'success' | 'failure'): Promise<void> {
  await logOperation({
    userId,
    userName,
    novelId,
    operationType: 'import',
    operationContent: {
      format,
    },
    operationResult: result,
  });
}
