'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Plus, Trash2, Loader2, Save, ChevronRight, Target, Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { showSaveSuccess, showError } from '@/lib/toast-utils';
import { loadNovelFromDatabase } from '@/lib/database-api';
import { type Novel } from '@/lib/storage';

interface SubPlot {
  id: string;
  title: string;
  description: string;
}

interface TurningPoint {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface PlotSettings {
  id?: string;
  novel_id?: string;
  core_conflict: string;
  main_plot: string;
  sub_plots: SubPlot[];
  turning_points: TurningPoint[];
}

export default function PlotSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [plotSettings, setPlotSettings] = useState<PlotSettings>({
    core_conflict: '',
    main_plot: '',
    sub_plots: [],
    turning_points: [],
  });

  const [newSubPlotTitle, setNewSubPlotTitle] = useState('');
  const [newSubPlotDesc, setNewSubPlotDesc] = useState('');
  const [newTurningPointTitle, setNewTurningPointTitle] = useState('');
  const [newTurningPointDesc, setNewTurningPointDesc] = useState('');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 加载剧情设置
  useEffect(() => {
    if (user && novelId) {
      fetchPlotSettings();
    }
  }, [user, novelId]);

  const fetchPlotSettings = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}/plot-settings`);
      if (!response.ok) throw new Error('获取剧情设置失败');
      const result = await response.json();

      if (result.data) {
        setPlotSettings({
          id: result.data.id,
          novel_id: result.data.novel_id,
          core_conflict: result.data.core_conflict || '',
          main_plot: result.data.main_plot || '',
          sub_plots: result.data.sub_plots || [],
          turning_points: result.data.turning_points || [],
        });
      }
    } catch (error: any) {
      console.error('获取剧情设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 自动保存（防抖）
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      await savePlotSettings();
    }, 1500);
  }, [novelId, plotSettings]);

  // 保存剧情设置
  const savePlotSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/novels/${novelId}/plot-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plotSettings),
      });

      if (!response.ok) throw new Error('保存失败');
      const result = await response.json();

      if (result.data?.id) {
        setPlotSettings(prev => ({ ...prev, id: result.data.id }));
      }

      setHasChanges(false);
      showSaveSuccess('剧情设置已保存');
    } catch (error: any) {
      console.error('保存剧情设置失败:', error);
      showError('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 核心冲突变更
  const handleCoreConflictChange = (value: string) => {
    setPlotSettings(prev => ({ ...prev, core_conflict: value }));
    setHasChanges(true);
    debouncedSave();
  };

  // 主线剧情变更
  const handleMainPlotChange = (value: string) => {
    setPlotSettings(prev => ({ ...prev, main_plot: value }));
    setHasChanges(true);
    debouncedSave();
  };

  // 添加支线剧情
  const handleAddSubPlot = () => {
    if (!newSubPlotTitle.trim()) return;
    const newSubPlot: SubPlot = {
      id: crypto.randomUUID(),
      title: newSubPlotTitle.trim(),
      description: newSubPlotDesc.trim(),
    };
    setPlotSettings(prev => ({
      ...prev,
      sub_plots: [...prev.sub_plots, newSubPlot],
    }));
    setNewSubPlotTitle('');
    setNewSubPlotDesc('');
    setHasChanges(true);
    debouncedSave();
  };

  // 删除支线剧情
  const handleRemoveSubPlot = (id: string) => {
    setPlotSettings(prev => ({
      ...prev,
      sub_plots: prev.sub_plots.filter(sp => sp.id !== id),
    }));
    setHasChanges(true);
    debouncedSave();
  };

  // 更新支线剧情
  const handleUpdateSubPlot = (id: string, field: 'title' | 'description', value: string) => {
    setPlotSettings(prev => ({
      ...prev,
      sub_plots: prev.sub_plots.map(sp =>
        sp.id === id ? { ...sp, [field]: value } : sp
      ),
    }));
    setHasChanges(true);
    debouncedSave();
  };

  // 添加关键转折点
  const handleAddTurningPoint = () => {
    if (!newTurningPointTitle.trim()) return;
    const newPoint: TurningPoint = {
      id: crypto.randomUUID(),
      title: newTurningPointTitle.trim(),
      description: newTurningPointDesc.trim(),
      order: plotSettings.turning_points.length + 1,
    };
    setPlotSettings(prev => ({
      ...prev,
      turning_points: [...prev.turning_points, newPoint],
    }));
    setNewTurningPointTitle('');
    setNewTurningPointDesc('');
    setHasChanges(true);
    debouncedSave();
  };

  // 删除关键转折点
  const handleRemoveTurningPoint = (id: string) => {
    setPlotSettings(prev => ({
      ...prev,
      turning_points: prev.turning_points
        .filter(tp => tp.id !== id)
        .map((tp, index) => ({ ...tp, order: index + 1 })),
    }));
    setHasChanges(true);
    debouncedSave();
  };

  // 更新关键转折点
  const handleUpdateTurningPoint = (id: string, field: 'title' | 'description', value: string) => {
    setPlotSettings(prev => ({
      ...prev,
      turning_points: prev.turning_points.map(tp =>
        tp.id === id ? { ...tp, [field]: value } : tp
      ),
    }));
    setHasChanges(true);
    debouncedSave();
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
                  剧情设置
                </h1>
                <p className="text-sm text-muted-foreground">{novel?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </div>
              )}
              {hasChanges && !isSaving && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  未保存
                </Badge>
              )}
              <Button
                onClick={savePlotSettings}
                disabled={isSaving || !hasChanges}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* 核心冲突 */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg">核心冲突</CardTitle>
                <CardDescription>描述故事的核心矛盾和冲突</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={plotSettings.core_conflict}
              onChange={(e) => handleCoreConflictChange(e.target.value)}
              placeholder="描述故事的核心冲突，例如：主角必须在拯救世界和牺牲挚爱之间做出选择..."
              className="min-h-[120px] resize-y"
            />
          </CardContent>
        </Card>

        {/* 主线剧情 */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">主线剧情</CardTitle>
                <CardDescription>描述故事的主要剧情走向</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={plotSettings.main_plot}
              onChange={(e) => handleMainPlotChange(e.target.value)}
              placeholder="描述主线剧情的发展脉络，包括起承转合..."
              className="min-h-[200px] resize-y"
            />
          </CardContent>
        </Card>

        {/* 支线剧情 */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <GitBranch className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">支线剧情</CardTitle>
                <CardDescription>添加和管理故事的支线剧情</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 支线列表 */}
            {plotSettings.sub_plots.length > 0 && (
              <div className="space-y-3">
                {plotSettings.sub_plots.map((subPlot, index) => (
                  <div
                    key={subPlot.id}
                    className="border rounded-lg p-4 bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            支线 {index + 1}
                          </Badge>
                          <Input
                            value={subPlot.title}
                            onChange={(e) => handleUpdateSubPlot(subPlot.id, 'title', e.target.value)}
                            placeholder="支线标题"
                            className="font-medium"
                          />
                        </div>
                        <Textarea
                          value={subPlot.description}
                          onChange={(e) => handleUpdateSubPlot(subPlot.id, 'description', e.target.value)}
                          placeholder="支线描述..."
                          className="min-h-[60px] resize-y text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubPlot(subPlot.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加支线 */}
            <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">添加新支线剧情</p>
              <Input
                value={newSubPlotTitle}
                onChange={(e) => setNewSubPlotTitle(e.target.value)}
                placeholder="支线标题"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubPlotTitle.trim()) {
                    handleAddSubPlot();
                  }
                }}
              />
              <Textarea
                value={newSubPlotDesc}
                onChange={(e) => setNewSubPlotDesc(e.target.value)}
                placeholder="支线描述（可选）"
                className="min-h-[60px] resize-y text-sm"
              />
              <Button
                onClick={handleAddSubPlot}
                disabled={!newSubPlotTitle.trim()}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                添加支线
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 关键转折点 */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">关键转折点</CardTitle>
                <CardDescription>标记故事中的关键转折和剧情节点</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 转折点时间线 */}
            {plotSettings.turning_points.length > 0 && (
              <div className="relative">
                {/* 时间线竖线 */}
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 dark:from-amber-600 dark:via-amber-500 dark:to-amber-600" />

                <div className="space-y-4">
                  {plotSettings.turning_points.map((point, index) => (
                    <div key={point.id} className="relative pl-10">
                      {/* 时间线节点 */}
                      <div className="absolute left-[8px] top-4 w-[16px] h-[16px] rounded-full bg-amber-400 dark:bg-amber-500 border-2 border-white dark:border-gray-900 shadow-sm" />

                      <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                节点 {index + 1}
                              </Badge>
                              <Input
                                value={point.title}
                                onChange={(e) => handleUpdateTurningPoint(point.id, 'title', e.target.value)}
                                placeholder="转折点标题"
                                className="font-medium"
                              />
                            </div>
                            <Textarea
                              value={point.description}
                              onChange={(e) => handleUpdateTurningPoint(point.id, 'description', e.target.value)}
                              placeholder="转折点描述..."
                              className="min-h-[60px] resize-y text-sm"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTurningPoint(point.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添加转折点 */}
            <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">添加新转折点</p>
              <Input
                value={newTurningPointTitle}
                onChange={(e) => setNewTurningPointTitle(e.target.value)}
                placeholder="转折点标题"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTurningPointTitle.trim()) {
                    handleAddTurningPoint();
                  }
                }}
              />
              <Textarea
                value={newTurningPointDesc}
                onChange={(e) => setNewTurningPointDesc(e.target.value)}
                placeholder="转折点描述（可选）"
                className="min-h-[60px] resize-y text-sm"
              />
              <Button
                onClick={handleAddTurningPoint}
                disabled={!newTurningPointTitle.trim()}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                添加转折点
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
