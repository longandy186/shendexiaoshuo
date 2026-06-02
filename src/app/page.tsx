'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, BookOpen, Film, FileText, BarChart3, MessageSquare, Database, LayoutGrid, CheckCircle, ChevronDown, ChevronRight, Play, Pause, RefreshCw, ArrowRight, Zap, Shield, Users, Star, LogOut, Settings, Crown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth, logoutUser, isAdmin, type User } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolling, setIsScrolling] = useState(false);
  const [demoContent, setDemoContent] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [animateNumbers, setAnimateNumbers] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');

  // 首页始终显示，不强制登录检测
  // 用户点击"体验"或"开始创作"按钮时才跳转到登录页

  // 从URL中提取推荐码
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        setReferralCode(ref);
        // 保存推荐码到localStorage，防止用户刷新页面后丢失
        localStorage.setItem('temp_referral_code', ref);
      }
    }
  }, []);

  // 滚动效果
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(window.scrollY > 50);

      // 检测各个区域是否可见
      const sections = ['banner', 'workstations', 'stats', 'features', 'reviews', 'faq'];
      sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            setActiveSection(section);
            if (section === 'stats') {
              setAnimateNumbers(true);
            }
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 处理跳转到登录/注册页面
  const handleNavigateToLogin = () => {
    if (referralCode) {
      // 如果有推荐码，带上推荐码跳转到登录页面
      router.push(`/login?ref=${referralCode}`);
    } else {
      // 否则直接跳转到登录页面
      router.push('/login');
    }
  };

  // AI续写Demo
  const demoText = `龙傲天睁开眼，发现自己重生了。
"这是哪里？"他环顾四周，发现周围是一片陌生的森林。
记忆如潮水般涌入，他想起前世在修仙界叱咤风云的日子，想起被挚友背叛的那一剑，想起最后陨落的瞬间。
"既然上天给我重来的机会，这一世，我必将踏上巅峰！"`;

  const runDemo = async () => {
    setIsPlaying(true);
    const continuation = `\n\n就在这时，一道灵光从天而降，落在龙傲天面前。
光芒散去，显现出一枚古朴的玉简，上面刻着"天罡诀"三个字。
龙傲天心中一震，这难道是传说中的上古功法？
他小心翼翼地捡起玉简，一股庞大的信息瞬间涌入脑海。
"天罡诀，分九重，修至大成，可撕裂虚空，纵横九天！"
龙傲天的眼中闪过一丝坚定，从此，他的传奇之路正式开始...`;
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < continuation.length) {
        setDemoContent(prev => prev + continuation[i]);
        i++;
      } else {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 50);

    return () => clearInterval(interval);
  };

  const stats = [
    { value: 2000, label: '日均活跃作者', suffix: '+' },
    { value: 2, label: '累计创作字数', suffix: '亿+' },
    { value: 200, label: '提示词模板', suffix: '+' },
    { value: 98, label: '用户好评率', suffix: '%' },
  ];

  const workstations = [
    {
      icon: BookOpen,
      title: 'AI小说工作台',
      description: '从灵感捕捉到成稿输出，全程AI辅助，轻松完成小说创作',
      features: ['AI续写', '智能润色', '大纲生成', '人物设定'],
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const coreFeatures = [
    {
      icon: Sparkles,
      title: 'AI续写',
      description: '基于上下文智能续写，保持人物性格、世界观一致',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
    },
    {
      icon: Zap,
      title: '智能润色',
      description: '一键优化文案表达、节奏、对话张力，支持多风格切换',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    },
    {
      icon: LayoutGrid,
      title: '分镜生成',
      description: '自动生成漫剧分镜，支持多种风格、画面比例',
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    },
    {
      icon: Database,
      title: '知识库校验',
      description: '管理创作设定，实时校验一致性，避免OOC、设定穿帮',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
    },
    {
      icon: FileText,
      title: '提示词模板',
      description: '200+精选提示词模板，覆盖多种创作场景，一键引用',
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300',
    },
    {
      icon: Shield,
      title: '数据安全',
      description: '加密传输、私密存储，创作内容仅创建者可见',
      color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
    },
  ];

  const reviews = [
    {
      content: '用神的小说工坊写的玄幻小说，AI续写的章节质量很高，完全看不出是AI写的！',
      author: '网文作者小王',
    },
    {
      content: '分镜生成功能太强大了，原本需要一周的漫剧制作，现在一天就完成了！',
      author: '漫剧制作人小李',
    },
    {
      content: '知识库校验帮我避免了很多设定冲突，剧情连贯性提升了很多！',
      author: '小说作家小张',
    },
  ];

  const faqs = [
    {
      question: 'AI续写的内容会侵犯版权吗？',
      answer: '不会。AI续写的内容基于您提供的上下文生成，版权归您所有。我们使用经过训练的AI模型，确保生成内容的原创性。',
    },
    {
      question: '支持哪些AI模型？',
      answer: '支持10+主流AI模型，包括豆包、DeepSeek、Kimi、GPT等。您可以根据需求自由切换，每种模型都有不同的特色和优势。',
    },
    {
      question: '字数额度有限制吗？',
      answer: '没有限制。我们的平台提供无限次AI续写和润色，您可以尽情创作，无需担心字数额度问题。',
    },
    {
      question: '数据安全有保障吗？',
      answer: '绝对安全。我们采用加密传输和存储技术，您的创作内容仅您本人可见。支持项目共享功能，生成专属链接和密码，安全可控。',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 首页不需要等待 loading 状态，直接显示内容 */}
      {/* 只有导航栏等依赖 user 的部分在 user 加载后显示 */}
      <>
      {/* 1. 顶部导航栏 */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolling ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm shadow-sm border-b border-gray-100 dark:border-gray-800' : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50'
      }`}>
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                神的小说工坊
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/novels"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    router.push('/login');
                  }
                }}
                className="text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium"
              >
                <BookOpen className="h-3.5 w-3.5" />
                我的小说
              </Link>
              <Link
                href="/prompts"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    router.push('/login');
                  }
                }}
                className="text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                提示词库
              </Link>
              <Link
                href="/prompts-manager"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    router.push('/login');
                  }
                }}
                className="text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium"
              >
                <Settings className="h-3.5 w-3.5" />
                AI 提示词管理
              </Link>
              <Link
                href="/dashboard"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    router.push('/login');
                  }
                }}
                className="text-xs text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                仪表盘
              </Link>
              {isAdmin(user) && (
                <Link
                  href="/admin"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 font-medium border border-purple-200 dark:border-purple-800"
                >
                  <Shield className="h-3.5 w-3.5" />
                  管理员控制台
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2 mr-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      欢迎, {user.username}
                    </span>
                  </div>
                  <Link href="/membership">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-purple-50 dark:hover:bg-purple-950/20" title="会员中心">
                      <Crown className="h-4 w-4 text-yellow-600" />
                    </Button>
                  </Link>
                  <Link href="/data-management">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-purple-50 dark:hover:bg-purple-950/20" title="数据管理">
                      <Database className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                    onClick={() => {
                      logoutUser();
                      router.push('/login');
                    }}
                    title="登出"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button
                onClick={() => {
                  if (user) {
                    router.push('/dashboard');
                  } else {
                    handleNavigateToLogin();
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-xs px-4 py-2 h-8 font-medium"
              >
                {user ? '开始创作' : '立即体验'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. 首屏Banner区 */}
      <section id="banner" className="relative min-h-screen pt-20 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
        {/* 推荐提示栏 */}
        {referralCode && !user && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center gap-2">
                <Crown className="h-5 w-5" />
                <span className="text-sm font-medium">
                  您正在通过推荐链接访问，注册后可获得7天免费会员！
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 h-8"
                  onClick={() => {
                    localStorage.removeItem('temp_referral_code');
                    setReferralCode('');
                  }}
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* 左侧文字区 */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                  AI智能创作
                  <br />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    一站式平台
                  </span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  从灵感捕捉到成稿输出，全程AI辅助，轻松完成小说、漫剧、剧本创作
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>10+ AI模型</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>专业提示词库</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>一键生成</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (user) {
                      router.push('/dashboard');
                    } else {
                      handleNavigateToLogin();
                    }
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 py-6"
                >
                  开始创作
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* 右侧编辑器Demo */}
            <Card className="shadow-2xl">
              <CardHeader className="border-b bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">AI续写演示</CardTitle>
                  <Badge variant="outline">龙傲天重生记</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Textarea
                  value={demoText + demoContent}
                  readOnly
                  className="min-h-[300px] font-mono text-sm leading-relaxed resize-none"
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {isPlaying && (
                      <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                        AI续写中...
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={runDemo}
                    disabled={isPlaying}
                    className="gap-2"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        开始续写
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. 三大工作台区 */}
      <section id="workstations" className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI小说创作工作台
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              从灵感捕捉到成稿输出，全程AI辅助，轻松完成小说创作
            </p>
          </div>

          <div className="grid md:grid-cols-1 gap-8 max-w-2xl mx-auto">
            {workstations.map((ws, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${ws.color} flex items-center justify-center mb-4`}>
                    <ws.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{ws.title}</CardTitle>
                  <CardDescription className="text-base">{ws.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ws.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => {
                      if (user) {
                        router.push('/dashboard');
                      } else {
                        handleNavigateToLogin();
                      }
                    }}
                    className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    开始创作
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3.5 快速入口区 */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              快速入口
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              快速访问核心功能，提升创作效率
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/dashboard">
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-purple-500 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">仪表盘</CardTitle>
                  <CardDescription className="text-base">
                    查看创作统计、快速访问作品、管理创作进度
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      小说数量统计
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      章节总字数
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      最近编辑作品
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    进入仪表盘 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/prompts">
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-pink-500 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">提示词库</CardTitle>
                  <CardDescription className="text-base">
                    200+ 精品提示词模板，覆盖多种创作场景
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      8个分类模板
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      3大平台风格
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      收藏和搜索
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700">
                    查看提示词库 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tutorials">
              <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-emerald-500 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">使用教程</CardTitle>
                  <CardDescription className="text-base">
                    详细教程指引，快速掌握平台核心功能
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      8个详细教程
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      分步骤指导
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      学习进度追踪
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                    查看教程 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 数据展示区 */}
      <section id="stats" className="py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 核心功能区 */}
      <section id="features" className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              7大核心功能
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              全面覆盖创作需求，让AI成为你的最佳创作伙伴
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 用户评价区 */}
      <section id="reviews" className="py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              用户评价
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              来自真实用户的使用反馈
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((review, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">"{review.content}"</p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    — {review.author}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. 常见问题区 */}
      <section id="faq" className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              常见问题
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              快速了解平台功能和使用方法
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <Collapsible
                key={index}
                open={activeFaq === faq.question}
                onOpenChange={(open) => setActiveFaq(open ? faq.question : null)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 text-left"
                  >
                    <span className="text-lg font-semibold">{faq.question}</span>
                    {activeFaq === faq.question ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </section>

      {/* 8. 底部转化区 */}
      <footer className="py-20 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            开始你的AI创作之旅
          </h2>
          <p className="text-xl mb-8 opacity-90">
            立即注册，免费体验强大的AI创作功能
          </p>
          <Link href={user ? "/select-project" : "/login"}>
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-6"
            >
              立即体验
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <div className="mt-16 pt-8 border-t border-white/20">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
              <a 
                href="mailto:longandy@163.com" 
                className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <Mail className="h-4 w-4" />
                longandy@163.com
              </a>
            </div>
            <p className="text-sm opacity-70">
              © 2024 神的小说工坊. All rights reserved. | 隐私政策 | 使用条款
            </p>
          </div>
        </div>
      </footer>
      </>
    </div>
  );
}
