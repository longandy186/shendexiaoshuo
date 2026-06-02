'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Save, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { showInfo, showError } from '@/lib/toast-utils';

export default function NewNovelPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
  });

  // 认证检查
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 如果正在加载或未登录，显示加载状态
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showInfo('请输入小说标题');
      return;
    }

    setIsLoading(true);

    try {
      // 调用 API 创建新小说
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          genre: formData.genre || '未分类',
          description: formData.description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || '创建小说失败');
      }

      // 跳转到编辑器
      router.push(`/novel/${result.data.id}/editor`);
    } catch (error) {
      console.error('创建小说失败:', error);
      showError('创建小说失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 顶部导航 */}
      <nav className="bg-white dark:bg-gray-900 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                神的小说工坊
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {user.username}
              </span>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  返回首页
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* 返回按钮 */}
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>

          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              创建新小说
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              填写小说基本信息，开启你的AI创作之旅
            </p>
          </div>

          {/* 表单 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                小说信息
              </CardTitle>
              <CardDescription>
                完善基本信息，AI将根据这些信息为你提供创作辅助
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 小说标题 */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    小说标题 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="输入你的小说标题"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={isLoading}
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.title.length}/100 字符
                  </p>
                </div>

                {/* 小说类型 */}
                <div className="space-y-2">
                  <Label htmlFor="genre">
                    小说类型
                  </Label>
                  <Select
                    value={formData.genre}
                    onValueChange={(value) => setFormData({ ...formData, genre: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="genre">
                      <SelectValue placeholder="选择小说类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="玄幻">玄幻</SelectItem>
                      <SelectItem value="仙侠">仙侠</SelectItem>
                      <SelectItem value="都市">都市</SelectItem>
                      <SelectItem value="历史">历史</SelectItem>
                      <SelectItem value="科幻">科幻</SelectItem>
                      <SelectItem value="武侠">武侠</SelectItem>
                      <SelectItem value="奇幻">奇幻</SelectItem>
                      <SelectItem value="军事">军事</SelectItem>
                      <SelectItem value="游戏">游戏</SelectItem>
                      <SelectItem value="体育">体育</SelectItem>
                      <SelectItem value="灵异">灵异</SelectItem>
                      <SelectItem value="同人">同人</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 小说简介 */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    小说简介
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="输入你的小说简介（可选）"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isLoading}
                    rows={5}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.description.length}/500 字符
                  </p>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Link href="/">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                    >
                      取消
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        创建小说
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
