import { useState, useEffect } from 'react';
import { ClientUser, InviteCodeConfig } from '@/types';
import { adminService, fileService } from '@/services';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/x-ui/table';
import { Badge } from '@/components/x-ui/badge';
import { Input } from '@/components/x-ui/input';
import { Switch } from '@/components/x-ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/x-ui/alert-dialog';
import {
  Users,
  Search,
  Trash2,
  Key,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/common/user/UserAvatar';

export function UserManagement() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ClientUser | null>(null);

  // 邀请码配置相关状态
  const [inviteCodeConfig, setInviteCodeConfig] = useState<InviteCodeConfig>({
    require_invite_code: false,
    invite_code: ''
  });
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);
  const [inviteCodeUpdating, setInviteCodeUpdating] = useState(false);
  const [switchUpdating, setSwitchUpdating] = useState(false);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadUsers();
    loadInviteCodeConfig();
  }, []);

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

  const loadInviteCodeConfig = async () => {
    setInviteCodeLoading(true);
    try {
      const config = await adminService.getInviteCodeConfig();
      setInviteCodeConfig(config);
    } catch (err) {
      console.error('加载邀请码配置失败:', err);
      toast({
        title: "加载失败",
        description: "加载邀请码配置失败，请刷新页面重试",
        variant: "destructive",
      });
    } finally {
      setInviteCodeLoading(false);
    }
  };

  const handleUpdateInviteCodeConfig = async () => {
    setInviteCodeUpdating(true);
    try {
      const result = await adminService.updateInviteCodeConfig(inviteCodeConfig);
      if (result.success) {
        toast({
          title: "配置更新成功",
          description: result.message,
        });
      } else {
        toast({
          title: "配置更新失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('更新邀请码配置失败:', err);
      toast({
        title: "配置更新失败",
        description: "更新邀请码配置失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setInviteCodeUpdating(false);
    }
  };

  const handleSwitchToggle = async (checked: boolean) => {
    setSwitchUpdating(true);
    const newConfig = { ...inviteCodeConfig, require_invite_code: checked };
    
    try {
      const result = await adminService.updateInviteCodeConfig(newConfig);
      if (result.success) {
        // 更新成功后才更新本地状态
        setInviteCodeConfig(newConfig);
        toast({
          title: "配置更新成功",
          description: checked ? "已启用邀请码功能" : "已禁用邀请码功能",
        });
      } else {
        toast({
          title: "配置更新失败",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('更新邀请码开关失败:', err);
      toast({
        title: "配置更新失败",
        description: "更新邀请码开关失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSwitchUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const success = await adminService.deleteUser(userId);
      if (success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!debouncedSearchQuery.trim()) return true;
    
    const query = debouncedSearchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center">
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>邀请码设置</CardTitle>
          <CardDescription>管理新用户注册时是否需要邀请码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Switch
              id="require-invite-code"
              checked={inviteCodeConfig.require_invite_code}
              onCheckedChange={handleSwitchToggle}
              disabled={switchUpdating || inviteCodeLoading}
            />
            <label htmlFor="require-invite-code" className="text-sm font-medium">
              {inviteCodeConfig.require_invite_code ? '已启用邀请码' : '已禁用邀请码'}
            </label>
          </div>
          {inviteCodeConfig.require_invite_code && (
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={inviteCodeConfig.invite_code}
                onChange={(e) => setInviteCodeConfig(prev => ({ ...prev, invite_code: e.target.value }))}
                placeholder="输入新的邀请码"
                className="max-w-xs"
                disabled={inviteCodeUpdating || inviteCodeLoading}
              />
              <Button onClick={handleUpdateInviteCodeConfig} disabled={inviteCodeUpdating || inviteCodeLoading}>
                <Save className="w-4 h-4 mr-2" />
                {inviteCodeUpdating ? '保存中...' : '保存'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>管理系统中的所有用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="按用户名、邮箱或角色搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <UserAvatar user={user} size="md" />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.registerTime).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmUser(user)}
                          disabled={user.role === 'admin'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      没有找到匹配的用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmUser !== null} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可逆，将永久删除用户 <strong>{deleteConfirmUser?.username}</strong> 的账户及其所有相关数据。
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
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 