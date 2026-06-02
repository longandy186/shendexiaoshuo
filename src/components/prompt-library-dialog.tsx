'use client';

import { useState, useEffect } from 'react';
import {
  Palette,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Search,
  Save,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getLanguageStyles,
  addLanguageStyle,
  updateLanguageStyle,
  deleteLanguageStyle,
  resetToDefaults,
  exportLanguageStyles,
  importLanguageStyles,
  getLanguageStylesFromDB,
  saveLanguageStyleToDB,
  deleteLanguageStyleFromDB,
  type LanguageStyle,
} from '@/lib/prompt-library';
import { useAuth } from '@/lib/auth';

interface PromptLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStylesChange?: () => void;
}

export default function PromptLibraryDialog({
  open,
  onOpenChange,
  onStylesChange,
}: PromptLibraryDialogProps) {
  const { user } = useAuth();
  const [styles, setStyles] = useState<LanguageStyle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStyle, setEditingStyle] = useState<LanguageStyle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    tags: '',
    prompt: '',
  });
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);

  // 加载提示词列表
  useEffect(() => {
    if (open) {
      loadStyles();
    }
  }, [open, user]);

  const loadStyles = async () => {
    try {
      const data = await getLanguageStylesFromDB(user?.id);
      setStyles(data);
    } catch (error) {
      console.error('加载提示词失败:', error);
      setStyles(getLanguageStyles());
    }
  };

  // 过滤提示词
  const filteredStyles = styles.filter(
    (style) =>
      style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 打开编辑
  const handleEdit = (style: LanguageStyle) => {
    setEditingStyle(style);
    setIsCreating(false);
    setFormData({
      name: style.name,
      description: style.description,
      keywords: style.keywords.join(', '),
      tags: style.tags?.join(', ') || '',
      prompt: style.prompt,
    });
  };

  // 打开创建
  const handleCreate = () => {
    setEditingStyle(null);
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      keywords: '',
      tags: '',
      prompt: '',
    });
  };

  // 保存
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert('请填写名称和提示词内容');
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

    try {
      if (isCreating) {
        const newStyle: LanguageStyle = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: formData.name.trim(),
          description: formData.description.trim(),
          keywords: keywordsArray,
          tags: tagsArray,
          prompt: formData.prompt.trim(),
          usage: 0,
        };
        await saveLanguageStyleToDB(newStyle, user?.id);
      } else if (editingStyle) {
        const updatedStyle = {
          ...editingStyle,
          name: formData.name.trim(),
          description: formData.description.trim(),
          keywords: keywordsArray,
          tags: tagsArray,
          prompt: formData.prompt.trim(),
        };
        await saveLanguageStyleToDB(updatedStyle, user?.id);
      }

      await loadStyles();
      setEditingStyle(null);
      setIsCreating(false);
      onStylesChange?.();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个提示词吗？')) {
      try {
        // 如果是自定义提示词（ID以custom开头），则从数据库删除
        if (id.startsWith('custom-')) {
          await deleteLanguageStyleFromDB(id, user?.id);
        } else {
          // 系统提示词暂时从 localStorage 删除
          deleteLanguageStyle(id);
        }

        await loadStyles();
        if (editingStyle?.id === id) {
          setEditingStyle(null);
          setIsCreating(false);
        }
        onStylesChange?.();
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
      }
    }
  };

  // 重置
  const handleReset = () => {
    if (window.confirm('确定要重置为默认提示词库吗？这将删除所有自定义提示词！')) {
      resetToDefaults();
      loadStyles();
      setEditingStyle(null);
      setIsCreating(false);
      onStylesChange?.();
    }
  };

  // 导出
  const handleExport = () => {
    const json = exportLanguageStyles();
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

  // 导入
  const handleImport = () => {
    if (!importJson.trim()) {
      alert('请粘贴提示词库 JSON 数据');
      return;
    }

    const result = importLanguageStyles(importJson);
    if (result.success) {
      alert(`成功导入 ${result.imported} 个提示词`);
      loadStyles();
      setImportJson('');
      setShowImport(false);
      onStylesChange?.();
    } else {
      alert(`导入失败：${result.error}`);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingStyle(null);
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            语言风格提示词库管理
          </DialogTitle>
          <DialogDescription>
            管理和自定义 AI 创作的语言风格提示词
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* 左侧：提示词列表 */}
          <div className="w-1/2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索提示词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-1" />
                新建
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md p-2">
              {filteredStyles.map((style) => (
                <div
                  key={style.id}
                  className={`p-3 rounded-lg border mb-2 cursor-pointer transition-colors ${
                    editingStyle?.id === style.id
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleEdit(style)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{style.name}</span>
                      {style.usage > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {style.usage}次
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(style.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {style.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {style.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* 右侧：编辑表单 */}
          <div className="w-1/2 flex flex-col">
            {isCreating || editingStyle ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">
                    {isCreating ? '创建新提示词' : '编辑提示词'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">名称 *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例如：战斗场景"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">描述</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="简短描述这个风格的用途"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">关键词（逗号分隔）</Label>
                      <Input
                        value={formData.keywords}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        placeholder="例如：战斗, 爽点, 动作"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">标签（逗号分隔）</Label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="例如：人物, 飞卢"
                      />
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm">提示词内容 *</Label>
                      <Textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                        placeholder="请输入详细的提示词内容..."
                        className="min-h-[300px] font-mono text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 提示词将作为系统提示词的一部分发送给 AI
                      </p>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  <Button variant="outline" onClick={handleCancel}>
                    取消
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">选择一个提示词进行编辑</p>
                  <p className="text-xs mt-1">或点击"新建"创建新的提示词</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置为默认
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            <Upload className="h-4 w-4 mr-1" />
            导入
          </Button>
        </DialogFooter>

        {/* 导入对话框 */}
        {showImport && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium text-sm mb-2">导入提示词库</h4>
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="粘贴提示词库 JSON 数据..."
              className="min-h-[100px] font-mono text-xs mb-2"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleImport}>
                确认导入
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
