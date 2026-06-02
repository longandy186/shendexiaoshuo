import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

/**
 * 获取数据库连接凭证
 *
 * 使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量
 * 服务端也可使用 DATABASE_URL 和 DATABASE_KEY
 */
function getSupabaseCredentials(): SupabaseCredentials {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DATABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.DATABASE_KEY;

  if (!url) {
    throw new Error(
      'Supabase URL 未配置。请设置 NEXT_PUBLIC_SUPABASE_URL 或 DATABASE_URL 环境变量。'
    );
  }

  if (!anonKey) {
    throw new Error(
      'Supabase Anon Key 未配置。请设置 NEXT_PUBLIC_SUPABASE_ANON_KEY 或 DATABASE_KEY 环境变量。'
    );
  }

  return { url, anonKey };
}

// 单例缓存
let clientInstance: SupabaseClient | null = null;
let clientInstanceWithToken: Map<string, SupabaseClient> = new Map();

/**
 * 获取 Supabase 客户端实例（单例模式）
 *
 * @param token - 可选的 JWT token，用于认证
 * @returns SupabaseClient 实例
 */
function getSupabaseClient(token?: string): SupabaseClient {
  if (token) {
    // 带认证的客户端按 token 缓存
    let authClient = clientInstanceWithToken.get(token);
    if (!authClient) {
      const { url, anonKey } = getSupabaseCredentials();
      authClient = createClient(url, anonKey, {
        db: { timeout: 60000 },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
      clientInstanceWithToken.set(token, authClient);
    }
    return authClient;
  }

  // 无认证的客户端使用单例
  if (!clientInstance) {
    const { url, anonKey } = getSupabaseCredentials();
    clientInstance = createClient(url, anonKey, {
      db: { timeout: 60000 },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return clientInstance;
}

export { getSupabaseCredentials, getSupabaseClient };
