'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  Save,
  RotateCcw,
  Code,
  FileText,
  Globe,
  PenTool,
  Settings,
  ChevronRight,
  CheckCircle2,
  Lock,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import {
  getPromptTemplates,
  getPromptTemplate,
  savePromptTemplate,
  resetPromptTemplate,
  deletePromptTemplate,
  type PromptTemplate,
} from '@/lib/prompt-manager';
import { showSaveSuccess, showInfo, showError } from '@/lib/toast-utils';

export default function PromptsManagerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    systemPrompt: '',
    userPrompt: '',
  });

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      checkAndLoad();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const checkAndLoad = async () => {
    setLoading(true);
    try {
      // 获取用户完整信息
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const fullUserData = data.data;
        setUserData(fullUserData);
      }
      
      loadTemplates();
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = () => {
    setTemplates(getPromptTemplates());
  };

  const openEditDialog = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    const updatedTemplate: PromptTemplate = {
      ...selectedTemplate,
      systemPrompt: formData.systemPrompt,
      userPrompt: formData.userPrompt,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    savePromptTemplate(updatedTemplate);
    loadTemplates();
    setIsEditDialogOpen(false);
    showSaveSuccess(`提示词 "${selectedTemplate.name}" 已保存`);
  };

  const handleReset = () => {
    if (!selectedTemplate) return;

    resetPromptTemplate(selectedTemplate.id);
    const defaultTemplate = getPromptTemplate(selectedTemplate.id);
    if (defaultTemplate) {
      setFormData({
        systemPrompt: defaultTemplate.systemPrompt,
        userPrompt: defaultTemplate.userPrompt,
      });
    }
    loadTemplates();
    showInfo(`已重置为默认值`);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'document-parse': <FileText className="h-4 w-4" />,
      'character': <Settings className="h-4 w-4" />,
      'world': <Globe className="h-4 w-4" />,
      'writing': <PenTool className="h-4 w-4" />,
      'general': <MessageSquare className="h-4 w-4" />,
      'polish': <PenTool className="h-4 w-4" />,
      'outline': <FileText className="h-4 w-4" />,
      'chapter': <MessageSquare className="h-4 w-4" />,
      'plot': <Globe className="h-4 w-4" />,
      'cool-opener': <Settings className="h-4 w-4" />,
      'expand': <PenTool className="h-4 w-4" />,
      'remove-ai-trace': <Settings className="h-4 w-4" />,
    };
    return icons[category] || <MessageSquare className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'document-parse': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'character': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'world': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'writing': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'general': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      'polish': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'outline': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'chapter': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'plot': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'cool-opener': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'expand': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'remove-ai-trace': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[category] || colors['general'];
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'document-parse': '文档解析',
      'character': '角色相关',
      'world': '世界观',
      'writing': '写作辅助',
      'general': '通用',
      'polish': '全文润色',
      'outline': '生成大纲',
      'chapter': '生成章节',
      'plot': '剧情建议',
      'cool-opener': '爽文开篇',
      'expand': '智能扩写',
      'remove-ai-trace': '除AI痕迹',
    };
    return names[category] || '通用';
  };

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
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  AI 提示词管理
                </h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    自定义和管理 AI 功能的提示词
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <Link href="/prompts" className="text-blue-600 dark:text-blue-400 hover:underline">
                    写作提示词库 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          )}

          {/* 会员权益提示 */}
          {!loading && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      💡 季度及以上会员可享受更优质的AI功能体验，包括更多AI模型选择和AI打分功能
                    </p>
                  </div>
                  <Link href="/membership">
                    <Button variant="outline" size="sm" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900">
                      了解更多
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示说明 */}
          {!loading && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Code className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">什么是提示词？</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      提示词是告诉 AI 如何处理任务的指令。自定义提示词可以优化 AI 的输出效果，使其更符合您的需求。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示词列表 */}
          {!loading && (
            <div className="grid gap-4">
              <h2 className="text-lg font-semibold">可用提示词</h2>
              {templates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isCustom && (
                          <Badge variant="secondary" className="text-xs">
                            自定义
                          </Badge>
                        )}
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryIcon(template.category)}
                          <span className="ml-1">{getCategoryName(template.category)}</span>
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                    >
                      <ChevronRight className="h-4 w-4" />
                      编辑
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <DialogTitle className="text-xl">
                  {selectedTemplate?.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedTemplate?.description}
                </DialogDescription>
              </div>
              {selectedTemplate?.isCustom && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重置为默认
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              <Tabs defaultValue="system" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="system">System 提示词</TabsTrigger>
                  <TabsTrigger value="user">User 提示词</TabsTrigger>
                </TabsList>
                <TabsContent value="system" className="space-y-2">
                  <Label>
                    System 提示词（AI 的角色设定）
                    <p className="text-xs text-muted-foreground mt-1">
                      定义 AI 的身份、专业能力和行为准则
                    </p>
                  </Label>
                  <Textarea
                    value={formData.systemPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, systemPrompt: e.target.value })
                    }
                    placeholder="输入 System 提示词..."
                    className="min-h-[400px] font-mono text-xs"
                  />
                </TabsContent>
                <TabsContent value="user" className="space-y-2">
                  <Label>
                    User 提示词（任务指令）
                    <p className="text-xs text-muted-foreground mt-1">
                      告诉 AI 要执行什么任务，如何处理数据
                    </p>
                  </Label>
                  <Textarea
                    value={formData.userPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, userPrompt: e.target.value })
                    }
                    placeholder="输入 User 提示词..."
                    className="min-h-[600px] font-mono text-xs"
                  />
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>💡 提示：</strong>可以使用变量占位符，如{'{documentContent}'}，
                      系统会自动替换为实际内容。
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 px-6 pt-4 pb-6 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
