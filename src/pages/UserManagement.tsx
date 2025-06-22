import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientUser } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, fileService } from '@/services';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/x-ui/table';
import { Badge } from '@/components/x-ui/badge';
import { Input } from '@/components/x-ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/x-ui/alert-dialog';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  Users, 
  Shield, 
  User,
  Search,
  Edit,
  Trash2,
  RotateCcw,
  UserCheck,
  UserX
} from 'lucide-react';

export function UserManagement() {
  // 设置页面标题
  useTitle('用户管理');
  
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, admins: 0, users: 0 });
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ClientUser | null>(null);
  
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (currentUser && !authLoading) {
      // 检查是否为管理员
      if (currentUser.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      loadUsers();
      loadStats();
    }
  }, [currentUser, authLoading, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const userList = await adminService.getAllUsers();
      setUsers(userList.sort((a, b) => new Date(b.registerTime).getTime() - new Date(a.registerTime).getTime()));
    } catch (err) {
      console.error('加载用户列表失败:', err);
      setError('加载用户列表失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminService.getUserStats();
      setStats(statsData);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const success = await adminService.deleteUser(userId);
      if (success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        loadStats(); // 重新加载统计数据
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const success = await adminService.updateUserRole(userId, newRole);
      if (success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        loadStats(); // 重新加载统计数据
      }
    } catch (error) {
      console.error('更新用户角色失败:', error);
    }
  };

  // 筛选用户
  const filteredUsers = users.filter(user => {
    if (!debouncedSearchQuery.trim()) return true;
    
    const query = debouncedSearchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">权限不足</h2>
          <p className="text-slate-600 mb-4">您需要管理员权限才能访问此页面</p>
          <Button onClick={() => navigate('/dashboard')}>
            返回控制台
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadUsers} variant="outline">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账户和权限</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              系统注册用户总数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理员数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              拥有管理权限的用户
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">普通用户数</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.users}</div>
            <p className="text-xs text-muted-foreground">
              普通用户账户数量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                用户列表
              </CardTitle>
              <CardDescription>
                管理所有系统用户
              </CardDescription>
            </div>
            
            {/* 搜索框 */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="搜索用户名、邮箱或角色..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          {user.avatar ? (
                            <img 
                              src={fileService.resolveFileUrl(user.avatar)} 
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                          <span>{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.registerTime).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* 切换角色按钮 暂时关闭 */}
                          {/* {user.id !== currentUser.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRole(user.id, user.role)}
                              className="h-8 px-2"
                            >
                              {user.role === 'admin' ? (
                                <UserX className="h-3 w-3" />
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                            </Button>
                          )} */}
                          
                          {/* 删除按钮 */}
                          {user.id !== currentUser.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmUser(user)}
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-600 mb-2">
                {debouncedSearchQuery.trim() 
                  ? `没有找到包含"${debouncedSearchQuery}"的用户`
                  : '暂无用户数据'
                }
              </h3>
              <p className="text-slate-500">
                {debouncedSearchQuery.trim()
                  ? '尝试使用其他关键词搜索'
                  : '用户数据还未加载完成'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog 
        open={deleteConfirmUser !== null} 
        onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除用户「{deleteConfirmUser?.username}」吗？此操作将永久删除该用户的所有数据，无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmUser) {
                  handleDeleteUser(deleteConfirmUser.id);
                  setDeleteConfirmUser(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 