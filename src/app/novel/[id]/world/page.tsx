'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, Plus, Edit2, Trash2, Save, Loader2, Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { type Novel, type WorldSetting } from '@/lib/types';
import { dbCreateWorldSetting, dbUpdateWorldSetting, dbDeleteWorldSetting } from '@/lib/database-storage';
import { useAuth } from '@/lib/auth';
import { showSaveSuccess, showError } from '@/lib/toast-utils';

const CATEGORIES = [
  '地理环境',
  '魔法系统',
  '政治体系',
  '历史背景',
  '文化习俗',
  '科技水平',
  '种族设定',
  '宗教信仰',
  '其他',
];

export default function WorldSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<WorldSetting | null>(null);
  const [settingToDelete, setSettingToDelete] = useState<WorldSetting | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [formData, setFormData] = useState({
    category: '地理环境',
    title: '',
    content: '',
  });

  // 辅助函数：格式化时间
  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // 相对时间显示
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;

      // 超过7天显示完整日期
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('格式化时间失败:', error);
      return '';
    }
  };

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 从数据库加载小说数据
  useEffect(() => {
    if (user && novelId) {
      loadNovelFromDatabase();
    }
  }, [user, authLoading, novelId]);

  const loadNovelFromDatabase = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/novels/${novelId}`);
      
      if (!response.ok) {
        throw new Error('加载小说失败');
      }

      const result = await response.json();
      
      if (result.code === 200) {
        setNovel(result.data);
      } else {
        showError(result.msg || '加载小说失败');
        router.push('/');
      }
    } catch (error) {
      console.error('加载小说失败:', error);
      showError('加载小说失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novel || !formData.title.trim()) return;

    try {
      // 1. 通过API创建设定到数据库
      const response = await fetch(`/api/novels/${novel.id}/world-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          title: formData.title,
          content: formData.content,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Create World Setting] API失败:', error);
        throw new Error(error);
      }

      const result = await response.json();
      console.log('[Create World Setting] API成功:', result);

      // 2. 同时保存到数据库作为备份
      await dbCreateWorldSetting(novel.id, {
        category: formData.category,
        title: formData.title,
        content: formData.content,
        priority: 'medium',
      });

      // 3. 刷新页面数据
      await loadNovelFromDatabase();

      setIsCreateDialogOpen(false);
      setFormData({
        category: '地理环境',
        title: '',
        content: '',
      });

      showSaveSuccess('设定创建成功！');
    } catch (error: any) {
      console.error('创建设定失败:', error);
      showError(error.message || '创建设定失败，请重试');
    }
  };

  const handleEditSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novel || !selectedSetting) return;

    try {
      // 1. 通过API更新设定到数据库
      const response = await fetch(`/api/novels/${novel.id}/world-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedSetting.id,
          category: formData.category,
          title: formData.title,
          content: formData.content,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Update World Setting] API失败:', error);
        throw new Error(error);
      }

      const result = await response.json();
      console.log('[Update World Setting] API成功:', result);

      // 2. 同时更新数据库作为备份
      await dbUpdateWorldSetting(selectedSetting.id, {
        category: formData.category,
        title: formData.title,
        content: formData.content,
        priority: 'medium',
      });

      // 3. 刷新页面数据
      await loadNovelFromDatabase();

      setIsEditDialogOpen(false);
      setSelectedSetting(null);
      setFormData({
        category: '地理环境',
        title: '',
        content: '',
      });

      showSaveSuccess('设定更新成功！');
    } catch (error: any) {
      console.error('更新设定失败:', error);
      showError(error.message || '更新设定失败，请重试');
    }
  };

  const handleDeleteSetting = (settingId: string) => {
    if (!novel) return;
    const setting = novel.worldSettings?.find(s => s.id === settingId);
    if (setting) {
      setSettingToDelete(setting);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteSetting = async () => {
    if (!novel || !settingToDelete) return;

    try {
      // 1. 通过API删除数据库中的设定
      const response = await fetch(`/api/novels/${novel.id}/world-settings?settingId=${settingToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Delete World Setting] API失败:', error);
        throw new Error(error);
      }

      console.log('[Delete World Setting] API成功');

      // 2. 同时删除数据库中的数据作为备份
      await dbDeleteWorldSetting(settingToDelete.id);

      // 3. 刷新页面数据
      await loadNovelFromDatabase();

      // 4. 显示成功提示
      showSaveSuccess(`设定 "${settingToDelete.title}" 已删除`);
    } catch (error: any) {
      console.error('删除设定失败:', error);
      showError(error.message || '删除设定失败，请重试');
    } finally {
      setIsDeleteDialogOpen(false);
      setSettingToDelete(null);
    }
  };

  const openEditDialog = (setting: WorldSetting) => {
    setSelectedSetting(setting);
    setFormData({
      category: setting.category,
      title: setting.title,
      content: setting.content,
    });
    setIsEditDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '地理环境': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '魔法系统': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '政治体系': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      '历史背景': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      '文化习俗': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      '科技水平': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      '种族设定': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '宗教信仰': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      '其他': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[category] || colors['其他'];
  };

  const getSettingsByCategory = () => {
    if (!novel) return {};
    const grouped: Record<string, WorldSetting[]> = {};
    novel.worldSettings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });
    return grouped;
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !novel) return;

    setIsParsing(true);
    setParseResult(null);

    try {
      // 第一步：解析文档
      const formData = new FormData();
      formData.append('file', uploadFile);

      const parseResponse = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      // 读取响应文本
      const responseText = await parseResponse.text();
      console.log('[World Settings] API响应:', responseText.substring(0, 500));

      let parseData;
      try {
        parseData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('[World Settings] JSON解析失败:', jsonError);
        console.error('[World Settings] 响应内容:', responseText.substring(0, 1000));
        throw new Error('服务器返回的数据格式不正确，可能是文档过长导致。建议：1. 缩短文档内容；2. 分批上传；3. 手动添加设定');
      }

      if (!parseData.success) {
        // 如果有调试信息，显示更详细的错误
        if (parseData.debugInfo) {
          const debugMsg = `
${parseData.error}

调试信息：
- 文档长度: ${parseData.debugInfo.documentLength} 字符
- AI响应: ${parseData.debugInfo.aiResponse?.substring(0, 300)}...
          `.trim();
          throw new Error(debugMsg);
        }
        throw new Error(parseData.error || '文档解析失败');
      }

      setParseResult(parseData.data);
    } catch (error: any) {
      console.error('文档上传失败:', error);
      showError(`文档解析失败：${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplySettings = async () => {
    if (!parseResult || !novel) return;

    try {
      console.log('[World Settings] 应用设定:', {
        novelId: novel.id,
        novelTitle: novel.title,
        worldSettingsCount: parseResult.worldSettings?.length,
        worldSettings: parseResult.worldSettings,
        overwrite
      });

      let addedCount = 0;
      let updatedCount = 0;

      // 处理每个世界观设定
      for (const settingData of parseResult.worldSettings) {
        console.log('[World Settings] 处理世界观设定:', settingData);

        const existingSetting = novel.worldSettings?.find(
          (s) => s.title === settingData.title
        );

        if (existingSetting) {
          if (overwrite) {
            console.log('[World Settings] 更新现有设定:', existingSetting.id);

            // 字段长度验证和截断
            const MAX_TITLE_LENGTH = 256;
            const processedTitle = settingData.title && settingData.title.length > MAX_TITLE_LENGTH
              ? settingData.title.substring(0, MAX_TITLE_LENGTH)
              : settingData.title;

            if (settingData.title && settingData.title.length > MAX_TITLE_LENGTH) {
              console.warn('[World Settings] title 超过长度限制，自动截断:', {
                original: settingData.title,
                length: settingData.title.length,
                maxLength: MAX_TITLE_LENGTH,
                truncated: processedTitle
              });
            }

            // 尝试通过API更新设定
            try {
              const response = await fetch(`/api/novels/${novel.id}/world-settings`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: existingSetting.id,
                  category: settingData.category || existingSetting.category,
                  title: processedTitle,
                  content: settingData.content || existingSetting.content,
                }),
              });

              if (response.ok) {
                updatedCount++;
                console.log('[World Settings] API更新成功:', existingSetting.id);
              } else {
                console.error('[World Settings] API更新失败:', await response.text());
                // API失败后回退到数据库更新
                await dbUpdateWorldSetting(existingSetting.id, {
                  category: settingData.category || existingSetting.category,
                  content: settingData.content || existingSetting.content,
                });
                updatedCount++;
              }
            } catch (apiError) {
              console.error('[World Settings] API更新异常:', apiError);
              // API异常后回退到数据库更新
              await dbUpdateWorldSetting(existingSetting.id, {
                category: settingData.category || existingSetting.category,
                content: settingData.content || existingSetting.content,
              });
              updatedCount++;
            }
          } else {
            console.log('[World Settings] 跳过现有设定（overwrite=false）:', existingSetting.id);
          }
        } else {
          console.log('[World Settings] 添加新设定:', settingData.title);

          // 字段长度验证和截断
          const MAX_TITLE_LENGTH = 256;
          const processedTitle = settingData.title && settingData.title.length > MAX_TITLE_LENGTH
            ? settingData.title.substring(0, MAX_TITLE_LENGTH)
            : settingData.title;

          if (settingData.title && settingData.title.length > MAX_TITLE_LENGTH) {
            console.warn('[World Settings] title 超过长度限制，自动截断:', {
              original: settingData.title,
              length: settingData.title.length,
              maxLength: MAX_TITLE_LENGTH,
              truncated: processedTitle
            });
          }

          // 通过API添加新设定
          try {
            const response = await fetch(`/api/novels/${novel.id}/world-settings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                category: settingData.category || '其他',
                title: processedTitle,
                content: settingData.content,
              }),
            });

            if (response.ok) {
              addedCount++;
              console.log('[World Settings] API添加成功:', settingData.title);
            } else {
              console.error('[World Settings] API添加失败:', await response.text());
              // API失败后回退到数据库
              await dbCreateWorldSetting(novel.id, {
                category: settingData.category || '其他',
                title: processedTitle,
                content: settingData.content,
                priority: 'medium',
              });
              addedCount++;
            }
          } catch (apiError) {
            console.error('[World Settings] API添加异常:', apiError);
            // API异常后回退到数据库
            await dbCreateWorldSetting(novel.id, {
              category: settingData.category || '其他',
              title: settingData.title,
              content: settingData.content,
              priority: 'medium',
            });
            addedCount++;
          }
        }
      }

      // 刷新页面数据
      await loadNovelFromDatabase();

      // 关闭对话框并重置状态
      setIsUploadDialogOpen(false);
      setParseResult(null);
      setUploadFile(null);
      setOverwrite(false);

      showSaveSuccess(`成功！添加了 ${addedCount} 个设定，更新了 ${updatedCount} 个设定`);
    } catch (error) {
      console.error('应用设定失败:', error);
      showError('应用设定失败，请重试');
    }
  };

  if (isLoading || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedSettings = getSettingsByCategory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/novel/${novel.id}/editor`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  世界观设定
                </h1>
                <p className="text-sm text-muted-foreground">{novel.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-5 w-5" />
                    上传文档
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh]">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>上传文档智能提取世界观设定</DialogTitle>
                    <DialogDescription>
                      上传文档，AI将自动提取世界观设定并保存到数据库
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    {!parseResult ? (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                          <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept=".txt,.md,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadFile(file);
                              }
                            }}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-2">
                              点击或拖拽文件到这里
                            </p>
                            <p className="text-xs text-muted-foreground">
                              支持 TXT、Markdown、Word 文档
                            </p>
                          </label>
                          {uploadFile && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium">{uploadFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(uploadFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={handleFileUpload}
                          disabled={!uploadFile || isParsing}
                          className="w-full"
                        >
                          {isParsing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              解析中...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              开始解析
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">解析成功！</span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            共提取到 {parseResult.worldSettings?.length || 0} 个世界观设定
                          </p>
                        </div>

                        {parseResult.worldSettings && parseResult.worldSettings.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">提取的设定：</h4>
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                              {parseResult.worldSettings.map((setting: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 bg-muted rounded-lg text-sm"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{setting.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {setting.category ? `(${setting.category})` : ''}
                                    </span>
                                  </div>
                                  {setting.content && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {setting.content}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 调试信息：显示AI响应 */}
                        {(parseResult.worldSettings?.length === 0) && (
                          <div className="mt-4 space-y-3">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                                <strong>调试信息：</strong>AI未识别到世界观设定
                              </p>
                              {parseResult.documentPreview && (
                                <details className="mb-2">
                                  <summary className="text-xs text-yellow-700 dark:text-yellow-300 cursor-pointer font-medium">
                                    📄 查看文档内容预览（点击展开）
                                  </summary>
                                  <pre className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 font-mono bg-white/50 p-2 rounded max-h-32 overflow-y-auto">
                                    {parseResult.documentPreview}
                                  </pre>
                                </details>
                              )}
                              {parseResult.aiResponse && (
                                <details>
                                  <summary className="text-xs text-yellow-700 dark:text-yellow-300 cursor-pointer font-medium">
                                    🤖 查看AI原始响应（点击展开）
                                  </summary>
                                  <pre className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 font-mono bg-white/50 p-2 rounded max-h-32 overflow-y-auto">
                                    {parseResult.aiResponse}
                                  </pre>
                                </details>
                              )}
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>💡 建议：</strong>如果文档包含世界观设定，可能是因为：
                              </p>
                              <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
                                <li>文档中的设定描述不够详细或明确</li>
                                <li>文档内容过长，超过8000字，请分批上传</li>
                                <li>如果是Word文档，可能文本提取不完整</li>
                                <li>可以直接手动添加设定</li>
                              </ul>
                            </div>
                          </div>
                        )}

                        {parseResult.worldSettings && parseResult.worldSettings.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="overwrite"
                              checked={overwrite}
                              onChange={(e) => setOverwrite(e.target.checked)}
                              className="rounded"
                            />
                            <label htmlFor="overwrite" className="text-sm">
                              覆盖已存在的同名设定
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {parseResult && (
                    <DialogFooter className="flex-shrink-0 pt-4">
                      <Button
                        onClick={() => {
                          setParseResult(null);
                          setUploadFile(null);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        取消
                      </Button>
                      <Button onClick={handleApplySettings} className="flex-1">
                        应用到小说
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-5 w-5" />
                    添加设定
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh]">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>添加世界观设定</DialogTitle>
                  <DialogDescription>
                    记录你的世界观元素
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  <form onSubmit={handleCreateSetting} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">类别 *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">标题 *</Label>
                        <Input
                          id="title"
                          placeholder="输入设定标题"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">详细内容</Label>
                      <Textarea
                        id="content"
                        placeholder="描述设定的详细内容..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={10}
                      />
                    </div>
                  </form>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4">
                  <Button onClick={(e) => {
                    e.preventDefault();
                    handleCreateSetting(e);
                  }}>
                    添加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {novel.worldSettings.length === 0 ? (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-20">
              <Globe className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                还没有设定
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                点击右上角按钮，添加你的第一个世界观设定
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                添加设定
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map(category => {
              const settings = groupedSettings[category];
              if (!settings || settings.length === 0) return null;

              return (
                <div key={category}>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {settings.length} 项
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings.map((setting) => (
                      <Card key={setting.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{setting.title}</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(setting)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteSetting(setting.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {setting.content || '暂无详细内容'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              🕐 {formatDateTime(setting.createdAt)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>编辑世界观设定</DialogTitle>
            <DialogDescription>
              修改世界观设定
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <form onSubmit={handleEditSetting} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">类别 *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">标题 *</Label>
                  <Input
                    id="edit-title"
                    placeholder="输入设定标题"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">详细内容</Label>
                <Textarea
                  id="edit-content"
                  placeholder="描述设定的详细内容..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                />
              </div>
            </form>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4">
            <Button onClick={(e) => {
              e.preventDefault();
              handleEditSetting(e);
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              确定删除设定？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除设定 <span className="font-semibold text-foreground">"{settingToDelete?.title}"</span>，
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSetting}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
