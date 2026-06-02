'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, BookOpen, Users, Globe, Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getNovelById, updateChapter, deleteChapter, addChapter, type Novel, type Chapter } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { loadNovelFromDatabase } from '@/lib/database-api';

export default function NovelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [novel, setNovel] = useState<Novel | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('doubao');

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadNovelFromDatabase(novelId)
        .then(loadedNovel => {
          if (!loadedNovel) {
            router.push('/');
            return;
          }
          setNovel(loadedNovel);
          if (loadedNovel.chapters && loadedNovel.chapters.length > 0) {
            setSelectedChapter(loadedNovel.chapters[0]);
            setChapterContent(loadedNovel.chapters[0].content);
          }
        })
        .catch(error => {
          console.error('加载小说失败:', error);
        });
    }
  }, [user, novelId, router]);

  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setChapterContent(chapter.content);
    setGeneratedContent('');
  };

  const handleSaveChapter = async () => {
    if (!selectedChapter || !novel) {
      console.error('[NovelDetail] 保存失败：没有选中的章节或小说', { 
        hasSelectedChapter: !!selectedChapter,
        hasNovel: !!novel 
      });
      return;
    }
    
    console.log('[NovelDetail] 开始保存章节...', {
      chapterId: selectedChapter.id,
      title: selectedChapter.title,
      contentLength: chapterContent.length
    });
    
    setIsSaving(true);
    
    const updatedChapter: Chapter = {
      ...selectedChapter,
      content: chapterContent,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('[NovelDetail] 调用 updateChapter...');
    updateChapter(novel.id, updatedChapter);

    // 重新加载小说以获取最新数据
    const updatedNovel = await loadNovelFromDatabase(novel.id);
    const savedChapter = updatedNovel?.chapters?.find((c: any) => c.id === updatedChapter.id);
    
    console.log('[NovelDetail] 验证保存结果:', {
      novelExists: !!updatedNovel,
      chapterExists: !!savedChapter,
      savedContentLength: savedChapter?.content?.length
    });
    
    if (updatedNovel) {
      setNovel(updatedNovel);
      setSelectedChapter(updatedChapter);
      console.log('[NovelDetail] 章节保存成功');
    } else {
      console.error('[NovelDetail] 章节保存失败：无法重新加载小说');
    }
    
    setIsSaving(false);
  };

  const handleGenerate = async (type: string) => {
    if (!novel || isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const response = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          model: selectedModel,
          prompt: generatePrompt || type === 'outline' ? novel.description : '',
          context: {
            novelId: novel.id,
            chapterId: selectedChapter?.id,
            chapterTitle: selectedChapter?.title,
            chapterKeywords: selectedChapter?.keywords || '',
            previousContent: selectedChapter?.content,
            characters: novel.characters,
            worldSettings: novel.worldSettings,
            chapterCount: novel.chapters.length,
            genre: novel.genre,
          },
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

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
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setGeneratedContent(prev => prev + parsed.content);
              } else if (parsed.error) {
                console.error('Generation error:', parsed.error);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddGeneratedContent = () => {
    setChapterContent(prev => prev + generatedContent);
    setGeneratedContent('');
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!novel) return;
    
    console.log('[NovelDetail] 删除章节:', { chapterId, novelId: novel.id });
    
    if (confirm('确定要删除这个章节吗？')) {
      deleteChapter(novel.id, chapterId);
      
      // 重新加载小说以获取最新数据
      const updatedNovel = getNovelById(novel.id);
      
      console.log('[NovelDetail] 删除后的小说:', {
        novelExists: !!updatedNovel,
        remainingChapters: updatedNovel?.chapters.length
      });
      
      if (updatedNovel) {
        setNovel(updatedNovel);
        if (updatedNovel.chapters.length > 0) {
          setSelectedChapter(updatedNovel.chapters[0]);
          setChapterContent(updatedNovel.chapters[0].content);
        } else {
          setSelectedChapter(null);
          setChapterContent('');
        }
      } else {
        console.error('[NovelDetail] 删除失败：无法重新加载小说');
      }
    }
  };

  const handleCreateChapter = () => {
    if (!novel) return;

    console.log('[NovelDetail] 创建新章节...');

    const newChapter: Chapter = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      novelId: novel.id,
      title: `第${novel.chapters.length + 1}章 新章节`,
      content: '',
      order: novel.chapters.length + 1,
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[NovelDetail] 新章节数据:', newChapter);
    
    // 使用 addChapter 函数保存到 localStorage
    addChapter(novel.id, newChapter);
    
    // 重新加载小说以获取最新数据
    const updatedNovel = getNovelById(novel.id);
    
    console.log('[NovelDetail] 重新加载后的小说:', {
      novelId: updatedNovel?.id,
      chapterCount: updatedNovel?.chapters.length,
      newChapterExists: updatedNovel?.chapters.some(c => c.id === newChapter.id)
    });
    
    if (updatedNovel) {
      setNovel(updatedNovel);
      setSelectedChapter(newChapter);
      setChapterContent('');
      setGeneratedContent('');
      
      console.log('[NovelDetail] 章节创建成功');
    } else {
      console.error('[NovelDetail] 章节创建失败：无法重新加载小说');
    }
  };

  if (!novel) {
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
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {novel.title}
                </h1>
                <p className="text-sm text-muted-foreground">{novel.genre} · {novel.chapters.length} 章节</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">AI辅助创作</span>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
              
              {/* 角色管理按钮 */}
              <Link href={`/novel/${novel.id}/characters`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  角色管理
                  {novel.characters && novel.characters.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {novel.characters.length}
                    </Badge>
                  )}
                </Button>
              </Link>
              
              {/* 世界观按钮 */}
              <Link href={`/novel/${novel.id}/world`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  世界观
                  {novel.worldSettings && Object.keys(novel.worldSettings).length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.keys(novel.worldSettings).length}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  章节列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2 pr-4">
                    {novel.chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChapter?.id === chapter.id
                            ? 'bg-purple-100 dark:bg-purple-900'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleSelectChapter(chapter)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium line-clamp-1">{chapter.title}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(chapter.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {chapter.content.length} 字
                          </Badge>
                          {chapter.status === 'draft' && (
                            <Badge variant="secondary" className="text-xs">草稿</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      onClick={handleCreateChapter}
                    >
                      <Plus className="h-4 w-4" />
                      新建章节
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Editor */}
          <div className="flex-1 space-y-6">
            {/* Chapter Editor */}
            {selectedChapter ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Input
                          value={selectedChapter.title}
                          onChange={(e) => {
                            const updated = { ...selectedChapter, title: e.target.value };
                            setSelectedChapter(updated);
                          }}
                          className="text-xl font-semibold h-12 w-96"
                          placeholder="章节标题"
                        />
                        <Button
                          onClick={handleSaveChapter}
                          disabled={isSaving}
                          className="gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          保存
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{chapterContent.length} 字</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                      placeholder="开始写作... (或使用AI辅助生成)"
                      className="min-h-[500px] resize-y text-base leading-relaxed"
                    />
                  </CardContent>
                </Card>

                {/* AI Generation Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      AI 创作助手
                    </CardTitle>
                    <CardDescription>
                      使用AI辅助生成大纲、章节内容或续写
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 模型选择 */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="model-select">选择大模型：</Label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger id="model-select" className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doubao">豆包</SelectItem>
                          <SelectItem value="qwen">千问</SelectItem>
                          <SelectItem value="kimi">Kimi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerate('outline')}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        生成大纲
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerate('chapter')}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <BookOpen className="h-4 w-4" />
                        生成章节
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerate('continue')}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        智能续写
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGenerate('plot')}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        剧情建议
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prompt">自定义提示（可选）</Label>
                      <Textarea
                        id="prompt"
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        placeholder="输入具体的生成要求，例如：生成一个紧张的战斗场景..."
                        rows={3}
                      />
                    </div>

                    {isGenerating && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在生成内容...
                      </div>
                    )}

                    {generatedContent && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>生成内容</Label>
                          <Button
                            size="sm"
                            onClick={handleAddGeneratedContent}
                            className="gap-2"
                          >
                            <Plus className="h-3 w-3" />
                            添加到章节
                          </Button>
                        </div>
                        <Card className="bg-purple-50 dark:bg-purple-950/30">
                          <CardContent className="p-4">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {generatedContent}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex items-center justify-center min-h-[600px]">
                <CardContent className="text-center py-20">
                  <BookOpen className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    还没有章节
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    点击"新建章节"开始创作
                  </p>
                  <Button onClick={handleCreateChapter} className="gap-2">
                    <Plus className="h-4 w-4" />
                    新建章节
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
