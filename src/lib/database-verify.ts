/**
 * 数据库连接验证工具
 * 用于确保数据库连接正常，并验证数据一致性
 * 
 * 本项目所有持久化数据必须统一使用 DATABASE_URL 和 DATABASE_KEY
 */

import { getSupabaseClient, getSupabaseCredentials } from '@/storage/database/supabase-client';

export interface DatabaseVerificationResult {
  success: boolean;
  databaseUrl: string;
  tablesExist: boolean;
  tables: {
    users: boolean;
    novels: boolean;
    chapters: boolean;
    characters: boolean;
    world_settings: boolean;
    email_verifications: boolean;
    orders: boolean;
  };
  error?: string;
}

/**
 * 验证数据库连接和表结构
 */
export async function verifyDatabase(): Promise<DatabaseVerificationResult> {
  try {
    const credentials = getSupabaseCredentials();
    const client = getSupabaseClient();

    // 检查数据库连接
    const { count: userCount, error: connectionError } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (connectionError) {
      return {
        success: false,
        databaseUrl: credentials.url,
        tablesExist: false,
        tables: {
          users: false,
          novels: false,
          chapters: false,
          characters: false,
          world_settings: false,
          email_verifications: false,
          orders: false,
        },
        error: connectionError.message,
      };
    }

    // 检查所有必需的表是否存在
    const tables = {
      users: false,
      novels: false,
      chapters: false,
      characters: false,
      world_settings: false,
      email_verifications: false,
      orders: false,
    };

    // 并行检查所有表
    const tableChecks = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }),
      client.from('novels').select('*', { count: 'exact', head: true }),
      client.from('chapters').select('*', { count: 'exact', head: true }),
      client.from('characters').select('*', { count: 'exact', head: true }),
      client.from('world_settings').select('*', { count: 'exact', head: true }),
      client.from('email_verifications').select('*', { count: 'exact', head: true }),
      client.from('orders').select('*', { count: 'exact', head: true }),
    ]);

    tables.users = !tableChecks[0].error;
    tables.novels = !tableChecks[1].error;
    tables.chapters = !tableChecks[2].error;
    tables.characters = !tableChecks[3].error;
    tables.world_settings = !tableChecks[4].error;
    tables.email_verifications = !tableChecks[5].error;
    tables.orders = !tableChecks[6].error;

    const allTablesExist = Object.values(tables).every((exists) => exists);

    return {
      success: true,
      databaseUrl: credentials.url,
      tablesExist: allTablesExist,
      tables,
    };
  } catch (error: any) {
    return {
      success: false,
      databaseUrl: 'unknown',
      tablesExist: false,
      tables: {
        users: false,
        novels: false,
        chapters: false,
        characters: false,
        world_settings: false,
        email_verifications: false,
        orders: false,
      },
      error: error.message,
    };
  }
}

/**
 * 验证管理员用户是否存在
 */
export async function verifyAdminUser(): Promise<{ exists: boolean; email: string; role: string | null } | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('email, role')
      .eq('email', '13960104@qq.com')
      .single();

    if (error) {
      return null;
    }

    return {
      exists: !!data,
      email: data.email,
      role: data.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats() {
  try {
    const client = getSupabaseClient();

    const [users, novels, chapters, characters, worldSettings, orders] = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }),
      client.from('novels').select('*', { count: 'exact', head: true }),
      client.from('chapters').select('*', { count: 'exact', head: true }),
      client.from('characters').select('*', { count: 'exact', head: true }),
      client.from('world_settings').select('*', { count: 'exact', head: true }),
      client.from('orders').select('*', { count: 'exact', head: true }),
    ]);

    return {
      users: users.count || 0,
      novels: novels.count || 0,
      chapters: chapters.count || 0,
      characters: characters.count || 0,
      worldSettings: worldSettings.count || 0,
      orders: orders.count || 0,
    };
  } catch (error: any) {
    console.error('获取数据库统计信息失败:', error);
    return null;
  }
}

/**
 * 验证数据库配置
 * 确保 DATABASE_URL 和 DATABASE_KEY 已正确配置
 */
export async function verifyDatabaseConfig(): Promise<{
  configured: boolean;
  url: string | null;
  key: string | null;
  error?: string;
}> {
  try {
    const url = process.env.DATABASE_URL;
    const key = process.env.DATABASE_KEY;

    if (!url) {
      return {
        configured: false,
        url: null,
        key: null,
        error: 'DATABASE_URL environment variable is not set',
      };
    }

    if (!key) {
      return {
        configured: false,
        url: url,
        key: null,
        error: 'DATABASE_KEY environment variable is not set',
      };
    }

    return {
      configured: true,
      url: url,
      key: key,
    };
  } catch (error: any) {
    return {
      configured: false,
      url: null,
      key: null,
      error: error.message,
    };
  }
}
