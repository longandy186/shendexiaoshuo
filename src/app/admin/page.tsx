'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart,
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface AdminStats {
  users: {
    total: number;
    active: number;
    recentActive: number; // 48小时内登录的用户
    suspended: number;
    banned: number;
    premium: number;
    todayNew: number;
  };
  payments: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    paymentMethods: {
      wechat: number;
      alipay: number;
    };
  };
  referrals: {
    referredUsers: number;
    totalReferrers: number;
    totalReferralRewards: number;
  };
  novels: {
    total: number;
    published: number;
  };
  trends: {
    orders: Array<{ date: string; orders: number; revenue: number }>;
    users: Array<{ date: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 权限检查 - 只在 auth 完成后执行
  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        loadStats();
      }
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (data.code === 200 && data.data && data.data.stats) {
        setStats(data.data.stats);
      } else {
        setError(data.msg || '加载失败');
        toast.error(data.msg || '加载统计数据失败');
      }
    } catch (err) {
      setError('网络错误');
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950/30">
      {/* 顶部导航 */}
      <div className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  管理员仪表盘
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  数据统计与用户管理
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/users">
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  用户管理
                </Button>
              </Link>
              <Button onClick={loadStats} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                刷新数据
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 用户统计 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                总用户数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{stats.users.total}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    今日新增: {stats.users.todayNew}
                  </p>
                </div>
                <Users className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* 活跃用户 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                活跃用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">{stats.users.recentActive}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-blue-600">正常: {stats.users.active}</span>
                    <span className="mx-1">·</span>
                    <span className="text-green-600">48h内: {stats.users.recentActive}</span>
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* 会员用户 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                会员用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{stats.users.premium}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    占比 {((stats.users.premium / stats.users.total) * 100).toFixed(1)}%
                  </p>
                </div>
                <Award className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* 总收入 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                总收入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    ¥{stats.payments.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    本月: ¥{stats.payments.monthRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* 推荐用户 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                推荐用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {stats.referrals.referredUsers}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    总奖励: {stats.referrals.totalReferralRewards}天
                  </p>
                </div>
                <Gift className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细数据 */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">用户统计</TabsTrigger>
            <TabsTrigger value="payments">付费统计</TabsTrigger>
            <TabsTrigger value="referrals">推荐统计</TabsTrigger>
            <TabsTrigger value="trends">趋势分析</TabsTrigger>
          </TabsList>

          {/* 用户统计 */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">活跃用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.users.active}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">状态正常的用户</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">暂停用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.users.suspended}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">暂时暂停的用户</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">封禁用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.users.banned}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">永久封禁的用户</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>小说统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{stats.novels.total}</div>
                    <p className="text-sm text-gray-500">总小说数</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.novels.published}
                    </div>
                    <p className="text-sm text-gray-500">已发布</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 付费统计 */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">总订单数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.payments.totalOrders}</div>
                  <p className="text-sm text-gray-500 mt-2">所有订单</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">已支付</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.payments.paidOrders}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    成功支付订单
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">待支付</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.payments.pendingOrders}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">未支付订单</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>支付方式分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">微信</Badge>
                        <span className="text-sm">¥{stats.payments.paymentMethods.wechat.toFixed(2)}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {((stats.payments.paymentMethods.wechat / stats.payments.totalRevenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(stats.payments.paymentMethods.wechat / stats.payments.totalRevenue) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">支付宝</Badge>
                        <span className="text-sm">¥{stats.payments.paymentMethods.alipay.toFixed(2)}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {((stats.payments.paymentMethods.alipay / stats.payments.totalRevenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(stats.payments.paymentMethods.alipay / stats.payments.totalRevenue) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 推荐统计 */}
          <TabsContent value="referrals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">推荐用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.referrals.referredUsers}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">通过推荐注册的用户</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">推荐人</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.referrals.totalReferrers}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">邀请过他人的用户</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">奖励天数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.referrals.totalReferralRewards}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">总奖励天数</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">推荐奖励机制</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      每成功推荐1位好友注册并成为会员，推荐人和被推荐人各获得7天会员奖励。
                      奖励可累计叠加，有效提升用户活跃度。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 趋势分析 */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>最近7天趋势</CardTitle>
                <CardDescription>订单和用户注册数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 订单趋势 */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      订单趋势
                    </h4>
                    <div className="space-y-2">
                      {stats.trends.orders.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm">{item.date}</span>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{item.orders} 订单</Badge>
                            <span className="text-sm font-medium">
                              ¥{item.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 用户趋势 */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      用户注册趋势
                    </h4>
                    <div className="space-y-2">
                      {stats.trends.users.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm">{item.date}</span>
                          <Badge variant="outline">{item.count} 用户</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
