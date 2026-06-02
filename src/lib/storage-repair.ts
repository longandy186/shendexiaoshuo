/**
 * 数据库修复工具
 * 用于检测和修复 localStorage 数据问题
 */

export interface RepairResult {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  fixed: boolean;
  message: string;
}

export interface RepairReport {
  totalIssues: number;
  fixedIssues: number;
  issues: RepairResult[];
  timestamp: string;
}

/**
 * 检测 localStorage 是否可用
 */
export function checkLocalStorageAvailability(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage 不可用:', e);
    return false;
  }
}

/**
 * 修复用户数据
 */
export function repairUserData(): RepairResult {
  try {
    const userData = localStorage.getItem('ai_novel_user');
    
    if (!userData) {
      return {
        issue: '用户数据缺失',
        severity: 'high',
        fixed: false,
        message: '用户未登录或用户数据丢失，需要重新登录'
      };
    }

    const user = JSON.parse(userData);
    
    // 检查必要字段
    if (!user.id || !user.username || !user.createdAt) {
      // 尝试修复缺失字段
      if (!user.id) user.id = generateId();
      if (!user.createdAt) user.createdAt = new Date().toISOString();
      
      localStorage.setItem('ai_novel_user', JSON.stringify(user));
      
      return {
        issue: '用户数据字段缺失',
        severity: 'medium',
        fixed: true,
        message: '已修复用户数据缺失字段'
      };
    }

    return {
      issue: '用户数据',
      severity: 'low',
      fixed: true,
      message: '用户数据正常'
    };
  } catch (error: any) {
    return {
      issue: '用户数据损坏',
      severity: 'high',
      fixed: false,
      message: `无法解析用户数据: ${error.message}`
    };
  }
}

/**
 * 修复小说数据
 */
export function repairNovelData(): RepairResult {
  try {
    const novelsData = localStorage.getItem('ai_novels');
    
    if (!novelsData) {
      // 初始化空数组
      localStorage.setItem('ai_novels', JSON.stringify([]));
      return {
        issue: '小说数据为空',
        severity: 'medium',
        fixed: true,
        message: '已初始化小说数据存储'
      };
    }

    let novels: any[];
    try {
      novels = JSON.parse(novelsData);
    } catch (e) {
      // 数据损坏，尝试备份后初始化
      backupCorruptedData('ai_novels', novelsData);
      localStorage.setItem('ai_novels', JSON.stringify([]));
      return {
        issue: '小说数据损坏',
        severity: 'high',
        fixed: true,
        message: '已备份损坏数据并重新初始化'
      };
    }

    if (!Array.isArray(novels)) {
      // 数据格式错误
      backupCorruptedData('ai_novels', novelsData);
      localStorage.setItem('ai_novels', JSON.stringify([]));
      return {
        issue: '小说数据格式错误',
        severity: 'high',
        fixed: true,
        message: '已备份错误格式数据并重新初始化'
      };
    }

    // 检查并修复每部小说的字段
    let repairedCount = 0;
    const repairedNovels = novels.map((novel: any) => {
      let needsRepair = false;
      
      // 检查必要字段
      if (!novel.id) {
        novel.id = generateId();
        needsRepair = true;
      }
      if (!novel.createdAt) {
        novel.createdAt = new Date().toISOString();
        needsRepair = true;
      }
      if (!novel.updatedAt) {
        novel.updatedAt = new Date().toISOString();
        needsRepair = true;
      }
      if (!Array.isArray(novel.characters)) {
        novel.characters = [];
        needsRepair = true;
      }
      if (!Array.isArray(novel.chapters)) {
        novel.chapters = [];
        needsRepair = true;
      }
      if (!Array.isArray(novel.worldSettings)) {
        novel.worldSettings = [];
        needsRepair = true;
      }

      if (needsRepair) repairedCount++;
      return novel;
    });

    if (repairedCount > 0) {
      localStorage.setItem('ai_novels', JSON.stringify(repairedNovels));
      return {
        issue: '小说数据字段缺失',
        severity: 'medium',
        fixed: true,
        message: `已修复 ${repairedCount} 部小说的字段`
      };
    }

    return {
      issue: '小说数据',
      severity: 'low',
      fixed: true,
      message: '小说数据正常'
    };
  } catch (error: any) {
    return {
      issue: '小说数据修复失败',
      severity: 'high',
      fixed: false,
      message: `修复失败: ${error.message}`
    };
  }
}

/**
 * 修复备份数据
 */
export function repairBackupData(): RepairResult {
  try {
    const backups = localStorage.getItem('ai_novels_backups');
    
    if (!backups) {
      localStorage.setItem('ai_novels_backups', JSON.stringify([]));
      return {
        issue: '备份数据为空',
        severity: 'low',
        fixed: true,
        message: '已初始化备份数据存储'
      };
    }

    try {
      const backupArray = JSON.parse(backups);
      if (!Array.isArray(backupArray)) {
        localStorage.setItem('ai_novels_backups', JSON.stringify([]));
        return {
          issue: '备份数据格式错误',
          severity: 'medium',
          fixed: true,
          message: '已修复备份数据格式'
        };
      }
    } catch (e) {
      localStorage.setItem('ai_novels_backups', JSON.stringify([]));
      return {
        issue: '备份数据损坏',
        severity: 'medium',
        fixed: true,
        message: '已重新初始化备份数据'
      };
    }

    return {
      issue: '备份数据',
      severity: 'low',
      fixed: true,
      message: '备份数据正常'
    };
  } catch (error: any) {
    return {
      issue: '备份数据修复失败',
      severity: 'high',
      fixed: false,
      message: `修复失败: ${error.message}`
    };
  }
}

/**
 * 备份损坏的数据
 */
function backupCorruptedData(key: string, data: string): void {
  const timestamp = new Date().toISOString();
  const backupKey = `corrupted_${key}_${timestamp}`;
  
  try {
    localStorage.setItem(backupKey, data);
    console.log(`已备份损坏数据到: ${backupKey}`);
  } catch (e) {
    console.error('备份数据失败:', e);
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 清理过期的备份数据
 */
export function cleanOldBackups(daysToKeep: number = 7): RepairResult {
  try {
    const backupsKey = 'ai_novels_backups';
    const backups = JSON.parse(localStorage.getItem(backupsKey) || '[]');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const validBackups = backups.filter((backup: any) => {
      const backupDate = new Date(backup.timestamp);
      return backupDate >= cutoffDate;
    });
    
    const removedCount = backups.length - validBackups.length;
    localStorage.setItem(backupsKey, JSON.stringify(validBackups));
    
    if (removedCount > 0) {
      return {
        issue: '清理过期备份',
        severity: 'low',
        fixed: true,
        message: `已清理 ${removedCount} 个过期备份`
      };
    }
    
    return {
      issue: '清理过期备份',
      severity: 'low',
      fixed: true,
      message: '无需清理，所有备份都在有效期内'
    };
  } catch (error: any) {
    return {
      issue: '清理备份失败',
      severity: 'medium',
      fixed: false,
      message: `清理失败: ${error.message}`
    };
  }
}

/**
 * 运行所有修复
 */
export function runAllRepairs(): RepairReport {
  const results: RepairResult[] = [];
  
  // 检查 localStorage 可用性
  if (!checkLocalStorageAvailability()) {
    return {
      totalIssues: 1,
      fixedIssues: 0,
      issues: [{
        issue: 'localStorage 不可用',
        severity: 'high',
        fixed: false,
        message: '浏览器不支持或禁用了 localStorage，请检查浏览器设置'
      }],
      timestamp: new Date().toISOString()
    };
  }
  
  // 运行各项修复
  results.push(repairUserData());
  results.push(repairNovelData());
  results.push(repairBackupData());
  results.push(cleanOldBackups());
  
  return {
    totalIssues: results.length,
    fixedIssues: results.filter(r => r.fixed).length,
    issues: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * 导出所有数据
 */
export function exportAllData(): string {
  const data = {
    user: localStorage.getItem('ai_novel_user'),
    novels: localStorage.getItem('ai_novels'),
    backups: localStorage.getItem('ai_novels_backups'),
    metadata: localStorage.getItem('ai_novels_metadata'),
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * 导入数据
 */
export function importData(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    
    // 验证数据格式
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        message: '数据格式错误'
      };
    }
    
    // 导入各项数据
    if (data.user) localStorage.setItem('ai_novel_user', data.user);
    if (data.novels) localStorage.setItem('ai_novels', data.novels);
    if (data.backups) localStorage.setItem('ai_novels_backups', data.backups);
    if (data.metadata) localStorage.setItem('ai_novels_metadata', data.metadata);
    
    return {
      success: true,
      message: '数据导入成功'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `导入失败: ${error.message}`
    };
  }
}

/**
 * 清空所有数据
 */
export function clearAllData(): { success: boolean; message: string } {
  try {
    localStorage.removeItem('ai_novel_user');
    localStorage.removeItem('ai_novels');
    localStorage.removeItem('ai_novels_backups');
    localStorage.removeItem('ai_novels_metadata');
    
    return {
      success: true,
      message: '所有数据已清空'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `清空失败: ${error.message}`
    };
  }
}
