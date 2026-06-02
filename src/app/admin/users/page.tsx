'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Eye,
  RefreshCw,
  ArrowLeft,
  UserPlus,
  AlertTriangle,
  Calendar,
  FileText,
  ShoppingBag,
  Users as UsersIcon,
  Database,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/date-utils';

interface User {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  updatedAt: string;
}

interface UserStats {
  total: number;
  active: number;
  recentActive: number; // 48小时内登录
  suspended: number;
  banned: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    recentActive: 0,
    suspended: 0,
    banned: 0,
  });

  // 认证检查
  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">您没有权限访问此页面</p>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
      });

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const result = await response.json();

      if (result.code === 200) {
        setUsers(result.data.users);
        setTotalPages(result.data.pagination.totalPages);
        setTotal(result.data.pagination.total);
      } else {
        toast.error(result.msg);
        if (result.code === 403) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户统计数据
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const result = await response.json();
      if (result.code === 200 && result.data?.stats?.users) {
        const userStats = result.data.stats.users;
        setStats({
          total: userStats.total || 0,
          active: userStats.active || 0,
          recentActive: userStats.recentActive || 0,
          suspended: userStats.suspended || 0,
          banned: userStats.banned || 0,
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, searchTerm, statusFilter, roleFilter]);

  // 更新用户状态
  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.code === 200) {
        toast.success('用户状态已更新');
        fetchUsers();
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
      toast.error('更新用户状态失败');
    }
  };

  // 删除用户
  const deleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可撤销！')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.code === 200) {
        toast.success('用户已删除');
        fetchUsers();
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      toast.error('删除用户失败');
    }
  };

  // 查看用户详情
  const viewUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const result = await response.json();

      if (result.code === 200) {
        setSelectedUser(result.data);
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('获取用户详情失败:', error);
      toast.error('获取用户详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  // 状态显示
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { text: string; icon: any; color: string }> = {
      active: { text: '正常', icon: ShieldCheck, color: 'text-green-600 bg-green-50' },
      suspended: { text: '暂停', icon: Shield, color: 'text-yellow-600 bg-yellow-50' },
      banned: { text: '封禁', icon: ShieldAlert, color: 'text-red-600 bg-red-50' },
      deleted: { text: '已删除', icon: Trash2, color: 'text-gray-600 bg-gray-50' },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </span>
    );
  };

  // 角色显示
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { text: string; color: string }> = {
      admin: { text: '管理员', color: 'bg-purple-100 text-purple-700' },
      user: { text: '用户', color: 'bg-blue-100 text-blue-700' },
    };

    const config = roleConfig[role] || roleConfig.user;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  用户管理
                </h1>
                <p className="text-sm text-gray-600">管理系统用户及权限</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/data-management">
                <Button variant="outline" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据管理
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">总用户数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">活跃用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.recentActive}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                48h内登录
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">正常用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.active}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                状态正常
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">暂停用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.suspended}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">封禁用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.banned}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索邮箱或用户名..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                  <SelectItem value="banned">封禁</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="角色筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username || '未设置'}
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? formatDate(user.lastLoginAt)
                          : '从未登录'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* 查看详情按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewUserDetail(user.id)}
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* 状态操作 */}
                          <Select
                            onValueChange={(value) => updateUserStatus(user.id, value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="状态" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">正常</SelectItem>
                              <SelectItem value="suspended">暂停</SelectItem>
                              <SelectItem value="banned">封禁</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* 删除按钮 */}
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteUser(user.id)}
                            disabled={user.email === 'longandy@163.com'}
                            title={user.email === 'longandy@163.com' ? '不能删除超级管理员' : '删除用户'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm text-gray-600">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              下一页
            </Button>
          </div>
        )}

        {/* 用户详情弹窗 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-2xl">用户详情</DialogTitle>
              <DialogDescription>查看用户的详细信息和使用数据</DialogDescription>
            </DialogHeader>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : selectedUser ? (
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* 用户基本信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">用户名</Label>
                        <p className="font-medium">{selectedUser.user?.username || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">邮箱</Label>
                        <p className="font-medium">{selectedUser.user?.email || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">角色</Label>
                        <p className="font-medium">{selectedUser.user?.role === 'admin' ? '管理员' : '用户'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">状态</Label>
                        <div>{getStatusBadge(selectedUser.user?.status)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">注册时间</Label>
                        <p className="font-medium">
                          {selectedUser.user?.createdAt ? new Date(selectedUser.user.createdAt).toLocaleString('zh-CN') : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">最后登录</Label>
                        <p className="font-medium">
                          {selectedUser.user?.lastLoginAt ? new Date(selectedUser.user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 会员信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">会员信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">是否会员</Label>
                        <p className="font-medium">{selectedUser.user?.is_premium ? '是' : '否'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">会员到期时间</Label>
                        <p className="font-medium">
                          {formatDate(selectedUser.user?.premium_expires_at) || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">推荐码</Label>
                        <p className="font-medium">{selectedUser.user?.referral_code || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">推荐奖励天数</Label>
                        <p className="font-medium">{selectedUser.user?.referral_rewards || 0} 天</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 使用数据统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">使用数据统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingBag className="h-5 w-5 text-blue-600" />
                          <span className="text-sm text-gray-600">订单总数</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{selectedUser.stats?.totalOrders || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingBag className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-gray-600">已支付订单</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{selectedUser.stats?.paidOrders || 0}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="text-sm text-gray-600">小说总数</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{selectedUser.stats?.totalNovels || 0}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-orange-600" />
                          <span className="text-sm text-gray-600">章节总数</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">{selectedUser.stats?.totalChapters || 0}</p>
                      </div>
                      <div className="p-4 bg-pink-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <UsersIcon className="h-5 w-5 text-pink-600" />
                          <span className="text-sm text-gray-600">推荐人数</span>
                        </div>
                        <p className="text-2xl font-bold text-pink-600">{selectedUser.stats?.totalReferrals || 0}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingBag className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm text-gray-600">总消费金额</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">¥{(selectedUser.stats?.totalRevenue || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 最近订单 */}
                {selectedUser.orders && selectedUser.orders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">最近订单</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedUser.orders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{order.planName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">¥{parseFloat(order.amount || '0').toFixed(2)}</p>
                              <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                                {order.status === 'paid' ? '已支付' : '待支付'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </div>
  );
}
