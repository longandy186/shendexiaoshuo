'use client';

import { useState, useEffect } from 'react';
import { checkCookies, checkCookieViaAPI } from '@/utils/cookie';

// 管理员配置 — 通过环境变量配置，生产环境可灵活修改
export const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '13960104@qq.com').split(',').map(s => s.trim());
export const SUPER_ADMIN_USERNAME = process.env.NEXT_PUBLIC_SUPER_ADMIN_USERNAME || '342';

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  isPremium: boolean;
  premiumExpiresAt: string;
}

/**
 * 快速检查是否已登录（同步）
 * 注意：由于使用HttpOnly Cookie，无法在客户端直接检查
 * 这个函数返回false，请使用getCurrentUserAsync异步检查
 * @deprecated 由于HttpOnly Cookie限制，此函数不再有效
 */
export function isQuickLoggedIn(): boolean {
  // HttpOnly Cookie 无法通过 document.cookie 访问
  // 始终返回false，强制使用 getCurrentUserAsync
  return false;
}

/**
 * 获取当前登录用户（同步版本，用于兼容旧代码）
 * 注意：此函数不再从localStorage读取，返回null表示未登录
 * 建议使用getCurrentUserAsync获取完整用户信息
 * @deprecated 使用 getCurrentUserAsync 代替
 */
export function getCurrentUser(): User | null {
  // 同步版本返回null，强制使用async版本
  if (typeof window === 'undefined') return null;
  return null;
}

/**
 * 获取当前登录用户（客户端异步版本）
 * 从HttpOnly Cookie中获取token，然后从API获取用户信息
 */
export async function getCurrentUserAsync(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  try {
    // 注意：HttpOnly Cookie 无法通过 document.cookie 访问
    // 直接调用API，由后端读取Cookie并验证

    // 从API获取用户信息
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      // 不设置 credentials，由浏览器的同源策略自动处理 Cookie
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    // 注意：/api/auth/me 返回的是 { data: { user: { ... } } }
    if (result.code === 200 && result.data && result.data.user) {
      return result.data.user;
    }

    return null;
  } catch (error) {
    console.error('[getCurrentUserAsync] 获取用户失败:', error);
    return null;
  }
}

/**
 * 保存用户信息到 sessionStorage（用于快速恢复）
 */
function saveUserToSession(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('cached_user', JSON.stringify(user));
    sessionStorage.setItem('cached_user_time', Date.now().toString());
  } catch (error) {
    console.error('[saveUserToSession] 保存失败:', error);
  }
}

/**
 * 从 sessionStorage 获取用户信息
 */
function getUserFromSession(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const cachedUser = sessionStorage.getItem('cached_user');
    const cachedTime = sessionStorage.getItem('cached_user_time');
    
    if (!cachedUser || !cachedTime) return null;
    
    // 检查缓存是否过期（5分钟）
    const age = Date.now() - parseInt(cachedTime);
    if (age > 5 * 60 * 1000) {
      sessionStorage.removeItem('cached_user');
      sessionStorage.removeItem('cached_user_time');
      return null;
    }
    
    return JSON.parse(cachedUser);
  } catch (error) {
    console.error('[getUserFromSession] 获取失败:', error);
    return null;
  }
}

/**
 * 清除缓存的用户信息
 */
function clearUserFromSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('cached_user');
    sessionStorage.removeItem('cached_user_time');
  } catch (error) {
    console.error('[clearUserFromSession] 清除失败:', error);
  }
}

/**
 * 清除用户信息（客户端）
 * 清除设备标识，Cookie会由后端清除
 */
export function clearUser(): void {
  if (typeof window === 'undefined') return;

  // 清除设备标识
  localStorage.removeItem('device_id');
  
  // 清除缓存的用户信息
  clearUserFromSession();
}

/**
 * 退出登录
 */
export async function logoutUser(): Promise<void> {
  try {
    // 清除本地数据（仅设备标识）
    clearUser();

    // 调用后端登出接口（清除Cookie）
    await fetch('/api/auth/logout', {
      method: 'POST',
    });

    // 触发认证状态变化事件
    triggerAuthChange();
  } catch (error) {
    console.error('登出失败:', error);
  }
}

/**
 * 自定义Hook：管理当前用户
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUserAsync();

        if (!isMounted) {
          return;
        }

        if (currentUser) {
          setUser(currentUser);
          saveUserToSession(currentUser);
          setLoading(false);
          setIsInitialized(true);
        } else {
          // 未登录，直接返回，不重试
          if (isMounted) {
            setLoading(false);
            setIsInitialized(true);
          }
        }
      } catch (error) {
        console.error('[useAuth] 获取用户失败:', error);
        if (isMounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // 先检查是否有缓存的用户信息
    const cachedUser = getUserFromSession();
    if (cachedUser && isMounted) {
      console.log('[useAuth] 从缓存加载用户信息:', cachedUser);
      setUser(cachedUser);
      setLoading(false);
      setIsInitialized(true);
      // 不验证缓存，直接使用
    } else {
      // 没有缓存，获取用户信息
      fetchCurrentUser();
    }

    // 监听自定义事件（当用户登录/登出时触发）
    const handleAuthChange = () => {
      clearUserFromSession();
      setLoading(true);
      setUser(null);
      setIsInitialized(false);
      // 立即获取，不延迟
      fetchCurrentUser();
    };

    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return { user, loading };
}

/**
 * 触发认证状态变化事件
 */
export function triggerAuthChange() {
  window.dispatchEvent(new CustomEvent('auth-change'));
}

/**
 * 检查用户是否为管理员（健壮版本）
 * 处理大小写、空值、类型转换等问题
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;

  // 标准化角色值
  const rawRole = user?.role || '';
  const normalizedRole = String(rawRole).trim().toLowerCase();

  // 支持多种管理员角色表示
  return ['admin', 'superadmin', 'administrator'].includes(normalizedRole);
}

/**
 * 检查用户是否为超级管理员（342 / 13960104@qq.com）
 * 超级管理员拥有所有最高级权限，没有任何限制
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return SUPER_ADMIN_EMAILS.includes(user.email) || user.role === 'superadmin';
}
