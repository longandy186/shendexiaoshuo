'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Send, Gift, Sparkles, BookOpen } from 'lucide-react';
import { triggerAuthChange, getCurrentUserAsync, type User as AuthUser } from '@/lib/auth';
import { extractReferralCode } from '@/utils/referral';
import { ReferralCodeHandler } from './ReferralCodeHandler';
import { getDeviceId } from '@/utils/device-id';

// 超级管理员邮箱列表
const SUPER_ADMIN_EMAILS = ['13960104@qq.com'];

function LoginPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deviceId, setDeviceId] = useState<string>('');

  // 登录表单
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');

  // 注册表单
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerReferralCode, setRegisterReferralCode] = useState('');

  // 初始化设备标识
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
  }, []);

  // 监听推荐码事件
  useEffect(() => {
    const handleReferralCode = ((event: CustomEvent) => {
      setRegisterReferralCode(event.detail.code);
    }) as EventListener;

    window.addEventListener('referral-code', handleReferralCode);

    return () => {
      window.removeEventListener('referral-code', handleReferralCode);
    };
  }, []);

  // 检查是否为超级管理员
  const isSuperAdminEmail = (email: string): boolean => {
    return SUPER_ADMIN_EMAILS.includes(email);
  };

  // 检查是否需要验证码
  const needsVerificationCode = (): boolean => {
    if (!loginEmail) return true;
    if (isSuperAdminEmail(loginEmail)) return false;
    // 普通用户需要验证码
    return true;
  };

  // 发送验证码
  const handleSendCode = async (email: string, type: 'login' | 'register') => {
    if (!email) {
      toast.error('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });

      const result = await response.json();

      if (result.code === 200) {
        toast.success(result.msg);

        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      toast.error('发送验证码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail) {
      toast.error('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    // 如果需要验证码但未提供
    if (needsVerificationCode() && !loginCode) {
      toast.error('请输入验证码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 确保接收和发送 Cookie
        body: JSON.stringify({ 
          email: loginEmail, 
          code: loginCode,
          deviceId: deviceId,
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        const { user, token } = result.data;

        console.log('[Login] 登录成功，用户信息:', user);

        toast.success('登录成功');

        // 等待一小段时间让 Cookie 生效
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log('[Login] 跳转到首页');
        // 直接跳转，不进行前端验证，让首页的 useAuth Hook 自己获取用户信息
        router.push('/');
      } else {
        console.error('[Login] 登录失败:', result.msg);
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('登录失败:', error);
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail || !registerCode || !registerUsername) {
      toast.error('请填写完整信息');
      return;
    }

    if (registerUsername.length < 2 || registerUsername.length > 20) {
      toast.error('用户名长度应在2-20个字符之间');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 确保接收和发送 Cookie
        body: JSON.stringify({
          email: registerEmail,
          code: registerCode,
          username: registerUsername,
          referralCode: registerReferralCode,
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        const { user, token } = result.data;

        console.log('[Register] 注册成功，用户信息:', user);

        toast.success('注册成功');

        // 等待Cookie设置完成并验证，增加重试机制
        let verifyUser = null;
        let retries = 0;
        const maxRetries = 10; // 最多重试10次
        const retryDelay = 500; // 每次重试间隔500ms

        while (retries < maxRetries && !verifyUser) {
          // 等待一段时间让Cookie生效
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          console.log(`[Register] 开始验证用户信息... (第${retries + 1}次)`);
          verifyUser = await getCurrentUserAsync();
          console.log('[Register] 验证结果:', verifyUser);

          retries++;
        }

        if (verifyUser) {
          console.log('[Register] 验证成功，跳转到首页');
          // 触发认证状态变化事件，通知首页更新
          triggerAuthChange();
          router.push('/');
        } else {
          console.error('[Register] 验证失败，已重试', maxRetries, '次');
          toast.error('登录状态验证失败，请手动刷新页面');
        }
      } else {
        console.error('[Register] 注册失败:', result.msg);
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('注册失败:', error);
      toast.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
      {/* 简洁的背景线条装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-200 to-transparent"></div>
        <div className="absolute top-20 left-0 w-0.5 h-40 bg-gradient-to-b from-transparent via-purple-100 to-transparent"></div>
        <div className="absolute top-40 right-20 w-0.5 h-60 bg-gradient-to-b from-transparent via-pink-100 to-transparent"></div>
        <div className="absolute bottom-20 left-20 w-60 h-0.5 bg-gradient-to-r from-transparent via-purple-100 to-transparent"></div>
        <div className="absolute bottom-40 right-40 w-80 h-0.5 bg-gradient-to-r from-transparent via-pink-100 to-transparent"></div>
      </div>

      {/* 小图标装饰 */}
      <div className="absolute top-16 right-16 opacity-20">
        <Sparkles className="w-12 h-12 text-purple-400" />
      </div>
      <div className="absolute bottom-16 left-16 opacity-20">
        <BookOpen className="w-10 h-10 text-pink-400" />
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-pink-200"></div>
      </div>
      <div className="absolute bottom-1/3 left-1/4 opacity-10">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-200 to-purple-200"></div>
      </div>

      {/* 主卡片 */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* 顶部装饰条 */}
        <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        
        <div className="p-8">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              神的小说工坊
            </h1>
            <p className="text-gray-500 text-sm">AI智能创作平台</p>
          </div>

          {/* Tab切换 */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all duration-200 text-sm"
              >
                登录
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all duration-200 text-sm"
              >
                注册
              </TabsTrigger>
            </TabsList>

            {/* 登录表单 */}
            <TabsContent value="login" className="space-y-4 animate-in fade-in-50 duration-300">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-gray-700 text-sm font-medium">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* 验证码输入框 */}
                {needsVerificationCode() && (
                  <div className="space-y-2">
                    <Label htmlFor="login-code" className="text-gray-700 text-sm font-medium">验证码</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="login-code"
                          type="text"
                          placeholder="请输入验证码"
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value)}
                          className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleSendCode(loginEmail, 'login')}
                        disabled={loading || countdown > 0 || !loginEmail}
                        className="shrink-0 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      >
                        {countdown > 0 ? (
                          <span className="text-sm w-16">{countdown}s</span>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">验证码5分钟内有效</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-sm hover:shadow transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      登录中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isSuperAdminEmail(loginEmail) ? '管理员登录' : '登录'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 注册表单 */}
            <TabsContent value="register" className="space-y-4 animate-in fade-in-50 duration-300">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-gray-700 text-sm font-medium">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-gray-700 text-sm font-medium">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="2-20个字符"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-code" className="text-gray-700 text-sm font-medium">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="register-code"
                        type="text"
                        placeholder="请输入验证码"
                        value={registerCode}
                        onChange={(e) => setRegisterCode(e.target.value)}
                        className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleSendCode(registerEmail, 'register')}
                      disabled={loading || countdown > 0 || !registerEmail}
                      className="shrink-0 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      {countdown > 0 ? (
                        <span className="text-sm w-16">{countdown}s</span>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">验证码5分钟内有效</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-referral-code" className="text-gray-700 text-sm font-medium">推荐码（可选）</Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="register-referral-code"
                      type="text"
                      placeholder="填写推荐码，双方各获7天会员"
                      value={registerReferralCode}
                      onChange={(e) => setRegisterReferralCode(e.target.value.toUpperCase())}
                      className="pl-10 border-gray-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                      maxLength={8}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {registerReferralCode ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        填写推荐码，注册成功后双方各获7天会员
                      </span>
                    ) : (
                      '填写好友推荐码，双方均可获得7天会员'
                    )}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-sm hover:shadow transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      注册中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      注册
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* 底部提示 */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              注册即表示同意 <Link href="/terms" className="text-purple-600 hover:text-purple-700 hover:underline">服务条款</Link> 和 <Link href="/privacy" className="text-purple-600 hover:text-purple-700 hover:underline">隐私政策</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 导出页面组件，使用 Suspense 包裹
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="text-center">加载中...</div>
      </div>
    }>
      <ReferralCodeHandler onReferralCode={(code) => {
        // 将推荐码传递给页面内容
        const event = new CustomEvent('referral-code', { detail: { code } });
        window.dispatchEvent(event);
      }} />
      <LoginPageContent />
    </Suspense>
  );
}
