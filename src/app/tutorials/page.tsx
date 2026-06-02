'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlayCircle,
  BookOpen,
  ChevronRight,
  Search,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Video,
  FileText,
  Lightbulb,
  Zap,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';

// 教程类型
interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: string;
  tags: string[];
  content: string;
  steps: string[];
  isCompleted?: boolean;
}

// 教程数据
const tutorialsData: Tutorial[] = [
  {
    id: '1',
    title: '快速上手：5分钟创建你的第一部小说',
    description: '从零开始，快速了解平台功能并创建你的第一个小说项目',
    category: '入门',
    duration: '5分钟',
    level: '初级',
    tags: ['入门', '快速上手', '新手'],
    content: '本教程将带你快速了解平台的基本功能，包括创建小说、章节管理、AI续写等核心功能。',
    steps: [
      '登录平台后，点击"新建小说"按钮',
      '填写小说标题、简介、题材等基本信息',
      '创建第一个章节并开始写作',
      '使用AI续写功能辅助创作',
      '保存并管理你的作品',
    ],
  },
  {
    id: '2',
    title: 'AI续写功能详解：多模型选择与参数优化',
    description: '深入了解AI续写功能，掌握多模型切换和参数设置技巧',
    category: '核心功能',
    duration: '10分钟',
    level: '中级',
    tags: ['AI续写', '多模型', '参数设置'],
    content: '详细介绍AI续写功能的使用方法，包括如何选择合适的模型、设置续写字数、选择剧情走向等。',
    steps: [
      '了解不同AI模型的特点和适用场景',
      '选择合适的模型（豆包/千问/Kimi）',
      '设置续写字数（50-2000字）',
      '选择剧情走向和人称视角',
      '优化提示词获得更好的生成效果',
    ],
  },
  {
    id: '3',
    title: '智能润色：提升文本质量的三种模式',
    description: '学习使用智能润色功能，让你的文字更加流畅生动',
    category: '核心功能',
    duration: '8分钟',
    level: '中级',
    tags: ['智能润色', '文本优化', '三种模式'],
    content: '介绍三种润色模式的使用场景和技巧，帮助你快速提升文本质量。',
    steps: [
      '了解基础润色模式：修正语病、优化表达',
      '使用网文专属润色：增强对话张力、强化爽点',
      '尝试风格转换：适配不同平台风格',
      '设置润色边界，保留核心内容',
    ],
  },
  {
    id: '4',
    title: '多版本对比：保存和选择最佳AI生成内容',
    description: '掌握多版本功能，对比不同AI生成结果，选择最佳内容',
    category: '进阶技巧',
    duration: '6分钟',
    level: '高级',
    tags: ['多版本', '对比', '版本管理'],
    content: '详细介绍如何使用多版本功能，保存3个不同的AI生成结果，并对比选择最佳内容。',
    steps: [
      '使用不同模型生成多个版本',
      '查看每个版本的原文衔接点',
      '对比不同版本的内容和风格',
      '选择并应用最佳版本到章节',
      '删除不需要的版本',
    ],
  },
  {
    id: '5',
    title: '提示词库：200+模板助力高效创作',
    description: '充分利用提示词库，使用预设模板快速生成高质量内容',
    category: '效率提升',
    duration: '7分钟',
    level: '中级',
    tags: ['提示词库', '模板', '效率提升'],
    content: '介绍提示词库的使用方法，包括如何搜索、筛选、收藏和使用提示词模板。',
    steps: [
      '浏览提示词库的200+模板',
      '使用分类和标签筛选适合的模板',
      '收藏常用模板到"我的收藏"',
      '复制模板内容到AI生成',
      '根据需要自定义提示词',
    ],
  },
  {
    id: '6',
    title: 'AI提示词管理：自定义AI生成行为',
    description: '学习如何自定义和管理AI提示词，让AI生成更符合你的需求',
    category: '效率提升',
    duration: '10分钟',
    level: '高级',
    tags: ['AI提示词', '自定义', '模板管理'],
    content: '详细介绍AI提示词管理功能，包括如何编辑、重置和保存各种AI功能的提示词模板。',
    steps: [
      '进入"AI提示词管理"页面',
      '查看所有可自定义的AI功能提示词',
      '编辑System提示词和User提示词',
      '使用变量占位符实现动态提示词',
      '重置为默认值或保存自定义设置',
    ],
  },
  {
    id: '7',
    title: '智能扩写功能：丰富文章内容',
    description: '掌握智能扩写功能，将简短的内容扩展为详细的段落',
    category: '核心功能',
    duration: '6分钟',
    level: '中级',
    tags: ['智能扩写', '内容扩展', 'AI创作'],
    content: '介绍智能扩写功能的使用方法，帮助你快速将简短的描述扩展为丰富的内容。',
    steps: [
      '在编辑台中选中需要扩写的文本',
      '选择"智能扩写"功能',
      '设置扩写的详细程度和方向',
      '查看并选择满意的扩写结果',
      '将扩写内容整合到原文中',
    ],
  },
  {
    id: '8',
    title: '除AI痕迹：让AI生成更自然',
    description: '学习如何去除AI生成内容的机器感，让文字更像人工创作',
    category: '核心功能',
    duration: '7分钟',
    level: '中级',
    tags: ['除AI痕迹', '自然化', '文本优化'],
    content: '介绍除AI痕迹功能的使用技巧，让AI生成的内容更加自然、流畅，减少机械感。',
    steps: [
      '识别AI生成内容中的常见特征',
      '使用"除AI痕迹"功能处理文本',
      '调整处理强度保留关键信息',
      '多次迭代优化达到理想效果',
      '结合人工微调完善细节',
    ],
  },
  {
    id: '9',
    title: 'Word文档导入：快速导入已有作品',
    description: '学习如何导入Word文档，快速迁移你的作品到平台',
    category: '效率提升',
    duration: '5分钟',
    level: '初级',
    tags: ['Word导入', '文档迁移', '格式支持'],
    content: '介绍Word文档导入功能，支持 .doc 和 .docx 格式，帮助你快速迁移已有作品。',
    steps: [
      '准备需要导入的Word文档（.doc或.docx）',
      '在章节编辑页面点击"导入文档"按钮',
      '选择Word文档并上传',
      '等待系统自动解析文档内容',
      '检查并完善导入的内容',
    ],
  },
  {
    id: '10',
    title: '角色管理与世界观设定',
    description: '完善角色和世界观设定，为AI提供更丰富的上下文',
    category: '高级功能',
    duration: '12分钟',
    level: '高级',
    tags: ['角色管理', '世界观', '设定'],
    content: '学习如何创建和管理角色、设定世界观，让AI生成的内容更符合你的设定。',
    steps: [
      '创建角色档案：姓名、外貌、性格、背景',
      '设定角色关系和人物小传',
      '构建世界观：时代背景、地理环境、规则设定',
      '将设定传递给AI生成功能',
      '根据需要更新和完善设定',
    ],
  },
  {
    id: '11',
    title: '自动保存与版本回溯',
    description: '了解自动保存机制和版本回溯功能，确保内容安全',
    category: '基础设置',
    duration: '5分钟',
    level: '初级',
    tags: ['自动保存', '版本回溯', '数据安全'],
    content: '介绍平台的自动保存机制和版本管理功能，防止意外数据丢失。',
    steps: [
      '了解自动保存的频率和机制',
      '手动保存章节和作品',
      '查看版本历史',
      '回溯到历史版本',
      '创建独立备份',
    ],
  },
  {
    id: '12',
    title: '发布与导出：将作品分享给读者',
    description: '学习如何导出作品或直接发布到网文平台',
    category: '发布分享',
    duration: '8分钟',
    level: '中级',
    tags: ['导出', '发布', '分享'],
    content: '介绍作品的导出和发布功能，支持多种格式和平台对接。',
    steps: [
      '导出作品为Word、PDF等格式',
      '导出整本作品或指定章节',
      '对接主流网文平台发布',
      '设置发布信息和分类',
      '查看发布状态和数据',
    ],
  },
];

export default function TutorialsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());
  const [filteredTutorials, setFilteredTutorials] = useState<Tutorial[]>(tutorialsData);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadCompletedTutorials();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    filterTutorials();
  }, [searchTerm, selectedCategory]);

  const loadCompletedTutorials = () => {
    const saved = localStorage.getItem('completed_tutorials');
    if (saved) {
      setCompletedTutorials(new Set(JSON.parse(saved)));
    }
  };

  const markAsCompleted = (tutorialId: string) => {
    const newCompleted = new Set(completedTutorials);
    newCompleted.add(tutorialId);
    setCompletedTutorials(newCompleted);
    localStorage.setItem('completed_tutorials', JSON.stringify([...newCompleted]));
  };

  const filterTutorials = () => {
    let filtered = tutorialsData;

    if (searchTerm) {
      filtered = filtered.filter(
        (tutorial) =>
          tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tutorial.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tutorial.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((tutorial) => tutorial.category === selectedCategory);
    }

    setFilteredTutorials(filtered);
  };

  const categories = ['all', '入门', '核心功能', '进阶技巧', '效率提升', '高级功能', '基础设置', '发布分享'];

  const getLevelColor = (level: string) => {
    switch (level) {
      case '初级':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case '中级':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case '高级':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">使用教程</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">快速掌握平台功能</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                已完成 {completedTutorials.size}/{tutorialsData.length}
              </Badge>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block">
                  {user?.username || '用户'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="搜索教程..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-sm">
                  {cat === 'all' ? '全部' : cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Tutorial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                教程总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tutorialsData.length}</div>
              <p className="text-xs text-gray-500 mt-1">覆盖所有核心功能</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                学习时长
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {tutorialsData.reduce((sum, t) => sum + parseInt(t.duration), 0)} 分钟
              </div>
              <p className="text-xs text-gray-500 mt-1">快速掌握平台功能</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="w-4 h-4" />
                学习进度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round((completedTutorials.size / tutorialsData.length) * 100)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                已完成 {completedTutorials.size} 个教程
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tutorials Grid */}
        <div className="space-y-6">
          {filteredTutorials.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                没有找到匹配的教程
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                尝试调整搜索词或筛选条件
              </p>
            </div>
          ) : (
            filteredTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="border-2 hover:border-emerald-500 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{tutorial.category}</Badge>
                      <Badge className={getLevelColor(tutorial.level)}>{tutorial.level}</Badge>
                      {completedTutorials.has(tutorial.id) && (
                        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600">
                          <CheckCircle className="w-3 h-3" />
                          已完成
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">{tutorial.title}</CardTitle>
                  <CardDescription className="text-base">{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {tutorial.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        学习要点
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tutorial.content}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        学习步骤
                      </h4>
                      <ol className="space-y-1">
                        {tutorial.steps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!completedTutorials.has(tutorial.id) ? (
                        <Button
                          onClick={() => markAsCompleted(tutorial.id)}
                          className="flex-1 gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          标记为已完成
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1 gap-2" disabled>
                          <CheckCircle className="w-4 h-4" />
                          已完成
                        </Button>
                      )}
                      <Button variant="outline" className="gap-2">
                        <Video className="w-4 h-4" />
                        观看视频
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
