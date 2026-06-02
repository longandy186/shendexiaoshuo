'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, BookOpen, Edit2, Calendar, FileText, Database, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAllNovels, type Novel } from '@/lib/storage-adapter';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/date-utils';

export default function SelectProjectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [filteredNovels, setFilteredNovels] = useState<Novel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [novels, searchTerm]);

  const loadNovels = async () => {
    const allNovels = await getAllNovels();
    const sortedNovels = allNovels.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setNovels(sortedNovels);
  };

  const filterNovels = () => {
    if (!searchTerm) {
      setFilteredNovels(novels);
      return;
    }

    const filtered = novels.filter(novel =>
      novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      novel.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNovels(filtered);
  };

  const getStatusBadge = (status: Novel['status']) => {
    const statusConfig: Record<Novel['status'], { label: string; color: string }> = {
      draft: { label: '草稿', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
      ongoing: { label: '连载中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    };
    const config = statusConfig[status];
    return <Badge className={config.color}>{config.label}</Badge>;
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
                  选择项目
                </h1>
                <p className="text-sm text-muted-foreground">选择已有项目继续创作，或创建新项目</p>
              </div>
            </div>
            <Link href="/novel/new">
              <Button className="gap-2">
                <Plus className="h-5 w-5" />
                创建新项目
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Create New Card */}
        <Card className="mb-6 border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-pointer group">
          <Link href="/novel/new">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                创建新项目
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                开始一个全新的小说创作之旅
              </p>
            </CardContent>
          </Link>
        </Card>

        {/* Projects Grid */}
        {filteredNovels.length === 0 ? (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-20">
              <Sparkles className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {searchTerm ? '没有找到匹配的项目' : '还没有项目'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm 
                  ? '尝试调整搜索关键词'
                  : '创建你的第一个项目，开始创作之旅'
                }
              </p>
              {!searchTerm && (
                <Link href="/novel/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    创建新项目
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map(novel => (
              <Card 
                key={novel.id} 
                className="flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
              >
                <Link href={`/novel/${novel.id}/editor`} className="flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {novel.genre}
                      </Badge>
                      {getStatusBadge(novel.status)}
                    </div>
                    <CardTitle className="line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {novel.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {novel.description || '暂无描述'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{novel.chapters.length} 章节</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4" />
                      <span>{novel.characters.length} 角色</span>
                    </div>
                    {novel.worldSettings.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>{novel.worldSettings.length} 世界观设定</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>更新于 {formatDateTime(novel.updatedAt)}</span>
                      </div>
                      <Button size="sm" className="gap-1">
                        <Edit2 className="h-3 w-3" />
                        继续创作
                      </Button>
                    </div>
                  </CardFooter>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Statistics */}
        {filteredNovels.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            共 {filteredNovels.length} 个项目
            {searchTerm && ` (搜索结果)`}
          </div>
        )}
      </main>
    </div>
  );
}
