'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Globe,
  Clock,
  TrendingUp,
  Plus,
  Edit,
  Eye,
  Download,
  Settings,
  FileText,
  PlayCircle,
  MessageSquare,
  Target,
  Zap,
  ArrowRight,
  Calendar,
  BarChart3,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getAllNovels, type Novel } from '@/lib/storage-adapter';
import { useAuth } from '@/lib/auth';
import { loadNovelsFromDatabase } from '@/lib/database-api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [recentNovels, setRecentNovels] = useState<Novel[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);

  // 认证检查
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadDashboardData();
    }
  }, [user, loading, router]);

  const loadDashboardData = async () => {
    try {
      const allNovels = await loadNovelsFromDatabase();
      setNovels(allNovels);

      // 最近编辑的小说（前4个）
      const recent = allNovels
        .filter((novel: Novel) => novel.updatedAt && !isNaN(new Date(novel.updatedAt).getTime()))
        .sort((a: Novel, b: Novel) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4);
      setRecentNovels(recent);

      // 统计数据
      const words = allNovels.reduce((sum: number, novel: Novel) => {
        return sum + (novel.chapters?.reduce((chapterSum: number, chapter: any) => {
          return chapterSum + chapter.content.length;
        }, 0) || 0);
      }, 0);

      const chapters = allNovels.reduce((sum: number, novel: Novel) => sum + (novel.chapters?.length || 0), 0);

      setTotalWords(words);
      setTotalChapters(chapters);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    // 检查日期字符串是否存在
    if (!dateString) {
      console.warn('[Dashboard] formatDate: 日期字符串为空');
      return '未知时间';
    }

    try {
      const date = new Date(dateString);

      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('[Dashboard] formatDate: 无效的日期格式:', dateString);
        return '未知时间';
      }

      const now = new Date();

      // 检查 now 是否有效
      if (isNaN(now.getTime())) {
        console.error('[Dashboard] formatDate: 当前时间无效');
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }

      const diff = now.getTime() - date.getTime();

      // 检查时间差是否有效
      if (isNaN(diff) || diff < 0) {
        console.warn('[Dashboard] formatDate: 时间差计算异常:', {
          dateString,
          date: date.toISOString(),
          now: now.toISOString(),
          diff,
        });
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (hours < 1) return '刚刚';
      if (hours < 24) return `${hours}小时前`;
      if (days < 7) return `${days}天前`;

      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      console.error('[Dashboard] formatDate: 格式化日期时出错:', {
        dateString,
        error: error instanceof Error ? error.message : String(error),
      });
      return '未知时间';
    }
  };

  const quickActions = [
    {
      title: '新建小说',
      description: '开始新的创作之旅',
      icon: BookOpen,
      href: '/novel/new',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: '继续创作',
      description: '继续编辑最近的作品',
      icon: Edit,
      href: '/novels',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'AI续写',
      description: '让AI助你完成章节',
      icon: Sparkles,
      href: '/novels',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const features = [
    {
      title: '智能续写',
      description: '多模型AI续写，支持风格自定义',
      icon: Zap,
      stats: '200+',
      statsLabel: '模型选择',
    },
    {
      title: '全文润色',
      description: '三级润色模式，提升文本质量',
      icon: Star,
      stats: '3种',
      statsLabel: '润色模式',
    },
    {
      title: '提示词库',
      description: '200+网文专属提示词模板',
      icon: MessageSquare,
      stats: '200+',
      statsLabel: '精品模板',
    },
    {
      title: '多版本对比',
      description: '保存3个版本，对比选择最佳内容',
      icon: Target,
      stats: '3个',
      statsLabel: '版本保存',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">神的小说工坊</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI智能创作助手</p>
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  仪表盘
                </Button>
              </Link>
              <Link href="/novels">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  我的小说
                </Button>
              </Link>
              <Link href="/prompts">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  提示词库
                </Button>
              </Link>
              <Link href="/tutorials">
                <Button variant="ghost" size="sm" className="gap-2">
                  <PlayCircle className="w-4 h-4" />
                  使用教程
                </Button>
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block">
                  {user?.username || '用户'}
                </span>
              </div>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  退出
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            欢迎回来，{user?.username || '创作者'}！
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            今天也是充满创造力的一天，继续你的写作之旅吧
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                小说数量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{novels.length}</div>
              <p className="text-xs text-blue-100 mt-1">正在创作的作品</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                章节总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalChapters}</div>
              <p className="text-xs text-purple-100 mt-1">累计创作章节</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                总字数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalWords.toLocaleString()}</div>
              <p className="text-xs text-pink-100 mt-1">累计创作字数</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                今日创作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {recentNovels.length > 0 ? formatDate(recentNovels[0].updatedAt) : '0'}
              </div>
              <p className="text-xs text-emerald-100 mt-1">最后编辑时间</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">快捷操作</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-500">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="group-hover:text-purple-600">
                        立即使用 <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Novels */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">最近编辑</h3>
            <Link href="/novels">
              <Button variant="ghost" size="sm" className="gap-2">
                查看全部 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentNovels.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    还没有小说作品
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    开始创作你的第一个作品吧！
                  </p>
                  <Link href="/novel/new">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      创建新小说
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              recentNovels.map((novel) => (
                <Link key={novel.id} href={`/novel/${novel.id}`}>
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-500">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{novel.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{novel.description || '暂无描述'}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {novel.genre}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {novel.chapters.length} 章节
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(novel.updatedAt)}
                          </span>
                        </div>
                        <Progress value={novel.chapters.length * 10} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Features Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI创作功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-purple-500 transition-all">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{feature.stats}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{feature.statsLabel}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
