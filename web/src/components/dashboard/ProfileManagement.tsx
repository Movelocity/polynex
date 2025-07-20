import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Label } from '@/components/x-ui/label';
import { AvatarUpload } from '@/components/common/user/AvatarUpload';
import { UserProfileEditDialog } from '@/components/common/user/UserProfileEditDialog';
import { PasswordChangeDialog } from '@/components/common/PasswordChangeDialog';
import { fileService } from '@/services';
import { toast } from '@/hooks/use-toast';

export function ProfileManagement() {
  const { user, updatePassword, updateUser, updateUserProfile } = useAuth();

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // 头像上传处理
  const handleAvatarUpload = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    try {
      const result = await fileService.uploadAvatar(new File([croppedBlob], 'avatar.jpg'));
      
      if (result.user) {
        if (updateUser) {
          updateUser(result.user);
        }
        toast({
          title: "头像更新成功",
          description: "头像更新成功！",
        });
      } else {
        throw new Error(result.message || '头像上传失败');
      }
    } catch (err: any) {
      toast({
        title: "头像上传失败",
        description: err.message || '头像上传失败，请重试',
        variant: "destructive",
      });
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 密码修改处理
  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        toast({
          title: "密码修改成功",
          description: result.message,
        });
      }
      return result;
    } catch (err) {
      console.error('密码修改失败:', err);
      const errorMessage = '密码修改失败，请重试';
      toast({
        title: "密码修改失败",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, message: errorMessage };
    }
  };

  return (
    <div>
      <CardHeader>
        <CardTitle>个人档案</CardTitle>
        <CardDescription>管理您的头像和基本信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-20 gap-y-4 text-foreground" style={{ gridTemplateColumns: 'max-content 1fr' }}>
          <div className="font-medium">头像</div>
          <div className="flex items-center gap-2">
            <AvatarUpload
              user={user}
              onAvatarUpload={handleAvatarUpload}
              uploading={uploadingAvatar}
              onError={(error) => {
                toast({
                  title: "头像上传失败",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </div>

          <div className="font-medium">用户名</div>
          <div className="text-muted-foreground">{user.username}</div>

          <div className="font-medium">邮箱</div>
          <div className="text-muted-foreground">{user.email}</div>

          <div className="font-medium">用户ID</div>
          <div className="text-muted-foreground">{user.id}</div>

          <div className="font-medium">账户类型</div>
          <div className="text-muted-foreground">
            {user.role === 'admin' ? '管理员' : '普通用户'}
          </div>

          <div className="font-medium">基本资料编辑</div>
          <div>
            <UserProfileEditDialog 
              user={user} 
              onUpdate={updateUserProfile}
            />
          </div>

          <div className="font-medium">修改密码</div>
          <div>
            <PasswordChangeDialog
              open={isPasswordDialogOpen}
              onOpenChange={setIsPasswordDialogOpen}
              onPasswordChange={handlePasswordChange}
            />
          </div>
        </div>
      </CardContent>
    </div>
  );
} 