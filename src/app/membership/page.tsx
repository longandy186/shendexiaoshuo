'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Check, ArrowLeft, Zap, RefreshCw, Share2, Copy } from 'lucide-react';
import { MEMBERSHIP_PLANS, PAYMENT_METHODS } from '@/config/payment';
import { useAuth } from '@/lib/auth';
import { generateReferralUrl } from '@/utils/referral';

export default function MembershipPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('quarter');
  const [selectedPayment, setSelectedPayment] = useState<string>('wechat');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [referralUrl, setReferralUrl] = useState<string>('');

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 获取会员信息
  useEffect(() => {
    const fetchMembership = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/membership/order');
        const result = await response.json();

        if (result.code === 200) {
          setUserMembership(result.data.userMembership);
          setReferralUrl(generateReferralUrl(result.data.userMembership.referralCode));
        }
      } catch (error) {
        console.error('获取会员信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMembership();
    } else {
      setLoading(false);
    }
  }, [user]);

  // 创建订单
  const handleCreateOrder = async () => {
    setCreatingOrder(true);
    try {
      const response = await fetch('/api/membership/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod: selectedPayment,
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        const { order, plan } = result.data;

        toast.success('订单创建成功');

        // 模拟支付流程（实际应该跳转到支付页面）
        setTimeout(async () => {
          await handleMockPayment(order.orderNo);
        }, 2000);
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      toast.error('创建订单失败');
    } finally {
      setCreatingOrder(false);
    }
  };

  // 模拟支付（测试用）
  const handleMockPayment = async (orderNo: string) => {
    try {
      toast.info('模拟支付中...');

      const response = await fetch(`/api/membership/orders/${orderNo}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.code === 200) {
        toast.success('支付成功！');
        setUserMembership(result.data.userMembership);
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('支付失败:', error);
      toast.error('支付失败');
    }
  };

  // 复制推荐链接
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('推荐链接已复制');
  };

  // 复制推荐码
  const handleCopyReferralCode = () => {
    if (userMembership?.referralCode) {
      navigator.clipboard.writeText(userMembership.referralCode);
      toast.success('推荐码已复制');
    }
  };

  // 计算剩余天数
  const getDaysRemaining = () => {
    if (!userMembership?.premiumExpiresAt) return 0;
    const now = new Date();
    const expires = new Date(userMembership.premiumExpiresAt);
    const diffTime = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = userMembership ? getDaysRemaining() : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              会员中心
            </h1>
            <p className="text-gray-600 mt-1">升级会员，解锁全部功能</p>
          </div>
        </div>

        {/* 会员状态卡片 */}
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-sm opacity-90">当前会员状态</div>
                  <div className="text-2xl font-bold">
                    {userMembership?.isPremium ? (
                      <>
                        {daysRemaining > 0 ? `${daysRemaining}天` : '已过期'}
                      </>
                    ) : (
                      '免费用户'
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">推荐奖励</div>
                <div className="text-2xl font-bold">{userMembership?.referralRewards || 0} 天</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 推荐链接 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-600" />
              推荐好友获赠会员
            </CardTitle>
            <CardDescription>
              邀请好友注册，双方各获得7天会员，可无限叠加
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 推荐码 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                你的推荐码
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 border rounded-lg bg-gray-50 font-mono text-lg font-bold text-purple-600 text-center">
                  {userMembership?.referralCode || '加载中...'}
                </div>
                <Button onClick={handleCopyReferralCode} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  复制推荐码
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                将推荐码分享给好友，好友注册时输入此推荐码即可
              </p>
            </div>

            {/* 推荐链接 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                推荐链接
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
                />
                <Button onClick={handleCopyReferral} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  复制链接
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                好友通过此链接注册，推荐码会自动填充
              </p>
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>使用方式：</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                <li>推荐码：好友注册时手动输入</li>
                <li>推荐链接：好友点击链接自动填充推荐码</li>
                <li>每个好友成功注册，你获得7天会员</li>
                <li>好友也能获得7天免费试用</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 会员套餐 */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">选择会员套餐</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MEMBERSHIP_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-600 shadow-lg scale-105'
                    : 'hover:border-purple-300'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.badge && (
                      <Badge className="bg-purple-600">{plan.badge}</Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      ¥{plan.price}
                      <span className="text-sm font-normal text-gray-500">
                        /{plan.duration === 30 ? '月' : plan.duration === 90 ? '季' : plan.duration === 180 ? '半年' : '年'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 line-through">
                      原价 ¥{plan.originalPrice}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 支付方式 */}
        <Card>
          <CardHeader>
            <CardTitle>选择支付方式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.values(PAYMENT_METHODS).map((method) => (
                <div
                  key={method.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPayment === method.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedPayment(method.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-medium">{method.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 确认按钮 */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          onClick={handleCreateOrder}
          disabled={creatingOrder}
        >
          {creatingOrder ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              立即开通
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
