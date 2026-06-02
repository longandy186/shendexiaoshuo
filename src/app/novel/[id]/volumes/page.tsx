'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookMarked, Plus, Edit2, Trash2, Loader2,
  ChevronDown, ChevronUp, GripVertical, Save, X, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';
import { showSaveSuccess, showError, showInfo } from '@/lib/toast-utils';
import { loadNovelFromDatabase } from '@/lib/database-api';
import { type Novel } from '@/lib/types';

interface ChapterOutline {
  id: string;
  volumeId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  keyScenes: string[];
  status: 'draft' | 'written' | 'revised';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Volume {
  id: string;
  novelId: string;
  title: string;
  description: string;
  mainConflict: string;
  keyEvents: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  chapters: ChapterOutline[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  written: { label: '已写', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  revised: { label: '已修订', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function VolumesPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());

  // 分卷对话框
  const [isVolumeDialogOpen, setIsVolumeDialogOpen] = useState(false);
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [volumeToDelete, setVolumeToDelete] = useState<Volume | null>(null);
  const [volumeFormData, setVolumeFormData] = useState({
    title: '',
    description: '',
    mainConflict: '',
  });

  // 章节对话框
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterOutline | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<ChapterOutline | null>(null);
  const [targetVolumeId, setTargetVolumeId] = useState<string>('');
  const [chapterFormData, setChapterFormData] = useState({
    title: '',
    summary: '',
    keyScenes: '',
    status: 'draft' as ChapterOutline['status'],
  });

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 加载小说数据
  useEffect(() => {
    if (user && novelId) {
      loadNovelFromDatabase(novelId)
        .then(loadedNovel => {
          if (!loadedNovel) {
            router.push('/');
            return;
          }
          setNovel(loadedNovel);
        })
        .catch(error => {
          console.error('加载小说失败:', error);
          showError('加载小说失败，请刷新页面重试');
        });
    }
  }, [user, authLoading, novelId, router]);

  // 加载分卷数据
  useEffect(() => {
    if (user && novelId) {
      fetchVolumes();
    }
  }, [user, novelId]);

  const fetchVolumes = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}/volumes`);
      if (!response.ok) throw new Error('获取分卷列表失败');
      const result = await response.json();
      setVolumes(result.data || []);
    } catch (error: any) {
      console.error('获取分卷列表失败:', error);
      showError('获取分卷列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换分卷展开/折叠
  const toggleVolumeExpand = (volumeId: string) => {
    setExpandedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  // === 分卷操作 ===

  const openCreateVolumeDialog = () => {
    setEditingVolume(null);
    setVolumeFormData({ title: '', description: '', mainConflict: '' });
    setIsVolumeDialogOpen(true);
  };

  const openEditVolumeDialog = (volume: Volume) => {
    setEditingVolume(volume);
    setVolumeFormData({
      title: volume.title,
      description: volume.description,
      mainConflict: volume.mainConflict,
    });
    setIsVolumeDialogOpen(true);
  };

  const handleSaveVolume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeFormData.title.trim()) return;

    try {
      if (editingVolume) {
        // 更新
        const response = await fetch(`/api/novels/${novelId}/volumes/${editingVolume.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: volumeFormData.title,
            description: volumeFormData.description,
            main_conflict: volumeFormData.mainConflict,
          }),
        });
        if (!response.ok) throw new Error('更新分卷失败');
        showSaveSuccess('分卷更新成功');
      } else {
        // 创建
        const response = await fetch(`/api/novels/${novelId}/volumes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: volumeFormData.title,
            description: volumeFormData.description,
            main_conflict: volumeFormData.mainConflict,
          }),
        });
        if (!response.ok) throw new Error('创建分卷失败');
        showSaveSuccess('分卷创建成功');
      }

      setIsVolumeDialogOpen(false);
      await fetchVolumes();
    } catch (error: any) {
      console.error('保存分卷失败:', error);
      showError(error.message || '保存分卷失败');
    }
  };

  const handleDeleteVolume = async () => {
    if (!volumeToDelete) return;

    try {
      const response = await fetch(`/api/novels/${novelId}/volumes/${volumeToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('删除分卷失败');
      showSaveSuccess('分卷删除成功');
      setVolumeToDelete(null);
      await fetchVolumes();
    } catch (error: any) {
      console.error('删除分卷失败:', error);
      showError('删除分卷失败');
    }
  };

  // === 章节操作 ===

  const openCreateChapterDialog = (volumeId: string) => {
    setEditingChapter(null);
    setTargetVolumeId(volumeId);
    setChapterFormData({ title: '', summary: '', keyScenes: '', status: 'draft' });
    setIsChapterDialogOpen(true);
  };

  const openEditChapterDialog = (chapter: ChapterOutline) => {
    setEditingChapter(chapter);
    setTargetVolumeId(chapter.volumeId);
    setChapterFormData({
      title: chapter.title,
      summary: chapter.summary,
      keyScenes: (chapter.keyScenes || []).join('\n'),
      status: chapter.status,
    });
    setIsChapterDialogOpen(true);
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterFormData.title.trim()) return;

    const keyScenes = chapterFormData.keyScenes
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      if (editingChapter) {
        // 更新
        const response = await fetch(
          `/api/novels/${novelId}/volumes/${targetVolumeId}/chapters/${editingChapter.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: chapterFormData.title,
              summary: chapterFormData.summary,
              key_scenes: keyScenes,
              status: chapterFormData.status,
            }),
          }
        );
        if (!response.ok) throw new Error('更新章节大纲失败');
        showSaveSuccess('章节大纲更新成功');
      } else {
        // 创建
        const response = await fetch(
          `/api/novels/${novelId}/volumes/${targetVolumeId}/chapters`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: chapterFormData.title,
              summary: chapterFormData.summary,
              key_scenes: keyScenes,
              status: chapterFormData.status,
            }),
          }
        );
        if (!response.ok) throw new Error('创建章节大纲失败');
        showSaveSuccess('章节大纲创建成功');
      }

      setIsChapterDialogOpen(false);
      await fetchVolumes();
    } catch (error: any) {
      console.error('保存章节大纲失败:', error);
      showError(error.message || '保存章节大纲失败');
    }
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDelete) return;

    try {
      const response = await fetch(
        `/api/novels/${novelId}/volumes/${chapterToDelete.volumeId}/chapters/${chapterToDelete.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('删除章节大纲失败');
      showSaveSuccess('章节大纲删除成功');
      setChapterToDelete(null);
      await fetchVolumes();
    } catch (error: any) {
      console.error('删除章节大纲失败:', error);
      showError('删除章节大纲失败');
    }
  };

  // 章节上下移动
  const handleMoveChapter = async (chapter: ChapterOutline, direction: 'up' | 'down') => {
    const volume = volumes.find(v => v.id === chapter.volumeId);
    if (!volume) return;

    const chapters = [...volume.chapters];
    const currentIndex = chapters.findIndex(c => c.id === chapter.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    // 交换排序
    const temp = chapters[currentIndex];
    chapters[currentIndex] = chapters[targetIndex];
    chapters[targetIndex] = temp;

    try {
      // 更新两个章节的排序
      await Promise.all([
        fetch(`/api/novels/${novelId}/volumes/${chapter.volumeId}/chapters/${chapters[currentIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...chapters[currentIndex],
            sort_order: currentIndex,
          }),
        }),
        fetch(`/api/novels/${novelId}/volumes/${chapter.volumeId}/chapters/${chapters[targetIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...chapters[targetIndex],
            sort_order: targetIndex,
          }),
        }),
      ]);

      await fetchVolumes();
    } catch (error: any) {
      console.error('移动章节失败:', error);
      showError('移动章节失败');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/novel/${novelId}/editor`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  分卷大纲
                </h1>
                <p className="text-sm text-muted-foreground">{novel?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {volumes.length} 卷
              </Badge>
              <Button onClick={openCreateVolumeDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                新建分卷
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {volumes.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <BookMarked className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                还没有分卷
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                创建第一个分卷，开始规划你的小说结构
              </p>
              <Button onClick={openCreateVolumeDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                创建第一个分卷
              </Button>
            </CardContent>
          </Card>
        ) : (
          volumes.map((volume, volumeIndex) => (
            <Card
              key={volume.id}
              className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden"
            >
              {/* 分卷头部 */}
              <CardHeader
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleVolumeExpand(volume.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 mt-0.5">
                      <BookMarked className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          第 {volumeIndex + 1} 卷
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {volume.chapters.length} 章
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{volume.title || '未命名分卷'}</CardTitle>
                      {volume.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {volume.description}
                        </CardDescription>
                      )}
                      {volume.mainConflict && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          核心冲突：{volume.mainConflict}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditVolumeDialog(volume);
                      }}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVolumeToDelete(volume);
                      }}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedVolumes.has(volume.id) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* 章节列表（展开时显示） */}
              {expandedVolumes.has(volume.id) && (
                <CardContent className="border-t bg-muted/20">
                  <div className="space-y-3">
                    {/* 关键事件 */}
                    {volume.keyEvents && volume.keyEvents.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                          关键事件
                        </p>
                        <ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
                          {volume.keyEvents.map((event, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-400 mt-0.5">&#8226;</span>
                              {event}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 章节列表 */}
                    {volume.chapters.length > 0 ? (
                      <div className="space-y-2">
                        {volume.chapters.map((chapter, chapterIndex) => (
                          <div
                            key={chapter.id}
                            className="border rounded-lg p-3 bg-white dark:bg-gray-900/50 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start gap-3">
                              {/* 排序控制 */}
                              <div className="flex flex-col items-center gap-0.5 pt-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={chapterIndex === 0}
                                  onClick={() => handleMoveChapter(chapter, 'up')}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={chapterIndex === volume.chapters.length - 1}
                                  onClick={() => handleMoveChapter(chapter, 'down')}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* 章节内容 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    第{chapter.chapterNumber}章
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${STATUS_MAP[chapter.status]?.color || ''}`}
                                  >
                                    {STATUS_MAP[chapter.status]?.label || chapter.status}
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm">{chapter.title || '未命名章节'}</p>
                                {chapter.summary && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {chapter.summary}
                                  </p>
                                )}
                                {chapter.keyScenes && chapter.keyScenes.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {chapter.keyScenes.map((scene, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {scene}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 操作按钮 */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditChapterDialog(chapter)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => setChapterToDelete(chapter)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">暂无章节大纲</p>
                        <p className="text-xs mt-1">点击下方按钮添加第一个章节</p>
                      </div>
                    )}

                    {/* 添加章节按钮 */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      onClick={() => openCreateChapterDialog(volume.id)}
                    >
                      <Plus className="h-4 w-4" />
                      添加章节大纲
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </main>

      {/* 创建/编辑分卷对话框 */}
      <Dialog open={isVolumeDialogOpen} onOpenChange={setIsVolumeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingVolume ? '编辑分卷' : '新建分卷'}</DialogTitle>
            <DialogDescription>
              {editingVolume ? '修改分卷信息' : '创建一个新的分卷'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveVolume} className="space-y-4">
            <div className="space-y-2">
              <Label>分卷标题 *</Label>
              <Input
                value={volumeFormData.title}
                onChange={(e) => setVolumeFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="例如：第一卷 起源"
              />
            </div>
            <div className="space-y-2">
              <Label>分卷描述</Label>
              <Textarea
                value={volumeFormData.description}
                onChange={(e) => setVolumeFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述这一卷的主要内容..."
                className="min-h-[80px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>核心冲突</Label>
              <Textarea
                value={volumeFormData.mainConflict}
                onChange={(e) => setVolumeFormData(prev => ({ ...prev, mainConflict: e.target.value }))}
                placeholder="这一卷的主要矛盾冲突..."
                className="min-h-[80px] resize-y"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVolumeDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!volumeFormData.title.trim()}>
                {editingVolume ? '保存修改' : '创建分卷'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑章节对话框 */}
      <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingChapter ? '编辑章节大纲' : '新建章节大纲'}</DialogTitle>
            <DialogDescription>
              {editingChapter ? '修改章节大纲信息' : '为当前分卷添加新的章节大纲'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveChapter} className="space-y-4">
            <div className="space-y-2">
              <Label>章节标题 *</Label>
              <Input
                value={chapterFormData.title}
                onChange={(e) => setChapterFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="例如：初入江湖"
              />
            </div>
            <div className="space-y-2">
              <Label>章节概要</Label>
              <Textarea
                value={chapterFormData.summary}
                onChange={(e) => setChapterFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="描述这一章的主要内容和情节..."
                className="min-h-[100px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>关键场景（每行一个）</Label>
              <Textarea
                value={chapterFormData.keyScenes}
                onChange={(e) => setChapterFormData(prev => ({ ...prev, keyScenes: e.target.value }))}
                placeholder="主角遇到神秘老人&#10;获得第一件法宝&#10;与反派初次交锋"
                className="min-h-[80px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={chapterFormData.status}
                onValueChange={(value) =>
                  setChapterFormData(prev => ({ ...prev, status: value as ChapterOutline['status'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="written">已写</SelectItem>
                  <SelectItem value="revised">已修订</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChapterDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!chapterFormData.title.trim()}>
                {editingChapter ? '保存修改' : '添加章节'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除分卷确认 */}
      <AlertDialog open={!!volumeToDelete} onOpenChange={(open) => { if (!open) setVolumeToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分卷</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分卷「{volumeToDelete?.title}」吗？该分卷下的所有章节大纲也将被删除，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVolume}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除章节确认 */}
      <AlertDialog open={!!chapterToDelete} onOpenChange={(open) => { if (!open) setChapterToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除章节大纲</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除章节「{chapterToDelete?.title}」的大纲吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChapter}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
