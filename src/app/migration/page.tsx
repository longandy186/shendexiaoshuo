'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Database, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// 禁用静态导出，强制动态渲染
export const dynamic = 'force-dynamic';

interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: string[];
}

export default function DataMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  // 检查localStorage中是否有数据
  const hasLocalData = (): boolean => {
    if (typeof window === 'undefined') return false;
    const novels = localStorage.getItem('ai_novels');
    return !!novels && novels.length > 2; // 至少有 '[' ']' 和一些内容
  };

  // 读取localStorage中的数据
  const getLocalData = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const novels = localStorage.getItem('ai_novels');
      return novels ? JSON.parse(novels) : [];
    } catch (error) {
      console.error('读取localStorage失败:', error);
      return [];
    }
  };

  // 执行迁移
  const handleMigration = async () => {
    const novels = getLocalData();

    if (novels.length === 0) {
      toast.error('本地没有数据需要迁移');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novels }),
      });

      const data = await response.json();

      if (data.code === 200) {
        setResult(data.data);

        if (data.data.migrated > 0) {
          toast.success(`成功迁移 ${data.data.migrated} 部小说`);
        }

        if (data.data.skipped > 0) {
          toast.info(`跳过 ${data.data.skipped} 部已存在的小说`);
        }

        if (data.data.errors.length > 0) {
          toast.warning(`迁移过程中遇到 ${data.data.errors.length} 个错误`);
        }
      } else {
        toast.error(data.msg || '迁移失败');
      }
    } catch (error) {
      console.error('迁移失败:', error);
      toast.error('迁移失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 清空localStorage中的数据
  const handleClearLocalData = () => {
    if (window.confirm('确定要清空本地数据吗？此操作不可恢复！')) {
      localStorage.removeItem('ai_novels');
      localStorage.removeItem('ai_novels_backups');
      localStorage.removeItem('ai_novels_metadata');
      toast.success('本地数据已清空');
      setResult(null);
    }
  };

  const hasData = hasLocalData();
  const localData = getLocalData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">数据迁移工具</h1>
          <p className="text-gray-600">
            将浏览器中的小说数据迁移到数据库，确保数据安全和跨设备同步
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                浏览器数据
              </CardTitle>
              <CardDescription>存储在localStorage中的数据</CardDescription>
            </CardHeader>
            <CardContent>
              {hasData ? (
                <div>
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">发现 {localData.length} 部小说</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {localData.reduce((sum: number, n: any) => sum + n.chapters?.length || 0, 0)} 个章节，
                    {localData.reduce((sum: number, n: any) => sum + n.characters?.length || 0, 0)} 个角色
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>没有本地数据</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                数据库数据
              </CardTitle>
              <CardDescription>存储在数据库中的数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">数据已同步到云端</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                可在任意设备访问，数据更安全
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 迁移结果 */}
        {result && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>迁移结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">成功迁移 {result.migrated} 部</span>
                  </div>
                  {result.skipped > 0 && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">跳过 {result.skipped} 部（已存在）</span>
                    </div>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="font-medium text-red-800 mb-2">错误详情：</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.migrated > 0 && result.errors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-green-800">
                      🎉 恭喜！数据迁移成功。您现在可以清空浏览器中的本地数据了。
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {hasData && (
            <Button
              onClick={handleMigration}
              disabled={loading}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  迁移中...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  迁移到数据库
                </>
              )}
            </Button>
          )}

          {result && result.migrated > 0 && (
            <Button
              onClick={handleClearLocalData}
              variant="outline"
              size="lg"
            >
              清空本地数据
            </Button>
          )}

          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            size="lg"
          >
            返回首页
          </Button>
        </div>

        {/* 说明信息 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">迁移说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>1. <strong>迁移到数据库</strong>：将浏览器中的小说数据上传到数据库，实现跨设备同步。</p>
            <p>2. <strong>数据安全</strong>：数据库存储更安全，不会因为浏览器缓存清理而丢失数据。</p>
            <p>3. <strong>清空本地数据</strong>：迁移成功后，建议清空浏览器中的本地数据以节省空间。</p>
            <p>4. <strong>已存在的数据</strong>：如果数据库中已有相同ID的小说，会自动跳过，不会重复创建。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
