'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Palette,
  Download,
  Heart,
  Copy,
  Eye,
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getLanguageStyles,
  addLanguageStyle,
  updateLanguageStyle,
  deleteLanguageStyle,
  exportLanguageStyles,
  getLanguageStylesFromDB,
  saveLanguageStyleToDB,
  deleteLanguageStyleFromDB,
  type LanguageStyle,
} from '@/lib/prompt-library';
import { showSaveSuccess, showInfo } from '@/lib/toast-utils';
import { useAuth } from '@/lib/auth';

export default function PromptsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [styles, setStyles] = useState<LanguageStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<LanguageStyle | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    tags: '',
    prompt: '',
  });
  const [importJson, setImportJson] = useState('');

  // 加载提示词列表
  useEffect(() => {
    loadStyles();
    loadFavorites();
  }, [user]);

  const loadStyles = async () => {
    setIsLoading(true);
    try {
      const data = await getLanguageStylesFromDB(user?.id);
      setStyles(data);
    } catch (error) {
      console.error('加载提示词失败:', error);
      // 降级到 localStorage
      setStyles(getLanguageStyles());
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('prompt-favorites');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  };

  // 过滤提示词
  const filteredStyles = styles.filter(
    (style) =>
      style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 切换收藏
  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    saveFavorites(newFavorites);
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    setFavorites(newFavorites);
    localStorage.setItem('prompt-favorites', JSON.stringify(Array.from(newFavorites)));
  };

  // 复制提示词
  const copyPrompt = (style: LanguageStyle) => {
    navigator.clipboard.writeText(style.prompt);
    showInfo('提示词已复制到剪贴板！');
    
    // 增加使用次数
    const updatedStyles = styles.map(s => 
      s.id === style.id ? { ...s, usage: s.usage + 1 } : s
    );
    setStyles(updatedStyles);
    localStorage.setItem('languageStyles', JSON.stringify(updatedStyles));
  };

  // 打开详情
  const openDetail = (style: LanguageStyle) => {
    setSelectedStyle(style);
    setFormData({
      name: style.name,
      description: style.description,
      keywords: style.keywords.join(', '),
      tags: style.tags?.join(', ') || '',
      prompt: style.prompt,
    });
    setIsDetailDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedStyle) return;

    if (!formData.name.trim() || !formData.prompt.trim()) {
      showInfo('请填写名称和提示词内容');
      return;
    }

    const keywordsArray = formData.keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
    const tagsArray = formData.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    // 更新提示词
    const updatedStyle = {
      ...selectedStyle,
      name: formData.name.trim(),
      description: formData.description.trim(),
      keywords: keywordsArray,
      tags: tagsArray,
      prompt: formData.prompt.trim(),
    };

    try {
      // 如果是自定义提示词（ID以custom开头），则保存到数据库
      if (selectedStyle.id.startsWith('custom-')) {
        await saveLanguageStyleToDB(updatedStyle, user?.id);
      } else {
        // 系统提示词暂时保存到 localStorage
        const updatedStyles = styles.map(s => 
          s.id === selectedStyle.id ? updatedStyle : s
        );
        setStyles(updatedStyles);
        localStorage.setItem('languageStyles', JSON.stringify(updatedStyles));
      }
      
      // 重新加载
      await loadStyles();
      setIsDetailDialogOpen(false);
      setSelectedStyle(null);
      showSaveSuccess('提示词已保存');
    } catch (error) {
      console.error('保存失败:', error);
      showInfo('保存失败，请重试');
    }
  };

  // 保存新建
  const handleSaveCreate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      showInfo('请填写名称和提示词内容');
      return;
    }

    const keywordsArray = formData.keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
    const tagsArray = formData.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const newStyle: LanguageStyle = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      keywords: keywordsArray,
      tags: tagsArray,
      prompt: formData.prompt.trim(),
      usage: 0,
    };

    try {
      await saveLanguageStyleToDB(newStyle, user?.id);
      await loadStyles();
      setIsCreateDialogOpen(false);
      resetForm();
      showSaveSuccess('提示词已创建');
    } catch (error) {
      console.error('创建失败:', error);
      showInfo('创建失败，请重试');
    }
  };

  // 删除提示词
  const handleDelete = async () => {
    if (!selectedStyle) return;
    if (window.confirm('确定要删除这个提示词吗？')) {
      try {
        // 如果是自定义提示词（ID以custom开头），则从数据库删除
        if (selectedStyle.id.startsWith('custom-')) {
          await deleteLanguageStyleFromDB(selectedStyle.id, user?.id);
        } else {
          // 系统提示词暂时从 localStorage 删除
          const updatedStyles = styles.filter(s => s.id !== selectedStyle.id);
          setStyles(updatedStyles);
          localStorage.setItem('languageStyles', JSON.stringify(updatedStyles));
        }
        
        // 重新加载
        await loadStyles();
        setIsDetailDialogOpen(false);
        setSelectedStyle(null);
        showSaveSuccess('提示词已删除');
      } catch (error) {
        console.error('删除失败:', error);
        showInfo('删除失败，请重试');
      }
    }
  };

  // 导出全部
  const handleExportAll = () => {
    const json = JSON.stringify(styles, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-library-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入（去重）
  const handleImport = () => {
    if (!importJson.trim()) {
      showInfo('请粘贴提示词库 JSON 数据');
      return;
    }

    try {
      const importStyles = JSON.parse(importJson) as LanguageStyle[];
      
      if (!Array.isArray(importStyles)) {
        showInfo('格式不正确，必须是数组');
        return;
      }

      // 获取现有的所有 ID
      const existingIds = new Set(styles.map(s => s.id));
      
      // 过滤掉已存在的，只导入新的
      const newStyles = importStyles.filter(s => !existingIds.has(s.id));
      
      if (newStyles.length === 0) {
        showInfo('所有提示词都已存在，无需导入');
        return;
      }

      // 添加新的提示词
      const allStyles = [...styles, ...newStyles];
      setStyles(allStyles);
      localStorage.setItem('languageStyles', JSON.stringify(allStyles));
      
      setImportJson('');
      setIsImportDialogOpen(false);
      
      showSaveSuccess(`成功导入 ${newStyles.length} 个新提示词`);
    } catch (error) {
      showInfo('JSON 解析失败，请检查格式');
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      keywords: '',
      tags: '',
      prompt: '',
    });
  };

  // 迁移数据
  const handleMigration = async () => {
    if (!user) {
      showInfo('请先登录');
      return;
    }

    if (window.confirm('确定要将 localStorage 中的提示词迁移到数据库吗？迁移后数据将存储在云端，可在不同设备间同步。')) {
      try {
        const response = await fetch('/api/migration/prompts', {
          method: 'POST',
        });

        const result = await response.json();

        if (result.code === 200) {
          showSaveSuccess(result.msg || '迁移成功');
          // 重新加载提示词
          await loadStyles();
        } else {
          showInfo(result.msg || '迁移失败');
        }
      } catch (error) {
        console.error('迁移失败:', error);
        showInfo('迁移失败，请重试');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950/30">
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
                  <Palette className="h-6 w-6 text-purple-600" />
                  提示词库
                </h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {styles.length}+ 精品提示词模板
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <Link href="/prompts-manager" className="text-purple-600 dark:text-purple-400 hover:underline">
                    AI提示词管理 →
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleMigration}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                迁移数据
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                导入
              </Button>
              <Button onClick={handleExportAll}>
                <Download className="h-4 w-4 mr-2" />
                导出全部
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6">
        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索提示词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 提示词卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 新增提示词卡片 */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="font-medium text-lg text-purple-600 dark:text-purple-400 mb-2">
                    新增提示词
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    创建自定义的 AI 创作提示词模板
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>新增提示词</DialogTitle>
                <DialogDescription>
                  创建一个新的语言风格提示词模板
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-4 py-4 pr-2">
                    <div>
                      <Label>名称 *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例如：科幻战斗"
                      />
                    </div>
                    <div>
                      <Label>描述</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="简短描述这个风格的用途"
                      />
                    </div>
                    <div>
                      <Label>关键词（逗号分隔）</Label>
                      <Input
                        value={formData.keywords}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        placeholder="例如：科幻, 机甲, 激光"
                      />
                    </div>
                    <div>
                      <Label>标签（逗号分隔）</Label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="例如：战斗, 科幻"
                      />
                    </div>
                    <div>
                      <Label>提示词内容 *</Label>
                      <Textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                        placeholder="请输入详细的提示词内容..."
                        className="min-h-[300px] font-mono text-xs"
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}>
                  取消
                </Button>
                <Button onClick={handleSaveCreate}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 提示词卡片列表 */}
          {filteredStyles.map((style) => (
            <Card
              key={style.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-wrap gap-1">
                    {style.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFavorite(style.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(style.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </Button>
                </div>
                <CardTitle className="text-lg">{style.name}</CardTitle>
                <CardDescription className="text-sm">
                  {style.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <Sparkles className="h-3 w-3" />
                  使用 {style.usage} 次
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyPrompt(style)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    复制
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => openDetail(style)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    查看详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 详情/编辑对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{selectedStyle?.name}</DialogTitle>
            <DialogDescription>
              查看和编辑提示词详情
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 py-4 pr-2">
                <div>
                  <Label>名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>描述</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>关键词（逗号分隔）</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>
                <div>
                  <Label>标签（逗号分隔）</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
                <div>
                  <Label>提示词内容</Label>
                  <Textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="min-h-[300px] font-mono text-xs"
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailDialogOpen(false);
                setSelectedStyle(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>导入提示词库</DialogTitle>
            <DialogDescription>
              粘贴提示词库 JSON 数据，系统会自动去重，只导入不存在的提示词
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 py-4 pr-2">
                <Textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="粘贴提示词库 JSON 数据..."
                  className="min-h-[400px] font-mono text-xs"
                />
                <p className="text-sm text-gray-500">
                  💡 导入时会自动检测重复，已存在的提示词不会被覆盖
                </p>
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportJson('');
              }}
            >
              取消
            </Button>
            <Button onClick={handleImport}>
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
