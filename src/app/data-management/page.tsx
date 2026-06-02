'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Database, Download, Upload, RefreshCw, Trash2, CheckCircle2, AlertTriangle, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { getStorageStats, exportAllData, exportNovel, importData, getAllNovels, createBackup, getBackups, restoreBackup, deleteBackup, clearAllData, validateDataIntegrity, type StorageStats, type ExportData, type BackupRecord } from '@/lib/storage';

export default function DataManagementPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [novels, setNovels] = useState(getAllNovels());
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<'all' | 'novel'>('all');
  const [selectedNovelId, setSelectedNovelId] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadStats();
    loadBackups();
  }, []);

  const loadStats = () => {
    setStats(getStorageStats());
    setNovels(getAllNovels());
  };

  const loadBackups = () => {
    setBackups(getBackups());
  };

  const handleExport = () => {
    let data: ExportData;
    if (selectedExportType === 'all') {
      data = exportAllData();
    } else if (selectedNovelId) {
      data = exportNovel(selectedNovelId)!;
    } else {
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsProcessing(true);
    try {
      const text = await importFile.text();
      const data: ExportData = JSON.parse(text);
      const result = importData(data, false);

      if (result.success) {
        alert(result.message);
        loadStats();
        setIsImportDialogOpen(false);
        setImportFile(null);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('导入失败：文件格式错误');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateBackup = () => {
    const backupId = createBackup();
    alert('备份创建成功');
    loadBackups();
    setIsBackupDialogOpen(false);
  };

  const handleRestoreBackup = (backupId: string) => {
    if (confirm('恢复备份将覆盖当前所有数据，确定要继续吗？')) {
      const result = restoreBackup(backupId);
      if (result.success) {
        alert('恢复成功');
        loadStats();
        loadBackups();
      } else {
        alert(result.message);
      }
    }
  };

  const handleDeleteBackup = (backupId: string) => {
    if (confirm('确定要删除这个备份吗？')) {
      deleteBackup(backupId);
      loadBackups();
    }
  };

  const handleClearData = () => {
    if (confirm('警告：此操作将清空所有数据且无法恢复！确定要继续吗？')) {
      clearAllData();
      alert('数据已清空');
      loadStats();
      loadBackups();
      setIsClearDialogOpen(false);
    }
  };

  const handleValidate = () => {
    const result = validateDataIntegrity();
    setValidationResult(result);
  };

  const handleDeleteNovel = (novelId: string, title: string) => {
    if (confirm(`确定要删除小说《${title}》吗？此操作不可恢复！`)) {
      const { deleteNovel } = require('@/lib/storage');
      deleteNovel(novelId);
      loadStats();
      alert('小说已删除');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
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
                  数据管理
                </h1>
                <p className="text-sm text-gray-600">管理系统数据及备份</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/users">
                <Button variant="outline" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  用户管理
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">小说总数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalNovels || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">角色总数</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCharacters || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">章节总数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChapters || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">存储空间</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats ? formatBytes(stats.storageSize) : '0 B'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                导出数据
              </CardTitle>
              <CardDescription>
                将您的创作数据导出为 JSON 文件，便于备份或迁移
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">导出类型</label>
                <Select value={selectedExportType} onValueChange={(value: any) => setSelectedExportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部数据</SelectItem>
                    <SelectItem value="novel">单个小说</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedExportType === 'novel' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择小说</label>
                  <Select value={selectedNovelId} onValueChange={setSelectedNovelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择小说" />
                    </SelectTrigger>
                    <SelectContent>
                      {novels.map(novel => (
                        <SelectItem key={novel.id} value={novel.id}>{novel.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleExport} className="w-full" disabled={selectedExportType === 'novel' && !selectedNovelId}>
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                导入数据
              </CardTitle>
              <CardDescription>
                从 JSON 文件导入数据，可选择是否覆盖现有内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsImportDialogOpen(true)} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                导入数据
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                备份管理
              </CardTitle>
              <CardDescription>
                创建和管理数据备份，保护您的创作成果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => setIsBackupDialogOpen(true)} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                创建备份
              </Button>
              {backups.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  共有 {backups.length} 个备份
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                数据维护
              </CardTitle>
              <CardDescription>
                验证数据完整性，清理无效数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleValidate} variant="outline" className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                验证数据完整性
              </Button>
              <Button onClick={() => setIsClearDialogOpen(true)} variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                清空所有数据
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Backups List */}
        {backups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>备份列表</CardTitle>
              <CardDescription>最近的备份记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(backup.date)} · {backup.novelsCount} 部小说 · {formatBytes(backup.size)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreBackup(backup.id)}
                      >
                        恢复
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBackup(backup.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Novels List */}
        <Card>
          <CardHeader>
            <CardTitle>小说列表</CardTitle>
            <CardDescription>管理您的所有小说项目</CardDescription>
          </CardHeader>
          <CardContent>
            {novels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无小说项目</p>
                <Link href="/novel/new">
                  <Button className="mt-4">
                    创建新小说
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {novels.map(novel => (
                  <div key={novel.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link href={`/novel/${novel.id}`} className="font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                          {novel.title}
                        </Link>
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {novel.genre}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          novel.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : novel.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {novel.status === 'completed' ? '已完成' : novel.status === 'ongoing' ? '创作中' : '草稿'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {novel.description || '暂无描述'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {novel.characters?.length || 0} 个角色 · {novel.chapters?.length || 0} 个章节 · {formatDate(novel.updatedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link href={`/novel/${novel.id}`}>
                        <Button size="sm" variant="outline">
                          编辑
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteNovel(novel.id, novel.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validationResult && (
          <Card className={validationResult.valid ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    数据完整
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    发现问题
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationResult.valid ? (
                <p className="text-sm text-muted-foreground">所有数据验证通过，没有发现问题。</p>
              ) : (
                <ul className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400">
                      • {error}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入数据</DialogTitle>
            <DialogDescription>
              选择一个 JSON 文件导入数据
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id="import-file"
                className="hidden"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                  }
                }}
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  点击选择文件
                </p>
                <p className="text-xs text-muted-foreground">
                  支持 JSON 格式
                </p>
              </label>
              {importFile && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(importFile.size)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleImport}
                disabled={!importFile || isProcessing}
              >
                {isProcessing ? '导入中...' : '开始导入'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空所有数据</DialogTitle>
            <DialogDescription>
              此操作将删除所有小说、角色、章节和世界观设定，且无法恢复！
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              确认清空
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
