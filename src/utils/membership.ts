import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { AuthUser } from './auth';

export interface MembershipInfo {
  isPremium: boolean;
  premiumExpiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
}

/**
 * 获取用户会员信息
 */
export async function getUserMembership(userId: string): Promise<MembershipInfo> {
  try {
    const client = getSupabaseClient();

    const { data: user } = await client
      .from('users')
      .select('is_premium, premium_expires_at')
      .eq('id', userId)
      .single();

    if (!user) {
      return {
        isPremium: false,
        premiumExpiresAt: null,
        daysRemaining: 0,
        isExpired: true,
      };
    }

    const isPremium = user.is_premium || false;
    const premiumExpiresAt = user.premium_expires_at;

    let daysRemaining = 0;
    let isExpired = true;

    if (premiumExpiresAt) {
      const now = new Date();
      const expiresDate = new Date(premiumExpiresAt);
      const diffTime = expiresDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining <= 0;
    }

    return {
      isPremium: isPremium && !isExpired,
      premiumExpiresAt,
      daysRemaining,
      isExpired,
    };
  } catch (error) {
    console.error('获取会员信息失败:', error);
    return {
      isPremium: false,
      premiumExpiresAt: null,
      daysRemaining: 0,
      isExpired: true,
    };
  }
}

/**
 * 检查用户是否有会员权限
 */
export async function requireMembership(userId: string): Promise<boolean> {
  const membership = await getUserMembership(userId);
  return membership.isPremium;
}

/**
 * 获取会员状态文本
 */
export function getMembershipStatusText(membership: MembershipInfo): string {
  if (!membership.isPremium) {
    if (membership.daysRemaining > 0) {
      return `会员即将过期，剩余 ${membership.daysRemaining} 天`;
    }
    return '会员已过期，请续费';
  }

  if (membership.daysRemaining > 365) {
    const years = Math.floor(membership.daysRemaining / 365);
    return `${years} 年会员`;
  }

  if (membership.daysRemaining > 30) {
    const months = Math.floor(membership.daysRemaining / 30);
    return `${months} 个月会员`;
  }

  return `${membership.daysRemaining} 天会员`;
}

/**
 * 格式化剩余天数
 */
export function formatRemainingDays(days: number): string {
  if (days <= 0) return '已过期';
  if (days === 1) return '1天';
  if (days < 7) return `${days}天`;
  if (days < 30) return `${Math.floor(days / 7)}周`;
  if (days < 365) return `${Math.floor(days / 30)}个月`;
  return `${Math.floor(days / 365)}年`;
}
