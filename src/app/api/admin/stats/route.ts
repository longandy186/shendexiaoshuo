import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/utils/auth';

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
 * GET - 获取管理员统计数据（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 权限检查
    const adminUser = await requireAdmin(request);
    console.log('[Admin Stats API] requireAdmin返回:', adminUser ? '有用户' : '无用户');
    if (adminUser) {
      console.log('[Admin Stats API] 用户信息:', JSON.stringify(adminUser));
    }
    if (!adminUser) {
      return errorResponse('权限不足', 403);
    }

    const client = getSupabaseClient();

    // 定义今天和明天（用于多个统计）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ==================== 用户统计 ====================
    const { count: totalUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 48小时内登录的活跃用户
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const { count: recentActiveUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', fortyEightHoursAgo.toISOString());

    const { count: suspendedUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended');

    const { count: bannedUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'banned');

    // 会员用户统计
    const { count: premiumUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true)
      .gte('premium_expires_at', new Date().toISOString());

    // 今日新增用户
    const { count: todayNewUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    // ==================== 付费统计 ====================
    // 总订单数
    const { count: totalOrders } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // 已支付订单数
    const { count: paidOrders } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paid');

    // 待支付订单数
    const { count: pendingOrders } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 总收入
    const { data: totalRevenueData } = await client
      .from('orders')
      .select('amount')
      .eq('status', 'paid');

    const totalRevenue = totalRevenueData?.reduce((sum, order) => {
      const amount = parseFloat(order.amount || '0');
      return sum + amount;
    }, 0) || 0;

    // 今日收入
    const { data: todayRevenueData } = await client
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', today.toISOString())
      .lt('paid_at', tomorrow.toISOString());

    const todayRevenue = todayRevenueData?.reduce((sum, order) => {
      const amount = parseFloat(order.amount || '0');
      return sum + amount;
    }, 0) || 0;

    // 本月收入
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthRevenueData } = await client
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', monthStart.toISOString());

    const monthRevenue = monthRevenueData?.reduce((sum, order) => {
      const amount = parseFloat(order.amount || '0');
      return sum + amount;
    }, 0) || 0;

    // ==================== 支付方式统计 ====================
    const { data: wechatOrders } = await client
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .eq('payment_method', 'wechat');

    const wechatRevenue = wechatOrders?.reduce((sum, order) => {
      const amount = parseFloat(order.amount || '0');
      return sum + amount;
    }, 0) || 0;

    const { data: alipayOrders } = await client
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .eq('payment_method', 'alipay');

    const alipayRevenue = alipayOrders?.reduce((sum, order) => {
      const amount = parseFloat(order.amount || '0');
      return sum + amount;
    }, 0) || 0;

    // ==================== 推荐统计 ====================
    // 有推荐人的用户数
    const { count: referredUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);

    // 推荐人总数（去重）
    const { data: referrersData } = await client
      .from('users')
      .select('id, referral_rewards')
      .gt('referral_rewards', 0);

    const totalReferrers = referrersData?.length || 0;

    // 总推荐奖励天数
    const totalReferralRewards = referrersData?.reduce((sum, user) => {
      return sum + (user.referral_rewards || 0);
    }, 0) || 0;

    // ==================== 小说统计 ====================
    const { count: totalNovels } = await client
      .from('novels')
      .select('*', { count: 'exact', head: true });

    const { count: publishedNovels } = await client
      .from('novels')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // ==================== 趋势数据 ====================
    // 最近7天订单趋势
    const last7DaysOrders = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count: ordersCount, data: ordersData } = await client
        .from('orders')
        .select('amount', { count: 'exact', head: false })
        .eq('status', 'paid')
        .gte('paid_at', date.toISOString())
        .lt('paid_at', nextDate.toISOString());

      const revenue = ordersData?.reduce((sum, order) => {
        const amount = parseFloat(order.amount || '0');
        return sum + amount;
      }, 0) || 0;

      last7DaysOrders.push({
        date: date.toISOString().split('T')[0],
        orders: ordersCount || 0,
        revenue,
      });
    }

    // 最近7天注册用户趋势
    const last7DaysUsers = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count } = await client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      last7DaysUsers.push({
        date: date.toISOString().split('T')[0],
        count: count || 0,
      });
    }

    return successResponse({
      stats: {
        // 用户统计
        users: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          recentActive: recentActiveUsers || 0, // 48小时内登录的用户
          suspended: suspendedUsers || 0,
          banned: bannedUsers || 0,
          premium: premiumUsers || 0,
          todayNew: todayNewUsers || 0,
        },
        // 付费统计
        payments: {
          totalOrders: totalOrders || 0,
          paidOrders: paidOrders || 0,
          pendingOrders: pendingOrders || 0,
          totalRevenue,
          todayRevenue,
          monthRevenue,
          paymentMethods: {
            wechat: wechatRevenue,
            alipay: alipayRevenue,
          },
        },
        // 推荐统计
        referrals: {
          referredUsers: referredUsers || 0,
          totalReferrers,
          totalReferralRewards,
        },
        // 小说统计
        novels: {
          total: totalNovels || 0,
          published: publishedNovels || 0,
        },
        // 趋势数据
        trends: {
          orders: last7DaysOrders,
          users: last7DaysUsers,
        },
      },
    });
  } catch (error: any) {
    console.error('获取统计数据失败:', error);
    return errorResponse('服务器错误，请稍后重试', 500);
  }
}
