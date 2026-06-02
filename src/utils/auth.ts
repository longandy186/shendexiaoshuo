import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// 超级管理员配置
export const SUPER_ADMIN_EMAIL = '13960104@qq.com'; // 账号342的邮箱
export const SUPER_ADMIN_USERNAME = '342';

/**
 * 检查用户是否为超级管理员
 * 超级管理员拥有所有最高级权限，没有任何限制
 */
export function isSuperAdminUser(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.email === SUPER_ADMIN_EMAIL || user.role === 'superadmin';
}

/**
 * 验证用户身份并返回完整用户信息
 * @param request 请求对象
 * @returns 包含 success 和 user 的对象
 */
export async function verifyAuth(request: NextRequest): Promise<{
  success: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
  } | null;
}> {
  try {
    // 从Cookie中获取Token
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return { success: false, user: null };
    }

    // 验证Token
    const payload = verifyToken(token);

    if (!payload) {
      return { success: false, user: null };
    }

    // 查询用户信息
    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from('users')
      .select('id, email, username, role, status')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      return { success: false, user: null };
    }

    // 检查账号状态
    if (user.status !== 'active') {
      return { success: false, user: null };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    console.error('验证用户身份失败:', error);
    return { success: false, user: null };
  }
}

/**
 * 从请求中获取当前用户信息
 * @returns 用户信息或null（未登录或Token无效）
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // 从Cookie中获取Token
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    // 验证Token
    const payload = verifyToken(token);

    if (!payload) {
      return null;
    }

    const user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    console.log('[getCurrentUser] Token中的角色:', payload.role);

    return user;
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 检查用户是否已登录
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser | null> {
  const user = await getCurrentUser(request);

  if (!user) {
    return null;
  }

  return user;
}

/**
 * 检查用户是否为管理员
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser | null> {
  const user = await getCurrentUser(request);

  console.log('[requireAdmin] getCurrentUser返回:', user ? '有用户' : '无用户');
  if (user) {
    console.log('[requireAdmin] 用户信息:', JSON.stringify(user));
    console.log('[requireAdmin] 用户角色:', user.role);
    console.log('[requireAdmin] 是否为admin:', user.role === 'admin');
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'admin') {
    console.log('[requireAdmin] 权限不足，角色不是admin');
    return null;
  }

  return user;
}

/**
 * 检查用户是否为超级管理员（342 / 13960104@qq.com）
 * 超级管理员拥有所有最高级权限，没有任何限制
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthUser | null> {
  const user = await getCurrentUser(request);

  if (!user) {
    return null;
  }

  if (!isSuperAdminUser(user)) {
    return null;
  }

  return user;
}

/**
 * 检查用户是否有权限访问指定资源
 * @param request 请求对象
 * @param resourceUserId 资源所属用户ID
 */
export async function checkResourceAccess(
  request: NextRequest,
  resourceUserId: string
): Promise<boolean> {
  const user = await getCurrentUser(request);

  if (!user) {
    return false;
  }

  // 超级管理员和管理员可以访问所有资源
  if (isSuperAdminUser(user) || user.role === 'admin') {
    return true;
  }

  // 普通用户只能访问自己的资源
  return user.userId === resourceUserId;
}
