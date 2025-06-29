import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { UserManagement } from './UserManagement';
import { Label } from '@/components/x-ui/label';
import { ArrowLeft } from 'lucide-react';
import { AvatarUpload } from '@/components/common/user/AvatarUpload';
import { UserProfileEditDialog } from '@/components/common/user/UserProfileEditDialog';
import { PasswordChangeDialog } from '@/components/common/PasswordChangeDialog';
import { fileService } from '@/services';
import { toast } from '@/hooks/use-toast';

export function UserSettings() {
  const { user, updatePassword, updateUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // 由于组件已被 ProtectedRoute 保护，user 状态已确保存在
  // 但在 TypeScript 中仍需类型保护
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // 头像上传处理
  const handleAvatarUpload = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    try {
      // 直接使用blob改为file
      const result = await fileService.uploadAvatar(new File([croppedBlob], 'avatar.jpg'));
      
      if (result.user) {
        // 更新用户信息
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
      throw err; // 重新抛出错误让子组件处理
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

  // Handle password dialog
  const handlePasswordDialogChange = (open: boolean) => {
    setIsPasswordDialogOpen(open);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold text-foreground">账户设置</h1>
        </div>
      </div>

      {/* 个人档案区域 */}
      <Card>
        <CardHeader>
          <CardTitle>个人档案</CardTitle>
          <CardDescription>管理您的头像和基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 个人用户信息 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-row gap-4">
              {/* 头像区域 */}
              <div className="flex-shrink-0">
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

              {/* 用户名和邮箱区域 */}
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-semibold">{user.username}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            
            {/* 用户信息区域 */}
            <div className="flex-1 min-w-0 grid grid-cols-1 gap-4 text-foreground">
              <div>
                <Label>用户ID</Label>
                <p className="mt-1 text-sm text-muted-foreground">{user.id}</p>
              </div>
              <div>
                <Label>账户类型</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {user.role === 'admin' ? '管理员' : '普通用户'}
                </div>
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-center gap-2">
              <UserProfileEditDialog 
                user={user} 
                onUpdate={updateUserProfile}
              />
              <PasswordChangeDialog
                open={isPasswordDialogOpen}
                onOpenChange={handlePasswordDialogChange}
                onPasswordChange={handlePasswordChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 管理员功能 */}
      {user.role === 'admin' && (
        <UserManagement />
      )}
    </div>
  );
} 