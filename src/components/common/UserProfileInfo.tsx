import React from 'react';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface UserProfileInfoProps {
  user: User;
}

export function UserProfileInfo({ user }: UserProfileInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label className="text-slate-600">用户名</Label>
        <p className="mt-1 font-medium">{user.username}</p>
      </div>
      <div>
        <Label className="text-slate-600">邮箱</Label>
        <p className="mt-1 font-medium">{user.email}</p>
      </div>
      <div>
        <Label className="text-slate-600">用户ID</Label>
        <p className="mt-1 font-medium text-slate-500">{user.id}</p>
      </div>
      <div>
        <Label className="text-slate-600">账户类型</Label>
        <p className="mt-1 font-medium">
          {user.role === 'admin' ? '管理员' : '普通用户'}
          {user.role === 'admin' && (
            <Badge variant="default" className="ml-2">Admin</Badge>
          )}
        </p>
      </div>
    </div>
  );
} 