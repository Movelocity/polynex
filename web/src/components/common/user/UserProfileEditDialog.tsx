import React, { useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { AlertCircle, Check, Edit } from 'lucide-react';
import { ClientUser } from '@/types';

interface UserProfileEditDialogProps {
  user: ClientUser;
  onUpdate: (updates: { username?: string; email?: string }) => Promise<{ success: boolean; message: string }>;
  trigger?: React.ReactNode;
}

export function UserProfileEditDialog({ user, onUpdate, trigger }: UserProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查是否有修改
    if (username === user.username && email === user.email) {
      setError('没有检测到任何更改');
      return;
    }

    // 基本验证
    if (!username.trim()) {
      setError('用户名不能为空');
      return;
    }

    if (!email.trim()) {
      setError('邮箱不能为空');
      return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updates: { username?: string; email?: string } = {};
      
      if (username !== user.username) {
        updates.username = username.trim();
      }
      
      if (email !== user.email) {
        updates.email = email.trim();
      }

      const result = await onUpdate(updates);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          setOpen(false);
          setSuccess('');
          setError('');
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('更新用户资料失败:', error);
      setError('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen);
      if (!newOpen) {
        // 重置表单
        setUsername(user.username);
        setEmail(user.email);
        setError('');
        setSuccess('');
      }
    }
  };

  const defaultTrigger = (
    <Button variant="outline">
      <Edit className="w-4 h-4 mr-2" />
      编辑资料
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>
            修改您的用户名和邮箱地址。用户名和邮箱必须是唯一的。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/20 bg-success/5">
              <Check className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              disabled={loading}
              required
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 