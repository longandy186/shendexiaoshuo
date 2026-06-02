'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Users,
  Globe,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  FileText,
  List,
  Menu,
  Settings,
  Download,
  Upload,
  Wand2,
  PenTool,
  RefreshCw,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Database,
  History,
  Palette,
  BookMarked,
  Eye,
  AlertTriangle,
  ClipboardCheck,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { type Novel, type Chapter } from '@/lib/types';
import { LANGUAGE_STYLES, getRecommendedStyles, getLanguageStyleById, type LanguageStyle } from '@/lib/language-styles';
import { getLanguageStyles } from '@/lib/prompt-library';
import { loadNovelFromDatabase } from '@/lib/database-api';

// 模型风格映射 - 适合长文本创作
const modelStyles: Record<string, { label: string; style: string; description: string }> = {
  'doubao': { label: '豆包 Seed 1.8', style: '平衡创作', description: '多模态优化，适合大多数创作场景' },
  'qwen': { label: 'GLM-4-7', style: '通用创作', description: '智谱通用模型，稳定可靠' },
  'kimi': { label: 'Kimi K2.5', style: '长文本', description: '超长上下文，适合保持设定一致性' },
};

// 格式化评分结果，使用 React 组件安全渲染
const formatScoreResult = (result: string): string => {
  // 仅允许安全的 HTML 标签，转义所有其他内容
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  let formatted = escapeHtml(result)
    // 安全地插入换行
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    // 仅允许有限的安全 class 列表
    .replace(/总分[：:]\s*(\d+\.?\d*)分/g, '<div class="text-2xl font-bold text-purple-600 my-4">总分：<span class="text-3xl">$1</span> 分</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-purple-700 dark:text-purple-400">$1</strong>');

  return formatted;
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterKeywords, setChapterKeywords] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState('chapters');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'writing' | 'revision' | 'foreshadowing' | 'contradiction'>('writing');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateType, setGenerateType] = useState('expand'); // 初始默认为智能扩写
  const [selectedModel, setSelectedModel] = useState('doubao');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  const [loadError, setLoadError] = useState<string | null>(null); // 添加错误状态

  // AI续写参数
  const [wordCountGoal, setWordCountGoal] = useState(500); // 续写字数目标
  const [plotDirection, setPlotDirection] = useState('continue'); // 剧情走向
  const [narrativePerspective, setNarrativePerspective] = useState('third'); // 人称视角
  const [selectedLanguageStyle, setSelectedLanguageStyle] = useState<string>('none'); // 语言风格
  const [languageStyles, setLanguageStyles] = useState(LANGUAGE_STYLES); // 语言风格列表

  // 版本管理相关状态
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  // 小说所有章节版本列表（新增）
  const [isNovelVersionDialogOpen, setIsNovelVersionDialogOpen] = useState(false);
  const [novelVersions, setNovelVersions] = useState<any[]>([]);

  // 版本对比相关状态
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [compareVersion1Id, setCompareVersion1Id] = useState<string | null>(null);
  const [compareVersion2Id, setCompareVersion2Id] = useState<string | null>(null);

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);

  // AI 生成版本管理
  const [generatedVersions, setGeneratedVersions] = useState<{
    id: string;
    model: string;
    modelName: string;
    content: string;
    timestamp: Date;
    isPartial: boolean;
    contextEnd?: string;
  }[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // 撤销替换功能
  const [previousContent, setPreviousContent] = useState('');

  // AI 打分功能
  const [isScoring, setIsScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState('');
  const [showScoreResult, setShowScoreResult] = useState(false);

  // 书名编辑功能
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // 大纲和笔记编辑功能
  const [novelOutline, setNovelOutline] = useState(''); // 小说总纲
  const [chapterOutline, setChapterOutline] = useState(''); // 章节大纲
  const [notes, setNotes] = useState(''); // 笔记
  const [isSavingOutline, setIsSavingOutline] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // 分卷管理相关状态
  const [volumes, setVolumes] = useState<any[]>([]);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [isLoadingVolumes, setIsLoadingVolumes] = useState(false);

  // 矛盾检测相关状态
  const [isCheckingContradictions, setIsCheckingContradictions] = useState(false);
  const [contradictionResult, setContradictionResult] = useState<any>(null);
  const [contradictionRecords, setContradictionRecords] = useState<any[]>([]);

  // 伏线管理相关状态
  const [showForeshadowingDialog, setShowForeshadowingDialog] = useState(false);
  const [foreshadowingItems, setForeshadowingItems] = useState<any[]>([]);
  const [isLoadingForeshadowing, setIsLoadingForeshadowing] = useState(false);
  const [editingForeshadowing, setEditingForeshadowing] = useState<any>(null);
  const [foreshadowingForm, setForeshadowingForm] = useState({
    name: '',
    description: '',
    plantedChapter: '',
    plannedResolution: '',
    relatedCharacters: [] as string[],
  });

  // 推敲面板相关状态
  const [showRevisionPanel, setShowRevisionPanel] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionPhase, setRevisionPhase] = useState<'A' | 'B' | 'C' | null>(null);
  const [revisionResult, setRevisionResult] = useState<{
    score: number;
    issues: any[];
    summary: string;
  } | null>(null);
  const [revisionRecords, setRevisionRecords] = useState<any[]>([]);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [isLoadingRevisionRecords, setIsLoadingRevisionRecords] = useState(false);
  const revisionAbortRef = useRef<AbortController | null>(null);

  // 加载伏线列表
  const loadForeshadowing = async () => {
    if (!novelId) return;
    try {
      setIsLoadingForeshadowing(true);
      const response = await fetch(`/api/novels/${novelId}/foreshadowing`);
      const result = await response.json();
      if (result.code === 200) {
        setForeshadowingItems(result.data || []);
      }
    } catch (error) {
      console.error('加载伏线失败:', error);
    } finally {
      setIsLoadingForeshadowing(false);
    }
  };

  // 加载矛盾检测记录
  const loadContradictionRecords = async () => {
    if (!novelId) return;
    try {
      const response = await fetch(`/api/novels/${novelId}/contradictions`);
      const result = await response.json();
      if (result.code === 200) {
        setContradictionRecords(result.data || []);
      }
    } catch (error) {
      console.error('加载矛盾记录失败:', error);
    }
  };

  // 运行矛盾检测
  const handleContradictionCheck = async () => {
    if (!novelId || !selectedChapter) return;
    setIsCheckingContradictions(true);
    setContradictionResult(null);
    try {
      const response = await fetch(`/api/novels/${novelId}/contradictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: selectedChapter.id,
          chapterContent: chapterContent,
        }),
      });
      const result = await response.json();
      if (result.code === 200) {
        setContradictionResult(result.data);
        loadContradictionRecords();
      } else {
        alert(result.msg || '矛盾检测失败');
      }
    } catch (error) {
      console.error('矛盾检测失败:', error);
      alert('矛盾检测失败，请稍后重试');
    } finally {
      setIsCheckingContradictions(false);
    }
  };

  // 加载推敲记录
  const loadRevisionRecords = async () => {
    if (!novelId) return;
    setIsLoadingRevisionRecords(true);
    try {
      const chapterParam = selectedChapter ? `?chapterId=${selectedChapter.id}` : '';
      const response = await fetch(`/api/novels/${novelId}/revisions${chapterParam}`);
      const result = await response.json();
      if (result.code === 200) {
        const records = result.data || [];
        setRevisionRecords(records);
        // 更新已完成阶段
        const phases = new Set<string>();
        records.forEach((r: any) => phases.add(r.phase));
        setCompletedPhases(phases);
      }
    } catch (error) {
      console.error('加载推敲记录失败:', error);
    } finally {
      setIsLoadingRevisionRecords(false);
    }
  };

  // 运行推敲阶段
  const handleRunRevision = async (phase: 'A' | 'B' | 'C') => {
    if (!novelId || !selectedChapter || !chapterContent.trim()) {
      alert('请先选择章节并输入内容');
      return;
    }
    if (isRevising) return;

    setIsRevising(true);
    setRevisionPhase(phase);
    setRevisionResult(null);
    setExpandedIssues(new Set());

    revisionAbortRef.current = new AbortController();

    try {
      const response = await fetch(`/api/novels/${novelId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: selectedChapter.id,
          chapterContent: chapterContent,
          phase: phase,
        }),
        signal: revisionAbortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`服务器返回错误：${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'result') {
                // 收到结构化结果
                setRevisionResult({
                  score: parsed.score || 0,
                  issues: parsed.issues || [],
                  summary: parsed.summary || '',
                });
                // 更新已完成阶段
                setCompletedPhases(prev => new Set([...prev, phase]));
              } else if (parsed.error) {
                console.error('推敲错误:', parsed.error);
                alert(`推敲失败: ${parsed.error}`);
              } else if (parsed.content) {
                fullContent += parsed.content;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // 刷新记录列表
      loadRevisionRecords();
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('推敲失败:', error);
        alert('推敲失败，请稍后重试');
      }
    } finally {
      setIsRevising(false);
      setRevisionPhase(null);
    }
  };

  // 切换问题展开/折叠
  const toggleIssueExpand = (index: number) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 应用建议到剪贴板
  const handleApplySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      alert('建议已复制到剪贴板');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = suggestion;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('建议已复制到剪贴板');
    });
  };

  // 删除推敲记录
  const handleDeleteRevisionRecord = async (recordId: string) => {
    if (!novelId) return;
    try {
      const response = await fetch(`/api/novels/${novelId}/revisions/${recordId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.code === 200) {
        loadRevisionRecords();
      } else {
        alert(result.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除推敲记录失败:', error);
    }
  };

  // 查看历史推敲记录
  const handleViewRevisionRecord = (record: any) => {
    setRevisionResult({
      score: record.score || 0,
      issues: record.issues || [],
      summary: record.summary || '',
    });
    setExpandedIssues(new Set());
  };

  // 创建/更新伏线
  const handleSaveForeshadowing = async () => {
    if (!novelId || !foreshadowingForm.name.trim()) {
      alert('请输入伏线名称');
      return;
    }
    try {
      if (editingForeshadowing) {
        // 更新
        const response = await fetch(`/api/novels/${novelId}/foreshadowing/${editingForeshadowing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foreshadowingForm),
        });
        const result = await response.json();
        if (result.code === 200) {
          loadForeshadowing();
          setShowForeshadowingDialog(false);
          setEditingForeshadowing(null);
        } else {
          alert(result.msg || '更新伏线失败');
        }
      } else {
        // 创建
        const response = await fetch(`/api/novels/${novelId}/foreshadowing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(foreshadowingForm),
        });
        const result = await response.json();
        if (result.code === 200) {
          loadForeshadowing();
          setShowForeshadowingDialog(false);
        } else {
          alert(result.msg || '创建伏线失败');
        }
      }
    } catch (error) {
      console.error('保存伏线失败:', error);
      alert('保存伏线失败，请稍后重试');
    }
  };

  // 删除伏线
  const handleDeleteForeshadowing = async (itemId: string) => {
    if (!novelId || !confirm('确定要删除这条伏线吗？')) return;
    try {
      const response = await fetch(`/api/novels/${novelId}/foreshadowing/${itemId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.code === 200) {
        loadForeshadowing();
      } else {
        alert(result.msg || '删除伏线失败');
      }
    } catch (error) {
      console.error('删除伏线失败:', error);
      alert('删除伏线失败，请稍后重试');
    }
  };

  // 更新伏线状态
  const handleUpdateForeshadowingStatus = async (itemId: string, status: string) => {
    if (!novelId) return;
    try {
      const response = await fetch(`/api/novels/${novelId}/foreshadowing/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.code === 200) {
        loadForeshadowing();
      }
    } catch (error) {
      console.error('更新伏线状态失败:', error);
    }
  };

  // 忽略矛盾
  const handleIgnoreContradiction = (index: number) => {
    if (!contradictionResult) return;
    const updated = { ...contradictionResult };
    updated.contradictions = updated.contradictions.filter((_: any, i: number) => i !== index);
    // 重新分组
    const grouped: Record<string, any[]> = { character: [], worldview: [], timeline: [], foreshadowing: [] };
    for (const c of updated.contradictions) {
      const type = c.type || 'unknown';
      if (grouped[type]) grouped[type].push(c);
      else grouped['character'].push(c);
    }
    updated.grouped = grouped;
    updated.total = updated.contradictions.length;
    setContradictionResult(updated);
  };

  // 标记矛盾已修复
  const handleMarkContradictionFixed = (index: number) => {
    if (!contradictionResult) return;
    const updated = { ...contradictionResult };
    updated.contradictions = updated.contradictions.filter((_: any, i: number) => i !== index);
    const grouped: Record<string, any[]> = { character: [], worldview: [], timeline: [], foreshadowing: [] };
    for (const c of updated.contradictions) {
      const type = c.type || 'unknown';
      if (grouped[type]) grouped[type].push(c);
      else grouped['character'].push(c);
    }
    updated.grouped = grouped;
    updated.total = updated.contradictions.length;
    setContradictionResult(updated);
  };

  // 打开编辑伏线对话框
  const openEditForeshadowingDialog = (item: any) => {
    setEditingForeshadowing(item);
    setForeshadowingForm({
      name: item.name || '',
      description: item.description || '',
      plantedChapter: item.planted_chapter || item.plantedChapter || '',
      plannedResolution: item.planned_resolution || item.plannedResolution || '',
      relatedCharacters: item.related_characters || item.relatedCharacters || [],
    });
    setShowForeshadowingDialog(true);
  };

  // 打开新增伏线对话框
  const openNewForeshadowingDialog = () => {
    setEditingForeshadowing(null);
    setForeshadowingForm({
      name: '',
      description: '',
      plantedChapter: '',
      plannedResolution: '',
      relatedCharacters: [],
    });
    setShowForeshadowingDialog(true);
  };

  // 切换到伏线/矛盾/推敲标签时加载数据
  useEffect(() => {
    if (rightPanelTab === 'foreshadowing') {
      loadForeshadowing();
    } else if (rightPanelTab === 'contradiction') {
      loadContradictionRecords();
    } else if (rightPanelTab === 'revision') {
      loadRevisionRecords();
    }
  }, [rightPanelTab, novelId]);

  // 【存储规则】所有数据存储必须使用数据库，禁止使用 localStorage
  // 笔记和章节大纲现在都存储在数据库中

  useEffect(() => {
    // 检查 novelId 是否有效
    if (!novelId || novelId === 'undefined' || novelId === 'null') {
      console.error('[Editor] 无效的 novelId:', { novelId });
      setLoadError('无效的小说ID');
      setTimeout(() => {
        router.push('/');
      }, 2000);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    console.log('[Editor] 开始加载小说:', { novelId });

    loadNovelFromDatabase(novelId)
      .then(loadedNovel => {
        console.log('[Editor] 加载小说成功:', { novelId, hasNovel: !!loadedNovel });

        if (!loadedNovel) {
          console.error('[Editor] 小说不存在或已被删除:', { novelId });
          setLoadError('小说不存在或已被删除');
          setTimeout(() => {
            router.push('/');
          }, 2000);
          return;
        }
        setNovel(loadedNovel);
        // 初始化小说总纲和笔记（从数据库读取）
        setNovelOutline(loadedNovel.description || '');
        setNotes(loadedNovel.notes || ''); // 笔记从数据库读取
        if (loadedNovel.chapters && loadedNovel.chapters.length > 0) {
          selectChapter(loadedNovel.chapters[0]);
        }
        // 刷新语言风格列表
        setLanguageStyles(getLanguageStyles());
        setIsLoading(false);
      })
      .catch(error => {
        console.error('[Editor] 加载小说失败:', error);
        console.error('[Editor] 错误详情:', {
          message: error.message,
          stack: error.stack,
          novelId
        });

        // 根据错误类型给出更具体的提示
        if (error.message.includes('401') || error.message.includes('未登录')) {
          setLoadError('请先登录后再访问编辑器');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else if (error.message.includes('404') || error.message.includes('小说不存在')) {
          setLoadError('小说不存在或已被删除');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setLoadError('加载小说失败，即将跳转到首页');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
        setIsLoading(false);
      });
  }, [novelId, router]);

  // 从数据库刷新小说数据的函数
  const refreshNovel = async () => {
    if (!novelId) return;
    try {
      const updatedNovel = await loadNovelFromDatabase(novelId);
      if (updatedNovel) {
        setNovel(updatedNovel);
      }
    } catch (error) {
      console.error('刷新小说数据失败:', error);
    }
  };

  // 使用 useMemo 计算字数，避免额外的 useEffect
  const wordCount = useMemo(() => chapterContent.length, [chapterContent]);

  // 加载分卷数据
  useEffect(() => {
    if (activeTab !== 'volumes' || !novelId) return;
    setIsLoadingVolumes(true);
    fetch(`/api/novels/${novelId}/volumes`)
      .then(res => res.json())
      .then(result => {
        if (result.code === 200 && result.data) {
          setVolumes(result.data);
          // 默认展开所有分卷
          const allIds = new Set((result.data as any[]).map((v: any) => v.id));
          setExpandedVolumes(allIds);
        }
      })
      .catch(error => {
        console.error('加载分卷失败:', error);
      })
      .finally(() => {
        setIsLoadingVolumes(false);
      });
  }, [activeTab, novelId]);

  const selectChapter = useCallback((chapter: Chapter) => {
    setSelectedChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterKeywords(chapter.keywords || '');
    setChapterContent(chapter.content);
    setChapterOutline(chapter.outline || ''); // 从数据库加载章节大纲
    setGeneratedContent('');
  }, []);

  // 保存书名
  const handleSaveTitle = async () => {
    if (!novel || !editingTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    const newTitle = editingTitle.trim();
    if (newTitle === novel.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      const result = await response.json();
      if (result.code === 200) {
        setNovel({ ...novel, title: newTitle });
        setIsEditingTitle(false);
        console.log('[Editor] 书名保存成功:', newTitle);
      } else {
        alert(result.msg || '保存书名失败');
        setEditingTitle(novel.title);
      }
    } catch (error) {
      console.error('[Editor] 保存书名失败:', error);
      alert('保存书名失败，请稍后重试');
      setEditingTitle(novel.title);
    }
  };

  // 开始编辑书名
  const handleStartEditTitle = () => {
    setEditingTitle(novel?.title || '');
    setIsEditingTitle(true);
  };

  // 保存小说总纲
  const handleSaveNovelOutline = async () => {
    if (!novel) return;
    
    setIsSavingOutline(true);
    try {
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: novelOutline }),
      });

      const result = await response.json();
      if (result.code === 200) {
        setNovel({ ...novel, description: novelOutline });
        console.log('[Editor] 小说总纲保存成功');
      } else {
        alert(result.msg || '保存失败');
      }
    } catch (error) {
      console.error('[Editor] 保存小说总纲失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setIsSavingOutline(false);
    }
  };

  // 保存笔记（数据库存储）
  const handleSaveNotes = async () => {
    if (!novel) return;
    
    setIsSavingNotes(true);
    try {
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes }),
      });

      const result = await response.json();
      if (result.code === 200) {
        setNovel({ ...novel, notes: notes });
        console.log('[Editor] 笔记保存成功');
      } else {
        alert(result.msg || '保存失败');
      }
    } catch (error) {
      console.error('[Editor] 保存笔记失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // 保存章节大纲（数据库存储）
  const handleSaveChapterOutline = async () => {
    if (!selectedChapter || !novelId) return;
    // 调用章节保存，大纲会一起保存到数据库
    await handleSaveChapter();
    console.log('[Editor] 章节大纲已保存到数据库');
  };

  // 清空大纲
  const handleClearNovelOutline = async () => {
    if (confirm('确定要清空小说总纲吗？此操作无法撤销。')) {
      setNovelOutline('');
      // 同时清空数据库中的总纲
      if (novel) {
        try {
          await fetch(`/api/novels/${novel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: '' }),
          });
          console.log('[Editor] 小说总纲已清空');
        } catch (error) {
          console.error('[Editor] 清空小说总纲失败:', error);
        }
      }
    }
  };

  const handleClearChapterOutline = async () => {
    if (confirm('确定要清空当前章节大纲吗？此操作无法撤销。')) {
      setChapterOutline('');
      // 同时清空数据库中的章节大纲
      if (selectedChapter && novel) {
        try {
          const updatedChapters = novel.chapters.map(ch =>
            ch.id === selectedChapter.id ? { ...ch, outline: '' } : ch
          );
          await fetch(`/api/novels/${novel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapters: updatedChapters }),
          });
          console.log('[Editor] 章节大纲已清空');
        } catch (error) {
          console.error('[Editor] 清空章节大纲失败:', error);
        }
      }
    }
  };

  // 清空笔记
  const handleClearNotes = async () => {
    if (confirm('确定要清空笔记吗？此操作无法撤销。')) {
      setNotes('');
      // 同时清空数据库中的笔记
      if (novel) {
        try {
          await fetch(`/api/novels/${novel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: '' }),
          });
          console.log('[Editor] 笔记已清空');
        } catch (error) {
          console.error('[Editor] 清空笔记失败:', error);
        }
      }
    }
  };

  // 导出功能
  const handleExport = async (format: 'txt' | 'docx') => {
    if (!novel) return;

    if (format === 'txt') {
      // 导出为 TXT 格式
      let content = `${novel.title}\n`;
      content += `类型: ${novel.genre}\n`;
      content += `简介: ${novel.description || ''}\n`;
      content += `\n${'='.repeat(50)}\n\n`;

      // 按章节顺序导出
      const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);
      sortedChapters.forEach((chapter) => {
        content += `${chapter.title}\n`;
        content += `${'-'.repeat(30)}\n`;
        content += `${chapter.content}\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${novel.title}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'docx') {
      // 导出为 Word 格式
      try {
        // 使用简单的 HTML 转 Word 方法
        let content = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <title>${novel.title}</title>
            <style>
              body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; line-height: 1.6; }
              h1 { text-align: center; color: #333; margin-bottom: 20px; }
              .info { color: #666; margin-bottom: 30px; }
              .separator { text-align: center; margin: 30px 0; color: #999; }
              .chapter-title { font-size: 20px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #333; }
              .chapter-content { text-indent: 2em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>${novel.title}</h1>
            <div class="info">
              <p><strong>类型：</strong>${novel.genre}</p>
              <p><strong>简介：</strong>${novel.description || '暂无简介'}</p>
            </div>
            <div class="separator">═══════════════════════════════════════════════════</div>
        `;

        // 按章节顺序导出
        const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);
        sortedChapters.forEach((chapter) => {
          content += `
            <div class="chapter-title">${chapter.title}</div>
            <div class="chapter-content">${chapter.content.replace(/\n/g, '<br>')}</div>
          `;
        });

        content += `
          </body>
          </html>
        `;

        // 创建 Blob 对象
        const blob = new Blob([content], { 
          type: 'application/msword' 
        });
        
        // 下载文件
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${novel.title}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('导出 Word 失败:', error);
        alert('导出 Word 失败，请重试');
      }
    }
  };

  // 导入功能
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;

        if (file.name.endsWith('.json')) {
          // 导入 JSON 格式
          const importedNovel = JSON.parse(content);
          
          // 通过 API 保存到数据库
          const response = await fetch('/api/novels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: importedNovel.title || '导入的小说',
              description: importedNovel.description || '',
              genre: importedNovel.genre || '未分类',
              chapters: importedNovel.chapters || [],
              characters: importedNovel.characters || [],
              worldSettings: importedNovel.worldSettings || [],
            }),
          });

          const result = await response.json();
          
          if (result.code === 200) {
            alert('导入成功！即将跳转到导入的小说...');
            router.push(`/novel/${result.data.id}/editor`);
          } else {
            alert(result.msg || '导入失败');
          }
        } else if (file.name.endsWith('.txt')) {
          // 导入 TXT 格式
          alert('TXT 导入功能正在开发中，请使用 JSON 格式进行导入。');
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式。');
      }
    };
    reader.readAsText(file);
    // 重置 input 以便重复导入同一文件
    event.target.value = '';
  };

  // 全屏模式
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`全屏失败: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 键盘事件监听，用于快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z 或 Cmd+Z 撤销替换
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && previousContent) {
        e.preventDefault();
        handleUndoReplace();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previousContent]);

  const handleSaveChapter = useCallback(async () => {
    if (!selectedChapter || !novel) {
      console.error('保存失败：没有选中的章节或小说', { selectedChapter, novel });
      return;
    }

    console.log('开始保存章节...', {
      chapterId: selectedChapter.id,
      title: chapterTitle,
      contentLength: chapterContent.length,
      outlineLength: chapterOutline.length
    });

    setIsSaving(true);

    const updatedChapter: Chapter = {
      ...selectedChapter,
      title: chapterTitle,
      keywords: chapterKeywords,
      content: chapterContent,
      outline: chapterOutline, // 包含章节大纲
      updatedAt: new Date().toISOString(),
    };

    console.log('更新章节数据:', updatedChapter);

    try {
      // 更新章节列表
      const updatedChapters = novel.chapters.map(ch =>
        ch.id === updatedChapter.id ? updatedChapter : ch
      );

      // 调用 API 保存
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: updatedChapters,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || '保存失败');
      }

      // 更新本地状态
      const updatedNovel = {
        ...novel,
        chapters: result.data.chapters || updatedChapters,
      };
      setNovel(updatedNovel);
      setSelectedChapter(updatedChapter);
      setLastSavedTime(new Date());

      console.log('保存完成', {
        novelId: novel.id,
        chapterId: updatedChapter.id,
        savedChapterTitle: result.data.chapters?.find((c: any) => c.id === updatedChapter.id)?.title,
      });
    } catch (error) {
      console.error('保存章节失败:', error);
      alert('保存失败，请重试');
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    }
  }, [selectedChapter, novel, chapterTitle, chapterKeywords, chapterContent, chapterOutline]);

  const handleGenerate = useCallback(async () => {
    // 检查小说是否已加载
    if (!novel) {
      setGeneratedContent('❌ 小说信息未加载完成\n\n请稍等片刻或刷新页面后重试');
      return;
    }

    if (isGenerating) return;

    setIsGenerating(true);
    setGeneratedContent('');

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    let generatedText = '';

    // 根据生成类型构建提示词
    let effectivePrompt = generatePrompt;
    if (generateType === 'polish' || generateType === 'expand' || generateType === 'remove-ai-trace') {
      // 润色、智能扩写、除AI痕迹功能：直接使用章节内容
      effectivePrompt = chapterContent || '请提供需要处理的内容';
      if (!effectivePrompt.trim()) {
        alert('请先输入需要处理的内容');
        setIsGenerating(false);
        return;
      }
    } else if (!generatePrompt.trim()) {
      // 其他功能如果没有提示词，使用默认提示词
      const defaultPrompts: Record<string, string> = {
        'continue': '请根据上文继续续写，保持情节连贯和人物性格一致',
        'chapter': '请创作这个章节的内容',
        'outline': '请为小说生成大纲',
        'plot': '请提供剧情发展建议',
      };
      effectivePrompt = defaultPrompts[generateType] || generatePrompt;
    }

    try {
      const response = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: generateType,
          model: selectedModel,
          prompt: effectivePrompt,
          languageStyle: selectedLanguageStyle, // 添加语言风格参数
          wordCountGoal: wordCountGoal,
          plotDirection: plotDirection,
          narrativePerspective: narrativePerspective,
          context: {
            novelId: novel.id,
            chapterId: selectedChapter?.id,
            chapterTitle: selectedChapter?.title,
            chapterKeywords: selectedChapter?.keywords || '',
            previousContent: generateType === 'polish' ? '' : chapterContent, // 润色时不把内容作为 previousContent
            characters: novel.characters,
            worldSettings: novel.worldSettings,
            chapterCount: novel.chapters.length,
            genre: novel.genre,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`服务器返回错误：${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setIsGenerating(false);
                // 生成完成后保存到版本列表
                saveGeneratedVersion(generatedText, selectedModel);
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  // 服务器返回错误
                  console.error('AI generation error:', parsed.error);
                  setGeneratedContent(`❌ 生成失败：${parsed.error}\n\n${parsed.details || ''}`);
                  setIsGenerating(false);
                  break;
                }
                if (parsed.content) {
                  const chunk = parsed.content;
                  generatedText += chunk;
                  setGeneratedContent(generatedText);
                }
              } catch (e) {}
            }
          }
        }
      } catch (readError) {
        // 检查是否是被中止的
        if (readError instanceof Error && readError.name === 'AbortError') {
          console.log('生成已被用户停止');
          if (generatedText.trim()) {
            // 即使被中止，如果有部分内容也保存到版本列表
            saveGeneratedVersion(generatedText, selectedModel, true);
          }
        } else {
          throw readError;
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);

      // 向用户显示详细的错误信息
      let errorMessage = '❌ 生成失败\n\n';

      if (error instanceof Error) {
        errorMessage += `错误信息：${error.message}\n\n`;

        // 根据错误类型提供更有针对性的建议
        if (error.message.includes('fetch')) {
          errorMessage += '可能原因：\n';
          errorMessage += '1. 网络连接问题\n';
          errorMessage += '2. 服务器暂时不可用\n';
          errorMessage += '3. 请检查网络连接后重试';
        } else if (error.message.includes('No reader')) {
          errorMessage += '可能原因：服务器返回了空的响应\n';
          errorMessage += '建议：请稍后重试或联系管理员';
        } else if (error.name === 'AbortError') {
          errorMessage = '⏸️ 生成已停止';
        } else {
          errorMessage += '建议：\n';
          errorMessage += '1. 请稍后重试\n';
          errorMessage += '2. 检查输入内容是否符合要求\n';
          errorMessage += '3. 如果问题持续，请联系管理员';
        }
      } else {
        errorMessage += '未知错误，请稍后重试';
      }

      setGeneratedContent(errorMessage);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [novel, isGenerating, generatePrompt, generateType, chapterContent, selectedChapter, selectedModel, selectedLanguageStyle, wordCountGoal, plotDirection, narrativePerspective]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('用户请求停止生成');
    }
  };

  // 保存生成的版本
  const saveGeneratedVersion = (content: string, model: string, isPartial: boolean = false) => {
    interface GeneratedVersion {
      id: string;
      model: string;
      modelName: string;
      content: string;
      timestamp: Date;
      isPartial: boolean;
      contextEnd?: string; // 原文衔接点
    }

    const modelNameMap: Record<string, string> = {
      'doubao': '豆包 Seed 1.8',
      'qwen': 'GLM-4-7',
      'kimi': 'Kimi K2.5'
    };

    // 提取原文最后30字作为衔接点
    let contextEnd = '';
    if (chapterContent && chapterContent.length > 0) {
      contextEnd = chapterContent.slice(-30);
    }

    const newVersion: GeneratedVersion = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model: model,
      modelName: modelNameMap[model] || model,
      content: content,
      timestamp: new Date(),
      isPartial: isPartial,
      contextEnd: contextEnd
    };

    // 如果已有3个版本，删除最旧的
    const updatedVersions = [...generatedVersions, newVersion];
    if (updatedVersions.length > 3) {
      updatedVersions.shift(); // 删除第一个（最旧的）
    }

    setGeneratedVersions(updatedVersions);
    setSelectedVersionId(newVersion.id);
    setGeneratedContent(content);
    
    console.log('[Editor] 保存生成版本:', {
      versionId: newVersion.id,
      modelName: newVersion.modelName,
      contentLength: content.length,
      totalVersions: updatedVersions.length,
      isPartial
    });
  };

  // 选择版本
  const handleSelectVersion = (versionId: string) => {
    const version = generatedVersions.find(v => v.id === versionId);
    if (version) {
      setSelectedVersionId(versionId);
      setGeneratedContent(version.content);
      console.log('[Editor] 选择版本:', {
        versionId,
        modelName: version.modelName,
        contentLength: version.content.length
      });
    }
  };

  // 应用版本到章节内容
  const handleApplyVersion = (versionId: string, mode: 'append' | 'replace') => {
    const version = generatedVersions.find(v => v.id === versionId);
    if (!version) return;

    if (mode === 'append') {
      setChapterContent(prev => prev + '\n\n' + version.content);
    } else {
      setChapterContent(version.content);
    }

    setGeneratedContent('');
    handleSaveChapter();
    
    console.log('[Editor] 应用版本:', {
      versionId,
      mode,
      modelName: version.modelName
    });
  };

  // 删除版本
  const handleDeleteVersion = (versionId: string) => {
    const updatedVersions = generatedVersions.filter(v => v.id !== versionId);
    setGeneratedVersions(updatedVersions);

    // 如果删除的是当前选中的版本，清除选中状态
    if (selectedVersionId === versionId) {
      setSelectedVersionId(null);
      setGeneratedContent('');
    }

    console.log('[Editor] 删除版本:', {
      versionId,
      remainingVersions: updatedVersions.length
    });
  };

  // 打开版本对比对话框
  const handleOpenCompareDialog = () => {
    if (generatedVersions.length < 2) {
      alert('需要至少2个版本才能进行对比');
      return;
    }
    // 默认选择最近的两个版本
    setCompareVersion1Id(generatedVersions[generatedVersions.length - 2].id);
    setCompareVersion2Id(generatedVersions[generatedVersions.length - 1].id);
    setIsCompareDialogOpen(true);
  };

  const handleAddGeneratedContent = () => {
    setChapterContent(prev => prev + '\n\n' + generatedContent);
    setGeneratedContent('');
    handleSaveChapter();
  };

  const handleReplaceContent = () => {
    // 保存当前内容，用于撤销
    setPreviousContent(chapterContent);
    setChapterContent(generatedContent);
    setGeneratedContent('');
    handleSaveChapter();
  };

  const handleUndoReplace = () => {
    // 恢复替换前的内容
    setChapterContent(previousContent);
    setGeneratedContent('');
    handleSaveChapter();
  };

  // AI 打分处理函数
  const handleAIScoring = async () => {
    if (!chapterContent || chapterContent.trim().length < 100) {
      alert('章节内容太短，请先输入至少100字的内容再进行打分');
      return;
    }

    setIsScoring(true);
    setShowScoreResult(false);

    const scoringPrompt = `你现在扮演起点中文网资深编辑，对用户提交的网文单章进行**100分制严格打分**。请务必按以下**10个细分维度**逐项评分（每项0-10分，总分100），评分时必须结合**爆品网文的商业标准**。

**评分规则：**
1. **只看本章**，不考虑前文铺垫。
2. **扣分必须具体**：每项得分后，紧接着列出1-2个**具体扣分点**，不能只说"不好"。
3. **必须给改法**：每项扣分后，紧跟一条**可直接执行的修改建议**（告诉用户具体删/改哪句、加什么情节）。
4. **结论要明确**：最后给出总分，并判断本章是**"黄金开篇/合格章节/需重写/弃文"**四个等级之一。

**评分维度（请严格遵守）：**
1. **黄金三章钩子（开篇30秒留存）**
   - 打分点：主角/金手指/冲突/目标，是否在开篇300字内全部出现？
   - 扣分点：开篇慢热、大段介绍、没出现金手指、主角模糊。
   - 改法：直接删掉前2段介绍性文字，把第3段的冲突提前到第1段开头。

2. **节奏密度（每章信息量）**
   - 打分点：本章是否有**新事件/新反转/新信息**？有无灌水对话？
   - 扣分点：全章只有情绪铺垫、无剧情推进；对话灌水超过30%。
   - 改法：删掉2句无意义闲聊，替换为一段主角获取新资源/遭遇新危机的情节。

3. **主角行动力（人设核心）**
   - 打分点：主角是否**果断解决问题**？有无圣母/墨迹/降智表现？
   - 扣分点：主角遇事先抱怨、犹豫；行为不符合其性格设定。
   - 改法：将主角的"纠结心理活动"改为**直接执行的动作**，比如把"他很生气"改成"他直接一掌拍碎桌子"。

4. **金手指（爽点引擎）**
   - 打分点：金手指功能是否清晰？使用后是否有**立刻可见的变强/打脸**？
   - 扣分点：设定复杂难懂；用了没效果，单纯当工具。
   - 改法：增加一句"使用金手指后，主角某项数值暴涨/获得特殊道具"，让读者直观看到变强。

5. **爽点强度（情绪价值）**
   - 打分点：是否有**先抑后扬/打脸/逆袭**？爽点是否兑现？
   - 扣分点：只有憋屈没有反击；打脸不痛不痒。
   - 改法：强化反派的嚣张，然后让主角**一招定胜负**，特写反派的震惊表情。

6. **悬念与结尾（追读率）**
   - 打分点：章节结尾是否留下**钩子**？是否让读者想点开下一章？
   - 扣分点：结尾平淡，无期待感；直接结束无悬念。
   - 改法：在本章最后一句抛出危机（如"身后传来了脚步声"/"系统突然发布紧急任务"），强制读者看下一章。

7. **配角功能（工具人合格度）**
   - 打分点：配角是否**服务主线**？是否抢戏？是否膈应读者？
   - 扣分点：配角无意义；突然反水；行为逻辑崩坏。
   - 改法：删减配角多余戏份，让其只保留**推动主角剧情**的核心作用（比如递消息、送装备）。

8. **逻辑自洽（不崩设定）**
   - 打分点：本章情节是否符合前文设定？是否有降智操作？
   - 扣分点：前后设定矛盾；主角开无双、不合理开挂。
   - 改法：检查前后设定，将不合理的情节改为**符合设定的操作**，比如给主角的爆发加一个合理的冷却时间或前提条件。

9. **叙事文笔（阅读体验）**
   - 打分点：句子是否短小精悍？画面感是否强？是否流畅易读？
   - 扣分点：长句堆砌；文笔晦涩；无画面感。
   - 改法：把长句拆成短句，多用动词，少用形容词，直接描写动作和场景。

10. **商业适配度（签约价值）**
    - 打分点：是否符合主流频道口味？是否适合上架推荐？
    - 扣分点：题材小众且无创新；风格与频道不符。
    - 改法：根据目标频道（如玄幻、都市），调整爽点类型和文风，使其更贴合该频道读者偏好。

**【单章打分】**
请对以下章节内容进行打分：

章节标题：${chapterTitle || '无标题'}
章节关键词：${chapterKeywords || '无'}

章节内容：
${chapterContent}`;

    try {
      if (!novel) {
        throw new Error('小说数据未加载');
      }

      const response = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'polish',
          prompt: scoringPrompt,
          model: selectedModel,
          context: {
            novelId: novel.id,
            chapterId: selectedChapter?.id,
            chapterTitle: chapterTitle,
            chapterKeywords: chapterKeywords
          }
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullScore = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullScore += parsed.content;
                  setScoreResult(fullScore);
                  setShowScoreResult(true);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[AI Scoring] 错误:', error);
      alert('AI 打分失败，请重试');
    } finally {
      setIsScoring(false);
    }
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  const handleDeleteChapter = (chapterId: string) => {
    setChapterToDelete(chapterId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!novel || !chapterToDelete) return;

    console.log('[Editor] 删除章节:', { chapterId: chapterToDelete, novelId: novel.id });

    try {
      // 调用 API 删除章节
      const updatedChapters = novel.chapters.filter(ch => ch.id !== chapterToDelete);
      
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: updatedChapters,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || '删除章节失败');
      }
      
      // 更新本地状态
      const updatedNovel = {
        ...novel,
        chapters: result.data.chapters || updatedChapters,
      };
      setNovel(updatedNovel);
      
      if (updatedNovel.chapters && updatedNovel.chapters.length > 0) {
        selectChapter(updatedNovel.chapters[0]);
      } else {
        setSelectedChapter(null);
        setChapterTitle('');
        setChapterContent('');
      }
      
      console.log('[Editor] 章节删除成功', {
        novelId: novel.id,
        chapterId: chapterToDelete,
        remainingChapters: updatedNovel.chapters.length,
      });
    } catch (error) {
      console.error('[Editor] 删除章节失败:', error);
      alert('删除章节失败，请重试');
    }

    // 关闭对话框
    setDeleteConfirmOpen(false);
    setChapterToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setChapterToDelete(null);
  };

  const handleCreateChapter = async () => {
    if (!novel) return;

    console.log('[Editor] 创建新章节...');

    // 找到当前最大的order值
    const maxOrder = novel.chapters.length > 0
      ? Math.max(...novel.chapters.map(c => c.order))
      : 0;

    const newChapter: Chapter = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      novelId: novel.id,
      title: `第${maxOrder + 1}章 新章节`,
      content: '',
      order: maxOrder + 1,
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[Editor] 新章节数据:', newChapter);

    try {
      // 调用 API 保存新章节
      const updatedChapters = [...novel.chapters, newChapter];
      
      const response = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapters: updatedChapters,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || '创建章节失败');
      }
      
      // 更新本地状态
      const updatedNovel = {
        ...novel,
        chapters: result.data.chapters || updatedChapters,
      };
      setNovel(updatedNovel);
      selectChapter(newChapter);
      
      console.log('[Editor] 章节创建成功', {
        novelId: novel.id,
        chapterId: newChapter.id,
        chapterCount: updatedNovel.chapters.length,
      });
    } catch (error) {
      console.error('[Editor] 章节创建失败:', error);
      alert('创建章节失败，请重试');
    }
  };

  // 版本管理相关函数（暂时禁用，因为数据已迁移到数据库）
  const handleSaveVersion = async () => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  const handleViewVersions = () => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  // 查看小说所有章节版本（新增）
  const handleViewNovelVersions = () => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  const handleRestoreVersion = async (version: number) => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  // 恢复小说所有章节版本（新增）
  const handleRestoreNovelVersion = async (versionId: string) => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  // 删除小说版本（新增）
  const handleDeleteNovelVersion = (versionId: string) => {
    alert('版本管理功能暂不可用，数据已迁移到数据库');
  };

  const getGenerateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'outline': '生成大纲',
      'chapter': '生成章节',
      'polish': '全文润色',
      'plot': '剧情建议',
      'cool': '爽文开篇',
      'expand': '智能扩写',
      'remove-ai-trace': '除AI痕迹',
    };
    return labels[type] || type;
  };

  // 加载动画组件
  const LoadingPage = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950/30">
      <div className="relative">
        {/* 主加载圈 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
        {/* 内部装饰圈 */}
        <div className="absolute inset-4 border-4 border-pink-200 dark:border-pink-800 rounded-full animate-pulse"></div>
        {/* 文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
              正在加载编辑器...
            </p>
          </div>
        </div>
      </div>
      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        神的小说工坊 · AI 创作工作台
      </p>
      {loadError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        </div>
      )}
    </div>
  );

  // 如果正在加载或没有小说数据，显示加载页面
  if (isLoading || !novel) {
    return <LoadingPage />;
  }

  return (
    <>
      {/* 版本历史对话框 */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>章节版本历史</DialogTitle>
            <DialogDescription>
              当前章节: {selectedChapter?.title} (版本 {selectedChapter?.version || 1})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无版本历史</p>
                <p className="text-sm mt-2">保存章节后，系统会自动创建版本快照</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v, index) => (
                  <div
                    key={v.version}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      v.version === selectedChapter?.version
                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={v.version === selectedChapter?.version ? 'default' : 'outline'}>
                          版本 {v.version}
                        </Badge>
                        {v.version === selectedChapter?.version && (
                          <span className="text-xs text-purple-600 dark:text-purple-400">当前版本</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreVersion(v.version)}
                        disabled={v.version === selectedChapter?.version}
                      >
                        恢复此版本
                      </Button>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{v.title}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {v.keywords && `关键词: ${v.keywords} · `}
                        更新时间: {new Date(v.updatedAt).toLocaleString('zh-CN')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        内容长度: {v.content?.length || 0} 字符
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsVersionDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 小说所有章节版本历史对话框（新增） */}
      <Dialog open={isNovelVersionDialogOpen} onOpenChange={setIsNovelVersionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>小说所有章节版本历史</DialogTitle>
            <DialogDescription>
              当前小说: {novel?.title}（共 {novel?.chapters.length || 0} 个章节）
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto">
            {novelVersions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无版本历史</p>
                <p className="text-sm mt-2">点击"保存版本"可保存当前所有章节的快照</p>
              </div>
            ) : (
              <div className="space-y-3">
                {novelVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {v.versionName}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(v.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreNovelVersion(v.id)}
                        >
                          恢复
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNovelVersion(v.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">
                        {v.chapters.length} 个章节 · {v.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsNovelVersionDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本对比对话框 */}
      <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>版本对比</DialogTitle>
            <DialogDescription>
              对比不同 AI 模型生成的版本，选择最适合的内容
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* 版本1选择和展示 */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="mb-2">
                <Label className="text-sm font-medium mb-2 block">选择版本1</Label>
                <Select value={compareVersion1Id || ''} onValueChange={setCompareVersion1Id}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {generatedVersions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.modelName} - {new Date(version.timestamp).toLocaleTimeString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card className="flex-1 min-h-0 overflow-hidden">
                <CardHeader className="py-2 px-3 bg-gray-50 dark:bg-gray-800">
                  <CardTitle className="text-sm">
                    {compareVersion1Id && (() => {
                      const version = generatedVersions.find(v => v.id === compareVersion1Id);
                      return version ? `${version.modelName} - ${new Date(version.timestamp).toLocaleTimeString()}` : '版本1';
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {compareVersion1Id && (() => {
                      const version = generatedVersions.find(v => v.id === compareVersion1Id);
                      return version ? version.content : '请选择一个版本';
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 版本2选择和展示 */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="mb-2">
                <Label className="text-sm font-medium mb-2 block">选择版本2</Label>
                <Select value={compareVersion2Id || ''} onValueChange={setCompareVersion2Id}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {generatedVersions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.modelName} - {new Date(version.timestamp).toLocaleTimeString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card className="flex-1 min-h-0 overflow-hidden">
                <CardHeader className="py-2 px-3 bg-gray-50 dark:bg-gray-800">
                  <CardTitle className="text-sm">
                    {compareVersion2Id && (() => {
                      const version = generatedVersions.find(v => v.id === compareVersion2Id);
                      return version ? `${version.modelName} - ${new Date(version.timestamp).toLocaleTimeString()}` : '版本2';
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {compareVersion2Id && (() => {
                      const version = generatedVersions.find(v => v.id === compareVersion2Id);
                      return version ? version.content : '请选择一个版本';
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (compareVersion1Id) {
                  handleApplyVersion(compareVersion1Id, 'append');
                  setIsCompareDialogOpen(false);
                }
              }}
              disabled={!compareVersion1Id}
            >
              应用版本1
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (compareVersion2Id) {
                  handleApplyVersion(compareVersion2Id, 'append');
                  setIsCompareDialogOpen(false);
                }
              }}
              disabled={!compareVersion2Id}
            >
              应用版本2
            </Button>
            <Button onClick={() => setIsCompareDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 打分结果对话框 */}
      <Dialog open={showScoreResult} onOpenChange={setShowScoreResult}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  AI 网文评分报告
                </DialogTitle>
                <DialogDescription className="mt-2">
                  基于起点中文网编辑标准，对章节进行多维度专业评分
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scoreResult) {
                      navigator.clipboard.writeText(scoreResult);
                      // 简单的视觉反馈
                      alert('已复制评分报告');
                    }
                  }}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  复制报告
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50/50 dark:from-gray-900 dark:to-purple-900/20">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-full prose prose-sm dark:prose-invert max-w-none">
              {scoreResult ? (
                <div dangerouslySetInnerHTML={{ __html: formatScoreResult(scoreResult) }} />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">正在生成评分报告...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                使用模型: <span className="font-semibold text-purple-600 dark:text-purple-400">{modelStyles[selectedModel]?.label}</span>
              </span>
              {scoreResult && (
                <span className="text-xs text-gray-500">
                  报告长度: <span className="font-semibold">{scoreResult.length}</span> 字
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (scoreResult) {
                    navigator.clipboard.writeText(scoreResult);
                    alert('已复制评分报告');
                  }
                }}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                复制报告
              </Button>
              <Button onClick={() => setShowScoreResult(false)}>关闭</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 主内容 */}
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 overflow-hidden">
        {/* 顶部工具栏 - 现代化设计，增强阴影和层次感 */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm flex items-center justify-between px-4 flex-shrink-0">
        {/* 左侧：返回、标题、字数统计 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-4">
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="h-7 w-48 text-base font-semibold px-2 py-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleSaveTitle}
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setIsEditingTitle(false)}
                  >
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1 cursor-pointer group"
                  onClick={handleStartEditTitle}
                  title="点击编辑书名"
                >
                  <h1 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {novel.title}
                  </h1>
                  <Edit2 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">{novel.genre} · {novel.chapters.length} 章节</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-purple-600 dark:text-purple-400">{wordCount}</span> 字
            </div>
          </div>
        </div>

        {/* 中间：AI 生成核心功能 */}
        <div className="flex items-center gap-2 flex-1 justify-center max-w-2xl">
          {/* 模型选择 */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doubao">
                <div className="flex flex-col">
                  <span className="font-medium">豆包 Seed 1.8</span>
                  <span className="text-xs text-gray-500">平衡创作</span>
                </div>
              </SelectItem>
              <SelectItem value="qwen">
                <div className="flex flex-col">
                  <span className="font-medium">GLM-4-7</span>
                  <span className="text-xs text-gray-500">通用创作</span>
                </div>
              </SelectItem>
              <SelectItem value="kimi">
                <div className="flex flex-col">
                  <span className="font-medium">Kimi K2.5</span>
                  <span className="text-xs text-gray-500">长文本</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* 生成类型 */}
          <Select value={generateType} onValueChange={setGenerateType}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chapter">生成章节</SelectItem>
              <SelectItem value="polish">全文润色</SelectItem>
              <SelectItem value="expand">智能扩写</SelectItem>
              <SelectItem value="remove-ai-trace">除AI痕迹</SelectItem>
              <SelectItem value="outline">生成大纲</SelectItem>
              <SelectItem value="plot">剧情建议</SelectItem>
              <SelectItem value="cool">爽文开篇</SelectItem>
            </SelectContent>
          </Select>

          {/* 参数控制（使用下拉菜单） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                <Settings className="h-3.5 w-3.5" />
                <span className="text-xs">参数</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>生成参数</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* 字数控制 */}
              <div className="px-2 py-2">
                <Label className="text-xs mb-1 block">目标字数</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={50}
                    max={10000}
                    step={1}
                    value={wordCountGoal}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 允许输入框为空，方便用户修改
                      if (value === '') {
                        setWordCountGoal(500); // 恢复默认值
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          setWordCountGoal(numValue);
                        }
                      }
                    }}
                    className="h-8 text-sm"
                    placeholder="请输入目标字数"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">字</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  AI将严格按此字数生成，误差控制在10%以内
                </p>
              </div>
              
              {/* 剧情走向 */}
              <div className="px-2 py-2">
                <Label className="text-xs mb-1 block">剧情走向</Label>
                <Select value={plotDirection} onValueChange={setPlotDirection}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continue">自然续写</SelectItem>
                    <SelectItem value="climax">爽点爆发</SelectItem>
                    <SelectItem value="foreshadowing">剧情铺垫</SelectItem>
                    <SelectItem value="twist">反转</SelectItem>
                    <SelectItem value="subplot">支线展开</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 人称视角 */}
              <div className="px-2 py-2">
                <Label className="text-xs mb-1 block">人称视角</Label>
                <Select value={narrativePerspective} onValueChange={setNarrativePerspective}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">第一人称</SelectItem>
                    <SelectItem value="third">第三人称</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 生成按钮 */}
          {isGenerating ? (
            <Button
              size="sm"
              onClick={handleStopGeneration}
              variant="destructive"
              className="h-8 px-4 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span className="text-xs">停止</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-8 px-4 gap-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">{getGenerateTypeLabel(generateType)}</span>
            </Button>
          )}
        </div>

        {/* 右侧：保存和更多操作 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 角色管理按钮 */}
          <Link href={`/novel/${novel.id}/characters`}>
            <Button variant="outline" size="sm" className="h-8 px-3 gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">角色管理</span>
              {novel.characters && novel.characters.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                  {novel.characters.length}
                </Badge>
              )}
            </Button>
          </Link>

          {/* 世界观按钮 */}
          <Link href={`/novel/${novel.id}/world`}>
            <Button variant="outline" size="sm" className="h-8 px-3 gap-1">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs">世界观</span>
              {novel.worldSettings && Object.keys(novel.worldSettings).length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                  {Object.keys(novel.worldSettings).length}
                </Badge>
              )}
            </Button>
          </Link>

          {/* 情节设定按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={() => router.push(`/novel/${novelId}/plot`)}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs">情节设定</span>
          </Button>

          {/* 分卷大纲按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={() => router.push(`/novel/${novelId}/volumes`)}
          >
            <BookMarked className="h-3.5 w-3.5" />
            <span className="text-xs">分卷大纲</span>
          </Button>

          {/* AI 打分按钮 */}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={handleAIScoring}
            disabled={isScoring || !chapterContent}
          >
            {isScoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">{isScoring ? '打分中' : 'AI 打分'}</span>
          </Button>

          {/* 保存按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={handleSaveChapter}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">{isSaving ? '保存中' : '保存'}</span>
          </Button>

          {/* 推敲按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={() => {
              setShowRevisionPanel(!showRevisionPanel);
              if (!showRevisionPanel) {
                setAiPanelOpen(true);
              }
            }}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="text-xs">推敲</span>
          </Button>

          {/* 矛盾检测按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={handleContradictionCheck}
            disabled={isCheckingContradictions || !selectedChapter}
          >
            {isCheckingContradictions ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">{isCheckingContradictions ? '检测中...' : '矛盾检测'}</span>
          </Button>

          {/* 伏线管理按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1"
            onClick={openNewForeshadowingDialog}
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="text-xs">伏线</span>
          </Button>

          {/* 更多操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>导航</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/novels" className="cursor-pointer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  我的小说
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/novel/${novel.id}`} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  项目详情
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />

              <DropdownMenuLabel>版本管理</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleSaveVersion} disabled={!novel}>
                <Save className="h-4 w-4 mr-2" />
                保存版本
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewNovelVersions} disabled={!novel}>
                <History className="h-4 w-4 mr-2" />
                版本历史
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>功能</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAiPanelOpen(!aiPanelOpen)}>
                <Wand2 className="h-4 w-4 mr-2" />
                {aiPanelOpen ? '隐藏' : '显示'} AI 助手
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>工具</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport('txt')}>
                <Download className="h-4 w-4 mr-2" />
                导出 TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')}>
                <Database className="h-4 w-4 mr-2" />
                导出 Word
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                导入
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 mr-2" />
                ) : (
                  <Maximize2 className="h-4 w-4 mr-2" />
                )}
                {isFullscreen ? '退出全屏' : '全屏'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 隐藏的文件输入 */}
          <input
            type="file"
            id="import-file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 左侧边栏 - 增强卡片效果和阴影 */}
        <aside
          className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm shadow-sm transition-all duration-300 relative ${
            sidebarCollapsed ? 'w-12' : 'w-72'
          }`}
        >
          {!sidebarCollapsed && (
            <div className="h-full flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="p-3 border-b flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-4 h-8">
                    <TabsTrigger value="chapters" className="text-xs">
                      <List className="h-3 w-3 mr-1" />
                      章节
                    </TabsTrigger>
                    <TabsTrigger value="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      大纲
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs">
                      <PenTool className="h-3 w-3 mr-1" />
                      笔记
                    </TabsTrigger>
                    <TabsTrigger value="volumes" className="text-xs">
                      <BookMarked className="h-3 w-3 mr-1" />
                      分卷
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
                  <ScrollArea className="flex-1 h-full">
                    <TabsContent value="chapters" className="mt-0 p-2 h-full pb-16">
                      <div className="space-y-1">
                        {novel.chapters.map((chapter) => (
                          <div
                            key={chapter.id}
                            className={`group p-3 rounded-lg cursor-pointer transition-all ${
                              selectedChapter?.id === chapter.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                            }`}
                            onClick={() => selectChapter(chapter)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                  {chapter.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {chapter.content.length} 字
                                  </span>
                                  {chapter.status === 'draft' && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                      草稿
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChapter(chapter.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="outline" className="mt-0 p-2 h-full flex flex-col">
                      <ScrollArea className="flex-1">
                        <div className="space-y-4">
                          {/* 小说总纲 */}
                          <Card className="bg-white dark:bg-gray-900">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">小说总纲</CardTitle>
                                <div className="flex items-center gap-1">
                                  {novelOutline && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={handleClearNovelOutline}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      清空
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <CardDescription className="text-xs">
                                整体故事走向和核心设定
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Textarea
                                value={novelOutline}
                                onChange={(e) => setNovelOutline(e.target.value)}
                                onBlur={handleSaveNovelOutline}
                                placeholder="描述小说的整体故事走向、核心冲突、人物关系等..."
                                className="min-h-[150px] text-sm resize-none"
                                disabled={isSavingOutline}
                              />
                              {isSavingOutline && (
                                <p className="text-xs text-gray-500 mt-1">保存中...</p>
                              )}
                            </CardContent>
                          </Card>

                          {/* 章节大纲 */}
                          <Card className="bg-white dark:bg-gray-900">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">
                                  章节大纲
                                  {selectedChapter && (
                                    <span className="ml-2 text-xs text-gray-500 font-normal">
                                      ({selectedChapter.title})
                                    </span>
                                  )}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                  {chapterOutline && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={handleClearChapterOutline}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      清空
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <CardDescription className="text-xs">
                                {selectedChapter ? '当前章节的情节要点' : '请先选择一个章节'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Textarea
                                value={chapterOutline}
                                onChange={(e) => setChapterOutline(e.target.value)}
                                onBlur={handleSaveChapterOutline}
                                placeholder={selectedChapter ? "描述当前章节的情节要点、转折、目标等..." : "请先在左侧选择一个章节"}
                                className="min-h-[150px] text-sm resize-none"
                                disabled={isSavingOutline || !selectedChapter}
                              />
                              {isSavingOutline && (
                                <p className="text-xs text-gray-500 mt-1">保存中...</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0 p-2 h-full flex flex-col">
                      <ScrollArea className="flex-1">
                        <Card className="bg-white dark:bg-gray-900">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">创作笔记</CardTitle>
                              <div className="flex items-center gap-1">
                                {notes && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={handleClearNotes}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    清空
                                  </Button>
                                )}
                              </div>
                            </div>
                            <CardDescription className="text-xs">
                              记录灵感和、想法和待办事项
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              onBlur={handleSaveNotes}
                              placeholder="在这里记录你的创作灵感、想法、待办事项等..."
                              className="min-h-[300px] text-sm resize-none"
                              disabled={isSavingNotes}
                            />
                            {isSavingNotes && (
                              <p className="text-xs text-gray-500 mt-1">保存中...</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              💡 笔记自动保存在数据库中
                            </p>
                          </CardContent>
                        </Card>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="volumes" className="mt-0 p-2 h-full">
                      <div className="space-y-2">
                        {isLoadingVolumes ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-xs text-gray-500">加载分卷中...</span>
                          </div>
                        ) : volumes.length === 0 ? (
                          <div className="text-center py-8">
                            <BookMarked className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">暂无分卷</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={() => router.push(`/novel/${novelId}/volumes`)}
                            >
                              前往管理分卷
                            </Button>
                          </div>
                        ) : (
                          volumes.map((volume: any) => (
                            <div key={volume.id} className="border rounded-lg overflow-hidden">
                              {/* 分卷标题 - 可折叠 */}
                              <div
                                className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => {
                                  const newExpanded = new Set(expandedVolumes);
                                  if (newExpanded.has(volume.id)) {
                                    newExpanded.delete(volume.id);
                                  } else {
                                    newExpanded.add(volume.id);
                                  }
                                  setExpandedVolumes(newExpanded);
                                }}
                              >
                                {expandedVolumes.has(volume.id) ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                    {volume.title || `分卷${volume.order || ''}`}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {volume.startChapter && volume.endChapter
                                      ? `第${volume.startChapter}-${volume.endChapter}章`
                                      : `${volume.chapterCount || 0} 章`}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs h-4 px-1.5 flex-shrink-0">
                                  {volume.chapterCount || 0}
                                </Badge>
                              </div>

                              {/* 章节列表 */}
                              {expandedVolumes.has(volume.id) && volume.chapters && (
                                <div className="border-t">
                                  {volume.chapters.map((chapter: any, idx: number) => (
                                    <div
                                      key={chapter.id}
                                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-xs ${
                                        selectedChapter?.id === chapter.id
                                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                      }`}
                                      onClick={() => selectChapter(chapter)}
                                    >
                                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                                        {idx === volume.chapters.length - 1 ? '└' : '├'}
                                      </span>
                                      <span className="flex-1 truncate">{chapter.title}</span>
                                      {chapter.status === 'published' || chapter.content?.length > 0 ? (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                          {chapter.status === 'published' ? '已发布' : '已完成'}
                                        </Badge>
                                      ) : chapter.status === 'draft' ? (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex-shrink-0">
                                          草稿
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0">
                                          未写
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </ScrollArea>

                  {/* 固定在底部的新建章节按钮 */}
                  {activeTab === 'chapters' && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 border-t bg-gray-50 dark:bg-gray-800 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-dashed"
                        onClick={handleCreateChapter}
                      >
                        <Plus className="h-4 w-4" />
                        新建章节
                      </Button>
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          )}

          {/* 折叠按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 -right-3 transform -translate-y-1/2 h-6 w-6 rounded-full border bg-white dark:bg-gray-900 shadow-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </aside>

        {/* 中间主编辑区 - 增强白色背景和阴影 */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-gray-900/40 shadow-inner">
          <div className="flex-1 overflow-y-auto h-full">
            <div className="max-w-4xl mx-auto p-8 min-h-full">
              {/* 章节标题 */}
              <Input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                onBlur={handleSaveChapter}
                placeholder="章节标题"
                className="text-3xl font-bold border-0 focus-visible:ring-0 px-0 mb-4 bg-transparent"
              />

              {/* 章节关键词 */}
              <div className="mb-6">
                <Input
                  value={chapterKeywords}
                  onChange={(e) => {
                    setChapterKeywords(e.target.value);
                  }}
                  onBlur={handleSaveChapter}
                  placeholder="章节关键词（用逗号分隔，例如：冒险, 战斗, 情感）"
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 shadow-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  关键词将帮助AI更好地理解章节内容，生成更贴合主题的内容
                </p>
              </div>

              {/* 章节内容编辑区 */}
              <div>
                <Textarea
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  onBlur={handleSaveChapter}
                  placeholder="开始创作你的故事...&#10;&#10;提示：使用顶部工具栏的AI功能辅助创作"
                  className="min-h-[600px] text-base leading-relaxed resize-y border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                />
                
                {/* 内容操作工具栏 */}
                {chapterContent && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('确定要清空当前章节内容吗？此操作无法撤销。')) {
                          setChapterContent('');
                          handleSaveChapter();
                        }
                      }}
                      className="gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      清空内容
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部状态栏 - 增强背景和阴影 */}
          <footer className="h-8 border-t border-gray-200 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-between px-4 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0 shadow-inner">
            <div className="flex items-center gap-4">
              <span>字数: <span className="font-medium text-gray-900 dark:text-white">{wordCount}</span></span>
              <span>字符: <span className="font-medium text-gray-900 dark:text-white">{chapterContent.length}</span></span>
              {lastSavedTime && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check className="h-3 w-3" />
                  已保存 {lastSavedTime.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  保存中...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>第 <span className="font-medium text-gray-900 dark:text-white">{selectedChapter?.order || 0}</span> 章</span>
              <span>·</span>
              <span><span className="font-medium text-gray-900 dark:text-white">{novel.chapters.length}</span> 章节总数</span>
            </div>
          </footer>
        </main>

        {/* 右侧AI助手面板 - 增强卡片效果 */}
        {aiPanelOpen && (
          <aside className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm shadow-lg flex flex-col flex-shrink-0">
            {/* 标签栏 */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  AI 创作助手
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setAiPanelOpen(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-1">
                {([
                  { key: 'writing' as const, label: '写作', icon: PenTool },
                  { key: 'revision' as const, label: '推敲', icon: ClipboardCheck },
                  { key: 'foreshadowing' as const, label: '伏线', icon: Flag },
                  { key: 'contradiction' as const, label: '矛盾', icon: AlertTriangle },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRightPanelTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all ${
                      rightPanelTab === tab.key
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* 写作 Tab */}
              {rightPanelTab === 'writing' && (
              <ScrollArea className="flex-1 h-full p-4">
                {/* 生成提示输入 */}
                <div className="mb-4">
                  <Label className="text-xs font-medium mb-2 block">生成提示（可选）</Label>
                  <Textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="输入具体的创作要求..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                {/* 语言风格选择 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      语言风格（可选）
                    </Label>
                    <div className="flex items-center gap-1">
                      <Link href="/prompts">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          type="button"
                        >
                          <Palette className="h-3 w-3" />
                          管理提示词库
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          const recommended = getRecommendedStyles(generateType);
                          if (recommended.length > 0) {
                            setSelectedLanguageStyle(recommended[0].id);
                          }
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        推荐风格
                      </Button>
                    </div>
                  </div>
                  <Select value={selectedLanguageStyle} onValueChange={setSelectedLanguageStyle}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="选择语言风格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不使用特殊风格</SelectItem>
                      {languageStyles.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{style.name}</span>
                            <span className="text-xs text-gray-500">{style.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLanguageStyle && (
                    <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {getLanguageStyleById(selectedLanguageStyle)?.name}
                        </Badge>
                        {getLanguageStyleById(selectedLanguageStyle)?.tags?.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                        {getLanguageStyleById(selectedLanguageStyle)?.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* 生成结果展示 */}
                {generatedContent && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium">生成结果</Label>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleCopyGenerated}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          复制
                        </Button>
                      </div>
                    </div>
                    <Card className="bg-white dark:bg-gray-900">
                      <CardContent className="p-3">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {generatedContent}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleAddGeneratedContent}
                        className="flex-1 gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        追加到章节
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReplaceContent}
                        className="flex-1 gap-1 text-xs"
                      >
                        <RefreshCw className="h-3 w-3" />
                        替换内容
                      </Button>
                      {previousContent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleUndoReplace}
                          className="flex-1 gap-1 text-xs"
                        >
                          <History className="h-3 w-3" />
                          撤销替换
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 版本列表 */}
                {generatedVersions.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">生成版本 ({generatedVersions.length}/3)</Label>
                        {generatedVersions.length >= 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={handleOpenCompareDialog}
                          >
                            <ChevronRight className="h-3 w-3" />
                            版本对比
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">最多保留3个版本</span>
                    </div>
                    <div className="space-y-2">
                      {generatedVersions.map((version) => (
                        <Card
                          key={version.id}
                          className={`cursor-pointer transition-all ${
                            selectedVersionId === version.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                              : 'hover:border-gray-400'
                          }`}
                          onClick={() => handleSelectVersion(version.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={version.isPartial ? 'secondary' : 'default'} className="text-xs">
                                  {version.modelName}
                                </Badge>
                                {version.isPartial && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    部分生成
                                  </Badge>
                                )}
                                {selectedVersionId === version.id && (
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                    当前选择
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVersion(version.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              {new Date(version.timestamp).toLocaleString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                            {version.contextEnd && (
                              <div className="mb-2 text-xs">
                                <span className="text-gray-500">原文衔接点：</span>
                                <span className="text-purple-600 dark:text-purple-400">"{version.contextEnd}"</span>
                              </div>
                            )}
                            <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                              {version.content.slice(0, 150)}{version.content.length > 150 ? '...' : ''}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyVersion(version.id, 'append');
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                追加
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyVersion(version.id, 'replace');
                                }}
                              >
                                <RefreshCw className="h-3 w-3" />
                                替换
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 正在生成内容...
                  </div>
                )}
              </ScrollArea>
              )}

              {/* 推敲 Tab */}
              {rightPanelTab === 'revision' && (
              <ScrollArea className="flex-1 h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      三阶段推敲流程，逐步验证和完善作品质量
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={loadRevisionRecords}
                      disabled={isLoadingRevisionRecords}
                    >
                      <History className="h-3 w-3 mr-1" />
                      刷新
                    </Button>
                  </div>

                  {/* 进度指示器 */}
                  <div className="flex items-center gap-2 mb-2">
                    {(['A', 'B', 'C'] as const).map((p) => {
                      const phaseConfig: Record<string, { label: string; color: string; bgColor: string }> = {
                        A: { label: '剧情', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
                        B: { label: '整合', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/40' },
                        C: { label: '读者', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
                      };
                      const cfg = phaseConfig[p];
                      const isCompleted = completedPhases.has(p);
                      const isActive = revisionPhase === p;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${isCompleted ? 'bg-green-500 text-white' : isActive ? cfg.bgColor + ' ' + cfg.color : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            {isCompleted ? <Check className="h-3 w-3" /> : p}
                          </div>
                          <span className={`text-xs ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>{cfg.label}</span>
                          {p !== 'C' && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Phase A */}
                  <Card className="bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">A</div>
                        <span className="text-sm font-medium">剧情验证</span>
                        {completedPhases.has('A') && <Check className="h-3 w-3 text-green-500 ml-auto" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        检查剧情逻辑、因果关系和情节连贯性，确保故事发展合理
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1 text-xs"
                        onClick={() => handleRunRevision('A')}
                        disabled={isRevising || !selectedChapter}
                      >
                        {isRevising && revisionPhase === 'A' ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />分析中...</>
                        ) : (
                          <><ClipboardCheck className="h-3 w-3" />开始剧情验证</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Phase B */}
                  <Card className="bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-xs font-bold">B</div>
                        <span className="text-sm font-medium">整合性验证</span>
                        {completedPhases.has('B') && <Check className="h-3 w-3 text-green-500 ml-auto" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        检查角色设定、世界观和人物行为的一致性，发现潜在的设定冲突
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1 text-xs"
                        onClick={() => handleRunRevision('B')}
                        disabled={isRevising || !selectedChapter}
                      >
                        {isRevising && revisionPhase === 'B' ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />分析中...</>
                        ) : (
                          <><ClipboardCheck className="h-3 w-3" />开始整合性验证</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Phase C */}
                  <Card className="bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-bold">C</div>
                        <span className="text-sm font-medium">读者视角评估</span>
                        {completedPhases.has('C') && <Check className="h-3 w-3 text-green-500 ml-auto" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        从读者角度评估阅读体验，包括代入感、节奏感和情感共鸣
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1 text-xs"
                        onClick={() => handleRunRevision('C')}
                        disabled={isRevising || !selectedChapter}
                      >
                        {isRevising && revisionPhase === 'C' ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />分析中...</>
                        ) : (
                          <><ClipboardCheck className="h-3 w-3" />开始读者视角评估</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 推敲结果展示 */}
                  {revisionResult && (
                    <div className="mt-4 space-y-3">
                      <Label className="text-xs font-medium block">推敲结果</Label>

                      {/* 评分展示 */}
                      <Card className="bg-white dark:bg-gray-900">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="relative flex items-center justify-center w-16 h-16">
                              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" strokeLinecap="round"
                                  className={revisionResult.score >= 80 ? 'text-green-500' : revisionResult.score >= 60 ? 'text-amber-500' : 'text-red-500'}
                                  strokeDasharray={`${(revisionResult.score / 100) * 175.93} 175.93`}
                                />
                              </svg>
                              <span className={`absolute text-lg font-bold ${revisionResult.score >= 80 ? 'text-green-600' : revisionResult.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                {revisionResult.score}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">综合评分</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {revisionResult.summary}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 问题列表 */}
                      {revisionResult.issues.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium">发现 {revisionResult.issues.length} 个问题</Label>
                          </div>
                          {revisionResult.issues.map((issue, index) => {
                            const severityConfig: Record<string, { label: string; color: string }> = {
                              high: { label: '严重', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
                              medium: { label: '中等', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
                              low: { label: '轻微', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
                            };
                            const typeLabels: Record<string, string> = {
                              plot_logic: '剧情逻辑', pacing: '节奏', conflict: '冲突', continuity: '连续性',
                              character: '角色', worldview: '世界观', timeline: '时间线', relationship: '关系',
                              opening: '开头', emotion: '情感', dialogue: '对话', description: '描写', ending: '结尾',
                            };
                            const sev = severityConfig[issue.severity] || severityConfig.low;
                            const isExpanded = expandedIssues.has(index);
                            return (
                              <Card key={index} className="bg-white dark:bg-gray-900">
                                <CardContent className="p-3">
                                  <div
                                    className="flex items-start gap-2 cursor-pointer"
                                    onClick={() => toggleIssueExpand(index)}
                                  >
                                    <ChevronRight className={`h-3.5 w-3.5 mt-0.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${sev.color}`}>{sev.label}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{typeLabels[issue.type] || issue.type}</span>
                                        {issue.location && (
                                          <span className="text-xs text-gray-400 dark:text-gray-500">{issue.location}</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                                        {issue.description}
                                      </p>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-2 ml-5 space-y-2">
                                      <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                                        <span className="font-medium">问题描述：</span>{issue.description}
                                      </div>
                                      {issue.suggestion && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                                          <span className="font-medium text-blue-700 dark:text-blue-400">修改建议：</span>{issue.suggestion}
                                        </div>
                                      )}
                                      {issue.suggestion && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 text-xs gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApplySuggestion(issue.suggestion);
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                          应用建议
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      {revisionResult.issues.length === 0 && (
                        <div className="text-center py-4">
                          <Check className="h-6 w-6 mx-auto text-green-500 mb-1" />
                          <p className="text-xs text-green-600 dark:text-green-400">未发现问题，质量良好</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isRevising && !revisionResult && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 正在分析中...
                    </div>
                  )}

                  {/* 历史记录 */}
                  {revisionRecords.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Separator className="my-3" />
                      <Label className="text-xs font-medium block">历史记录</Label>
                      {revisionRecords.slice(0, 10).map((record) => {
                        const phaseConfig: Record<string, { label: string; color: string }> = {
                          A: { label: '剧情验证', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
                          B: { label: '整合性验证', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
                          C: { label: '读者视角评估', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
                        };
                        const cfg = phaseConfig[record.phase] || phaseConfig.A;
                        return (
                          <div key={record.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-xs font-medium">{record.score}分</span>
                            <span className="text-xs text-gray-400 flex-1 truncate">
                              {record.summary || `${(record.issues || []).length}个问题`}
                            </span>
                            <span className="text-xs text-gray-400 hidden group-hover:inline">
                              {new Date(record.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleViewRevisionRecord(record)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteRevisionRecord(record.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
              )}

              {/* 伏线 Tab */}
              {rightPanelTab === 'foreshadowing' && (
              <ScrollArea className="flex-1 h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      管理小说中的伏线与暗线
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={openNewForeshadowingDialog}>
                      <Plus className="h-3 w-3" />
                      新增伏线
                    </Button>
                  </div>

                  {/* 新增/编辑伏线对话框 */}
                  <Dialog open={showForeshadowingDialog} onOpenChange={(open) => { setShowForeshadowingDialog(open); if (!open) setEditingForeshadowing(null); }}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingForeshadowing ? '编辑伏线' : '新增伏线'}</DialogTitle>
                        <DialogDescription>
                          {editingForeshadowing ? '修改伏线信息' : '添加一条新的伏线到小说中'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div>
                          <Label className="text-xs">名称</Label>
                          <Input
                            className="mt-1 h-8 text-sm"
                            placeholder="例如：神秘玉佩"
                            value={foreshadowingForm.name}
                            onChange={(e) => setForeshadowingForm({ ...foreshadowingForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">描述</Label>
                          <Textarea
                            className="mt-1 text-sm"
                            placeholder="伏线的详细描述..."
                            rows={3}
                            value={foreshadowingForm.description}
                            onChange={(e) => setForeshadowingForm({ ...foreshadowingForm, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">埋设章节</Label>
                          <Input
                            className="mt-1 h-8 text-sm"
                            placeholder="例如：第1章"
                            value={foreshadowingForm.plantedChapter}
                            onChange={(e) => setForeshadowingForm({ ...foreshadowingForm, plantedChapter: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">计划回收方式</Label>
                          <Input
                            className="mt-1 h-8 text-sm"
                            placeholder="例如：在第20章揭示玉佩的真正来历"
                            value={foreshadowingForm.plannedResolution}
                            onChange={(e) => setForeshadowingForm({ ...foreshadowingForm, plannedResolution: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => { setShowForeshadowingDialog(false); setEditingForeshadowing(null); }}>取消</Button>
                        <Button size="sm" onClick={handleSaveForeshadowing}>{editingForeshadowing ? '保存' : '创建'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* 伏线列表 */}
                  {isLoadingForeshadowing ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-xs text-gray-400">加载中...</span>
                    </div>
                  ) : foreshadowingItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Flag className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">暂无伏线</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">点击"新增伏线"开始管理</p>
                    </div>
                  ) : (
                    foreshadowingItems.map((item) => {
                      const statusMap: Record<string, { label: string; color: string }> = {
                        planted: { label: '已埋设', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
                        pushed: { label: '已推进', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
                        resolved: { label: '已回收', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
                        abandoned: { label: '已废弃', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
                      };
                      const statusInfo = statusMap[item.status] || statusMap.planted;

                      return (
                        <Card key={item.id} className="bg-white dark:bg-gray-900">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Flag className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Select
                                  value={item.status}
                                  onValueChange={(value) => handleUpdateForeshadowingStatus(item.id, value)}
                                >
                                  <SelectTrigger className="h-6 w-20 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="planted">已埋设</SelectItem>
                                    <SelectItem value="pushed">已推进</SelectItem>
                                    <SelectItem value="resolved">已回收</SelectItem>
                                    <SelectItem value="abandoned">已废弃</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditForeshadowingDialog(item)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => handleDeleteForeshadowing(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              {item.planted_chapter && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  埋设于 {item.planted_chapter}
                                </span>
                              )}
                            </div>
                            {item.related_characters && item.related_characters.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {item.related_characters.map((char: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">{char}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              )}

              {/* 矛盾 Tab */}
              {rightPanelTab === 'contradiction' && (
              <ScrollArea className="flex-1 h-full p-4">
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    自动检测小说中的逻辑矛盾和设定冲突
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-1 text-xs"
                    onClick={handleContradictionCheck}
                    disabled={isCheckingContradictions || !selectedChapter}
                  >
                    {isCheckingContradictions ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {isCheckingContradictions ? '正在检测...' : '检测矛盾'}
                  </Button>

                  {/* 检测结果 */}
                  {contradictionResult && (
                    <div className="space-y-3 mt-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        {contradictionResult.summary}
                      </div>

                      {contradictionResult.total === 0 ? (
                        <div className="text-center py-6">
                          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-xs text-green-600 dark:text-green-400">未发现矛盾</p>
                        </div>
                      ) : (
                        <>
                          {/* 角色矛盾 */}
                          {contradictionResult.grouped?.character && contradictionResult.grouped.character.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                <Users className="h-3 w-3" />
                                角色矛盾 ({contradictionResult.grouped.character.length})
                              </div>
                              {contradictionResult.grouped.character.map((item: any, i: number) => (
                                <Card key={`char-${i}`} className="bg-white dark:bg-gray-900 border-l-2 border-l-red-400 mb-2">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                        {({ high: '高', medium: '中', low: '低' } as Record<string, string>)[item.severity] || item.severity}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-gray-400" onClick={() => handleIgnoreContradiction(i)}>忽略</Button>
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-green-600" onClick={() => handleMarkContradictionFixed(i)}>标记已修复</Button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{item.description}</p>
                                    {item.location && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">位置：{item.location}</p>
                                    )}
                                    {item.suggestion && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">建议：</span>{item.suggestion}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* 世界观矛盾 */}
                          {contradictionResult.grouped?.worldview && contradictionResult.grouped.worldview.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                <Globe className="h-3 w-3" />
                                世界观矛盾 ({contradictionResult.grouped.worldview.length})
                              </div>
                              {contradictionResult.grouped.worldview.map((item: any, i: number) => (
                                <Card key={`world-${i}`} className="bg-white dark:bg-gray-900 border-l-2 border-l-orange-400 mb-2">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                        {({ high: '高', medium: '中', low: '低' } as Record<string, string>)[item.severity] || item.severity}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-gray-400" onClick={() => handleIgnoreContradiction(i)}>忽略</Button>
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-green-600" onClick={() => handleMarkContradictionFixed(i)}>标记已修复</Button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{item.description}</p>
                                    {item.location && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">位置：{item.location}</p>
                                    )}
                                    {item.suggestion && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">建议：</span>{item.suggestion}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* 时间线矛盾 */}
                          {contradictionResult.grouped?.timeline && contradictionResult.grouped.timeline.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                <History className="h-3 w-3" />
                                时间线矛盾 ({contradictionResult.grouped.timeline.length})
                              </div>
                              {contradictionResult.grouped.timeline.map((item: any, i: number) => (
                                <Card key={`time-${i}`} className="bg-white dark:bg-gray-900 border-l-2 border-l-yellow-400 mb-2">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                        {({ high: '高', medium: '中', low: '低' } as Record<string, string>)[item.severity] || item.severity}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-gray-400" onClick={() => handleIgnoreContradiction(i)}>忽略</Button>
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-green-600" onClick={() => handleMarkContradictionFixed(i)}>标记已修复</Button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{item.description}</p>
                                    {item.location && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">位置：{item.location}</p>
                                    )}
                                    {item.suggestion && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">建议：</span>{item.suggestion}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {/* 伏线矛盾 */}
                          {contradictionResult.grouped?.foreshadowing && contradictionResult.grouped.foreshadowing.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                <Flag className="h-3 w-3" />
                                伏线矛盾 ({contradictionResult.grouped.foreshadowing.length})
                              </div>
                              {contradictionResult.grouped.foreshadowing.map((item: any, i: number) => (
                                <Card key={`foreshadow-${i}`} className="bg-white dark:bg-gray-900 border-l-2 border-l-purple-400 mb-2">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                        {({ high: '高', medium: '中', low: '低' } as Record<string, string>)[item.severity] || item.severity}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-gray-400" onClick={() => handleIgnoreContradiction(i)}>忽略</Button>
                                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-green-600" onClick={() => handleMarkContradictionFixed(i)}>标记已修复</Button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{item.description}</p>
                                    {item.location && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">位置：{item.location}</p>
                                    )}
                                    {item.suggestion && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">建议：</span>{item.suggestion}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 检测中状态 */}
                  {isCheckingContradictions && (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">AI 正在分析章节内容...</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">请稍候，这可能需要几秒钟</span>
                    </div>
                  )}

                  {/* 历史检测记录 */}
                  {!contradictionResult && !isCheckingContradictions && contradictionRecords.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">历史检测记录</div>
                      {contradictionRecords.slice(0, 5).map((record: any) => (
                        <Card key={record.id} className="bg-white dark:bg-gray-900 mb-2">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(record.created_at).toLocaleString('zh-CN')}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {record.contradictions?.length || 0} 个矛盾
                              </Badge>
                            </div>
                            {record.summary && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{record.summary}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* 空状态 */}
                  {!contradictionResult && !isCheckingContradictions && contradictionRecords.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">暂未进行矛盾检测</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">选择章节后点击上方按钮开始检测</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 删除章节确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                确定要删除这个章节吗？
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600 dark:text-gray-400 mt-2">
                此操作无法撤销，删除后章节内容将永久丢失。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="w-full gap-3">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1 h-10 text-sm"
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="flex-1 h-10 text-sm"
              >
                确认删除
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
}
