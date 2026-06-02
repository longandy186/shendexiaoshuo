'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, BookOpen, Edit2, Trash2, Calendar, FileText, Database, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getAllNovels, deleteNovel, type Novel } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { loadNovelsFromDatabase } from '@/lib/database-api';
import { formatDate } from '@/lib/date-utils';

export default function NovelListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ongoing' | 'completed'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [novelToDelete, setNovelToDelete] = useState<Novel | null>(null);

  // 认证检查
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadNovels();
  }, []);

  useEffect(() => {
    filterNovels();
  }, [novels, searchTerm, statusFilter, genreFilter]);

  const loadNovels = async () => {
    console.log('[NovelList] 开始从数据库加载小说列表...');
    try {
      const allNovels = await loadNovelsFromDatabase();
      console.log('[NovelList] 加载结果:', {
        count: allNovels.length,
        novels: allNovels.map((n: any) => ({
          id: n.id,
          title: n.title,
          status: n.status,
          chaptersCount: n.chapters?.length || 0
        }))
      });

      const sortedNovels = allNovels.sort((a: Novel, b: Novel) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNovels(sortedNovels);
    } catch (error) {
      console.error('[NovelList] 加载小说列表失败:', error);
    }
  };

  const filterNovels = () => {
    let filtered = novels;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(novel =>
        novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        novel.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(novel => novel.status === statusFilter);
    }

    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(novel => novel.genre === genreFilter);
    }

    setFilteredNovels(filtered);
  };

  const handleDelete = async () => {
    if (novelToDelete) {
      deleteNovel(novelToDelete.id);
      await loadNovels();
      setIsDeleteDialogOpen(false);
      setNovelToDelete(null);
    }
  };

  const openDeleteDialog = (novel: Novel) => {
    setNovelToDelete(novel);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: Novel['status']) => {
    const statusConfig: Record<Novel['status'], { label: string; color: string }> = {
      draft: { label: '草稿', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
      ongoing: { label: '连载中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    };
    const config = statusConfig[status];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
  };

  const getGenres = () => {
    const genres = [...new Set(novels.map(n => n.genre).filter(g => g && g.trim()))];
    return genres;
  };

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
                  我的小说
                </h1>
                <p className="text-sm text-muted-foreground">共 {filteredNovels.length} 部作品</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = localStorage.getItem('ai_novels');
                  console.log('[LocalStorage] ai_novels 原始数据:', data);
                  alert(localStorage.getItem('ai_novels') || '没有数据');
                }}
                title="查看 localStorage 原始数据"
              >
                <Database className="h-4 w-4" />
              </Button>
              <Link href="/novel/new">
                <Button className="gap-2">
                  <Plus className="h-5 w-5" />
                  创建新小说
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索小说标题或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="ongoing">连载中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>

              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="筛选类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {getGenres().map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Novel List */}
        {filteredNovels.length === 0 ? (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-20">
              <BookOpen className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {searchTerm || statusFilter !== 'all' || genreFilter !== 'all' ? '没有找到匹配的小说' : '还没有创建小说'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== 'all' || genreFilter !== 'all' 
                  ? '尝试调整筛选条件'
                  : '点击右上角按钮创建你的第一部小说'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && genreFilter === 'all' && (
                <Link href="/novel/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    创建新小说
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map(novel => (
              <Card key={novel.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {novel.genre}
                    </Badge>
                    {getStatusBadge(novel.status)}
                  </div>
                  <CardTitle className="line-clamp-1">{novel.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {novel.description || '暂无描述'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{novel.chapters.length} 章节</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="h-4 w-4" />
                    <span>{novel.characters.length} 角色</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>更新于 {formatDate(novel.updatedAt)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Link href={`/novel/${novel.id}/editor`} className="flex-1">
                    <Button variant="outline" className="w-full gap-1">
                      <Edit2 className="h-4 w-4" />
                      编辑
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openDeleteDialog(novel)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除小说</DialogTitle>
            <DialogDescription>
              确定要删除《{novelToDelete?.title}》吗？此操作将删除该小说的所有章节、角色和世界观设定，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
