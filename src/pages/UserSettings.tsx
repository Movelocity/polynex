import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { Badge } from '@/components/x-ui/badge';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { AvatarUpload } from '@/components/common/user/AvatarUpload';
import { FileUploadArea } from '@/components/common/file/FileUploadArea';
import { FileList } from '@/components/common/FileList';
import { PasswordChangeDialog } from '@/components/common/PasswordChangeDialog';
import { UserProfileInfo } from '@/components/common/UserProfileInfo';
import { userService, fileService } from '@/services';

export function UserSettings() {
  const { user, updatePassword, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // File management state
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  // 组件加载时自动加载文件列表
  useEffect(() => {
    loadUserFiles();
  }, []);

  // 头像上传处理
  const handleAvatarUpload = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    try {
      // 直接使用userService上传头像，传递Blob
      const result = await userService.uploadAvatar(croppedBlob);
      
      if (result.success && result.user) {
        // 更新用户信息
        if (updateUser) {
          updateUser(result.user);
        }
        
        setSuccess('头像更新成功！');
        setError('');
      } else {
        throw new Error(result.message || '头像上传失败');
      }
    } catch (err: any) {
      console.error('头像上传失败:', err);
      setError(err.message || '头像上传失败，请重试');
      throw err; // 重新抛出错误让子组件处理
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 加载用户文件列表
  const loadUserFiles = async () => {
    setLoadingFiles(true);
    try {
      const files = await fileService.getUserFiles();
      setUserFiles(files);
    } catch (err: any) {
      console.error('加载文件列表失败:', err);
      setError('加载文件列表失败');
    } finally {
      setLoadingFiles(false);
    }
  };

  // 删除文件
  const handleFileDelete = async (uniqueId: string, extension: string) => {
    try {
      const success = await fileService.deleteFile(uniqueId, extension);
      if (success) {
        setUserFiles(prev => prev.filter(file => file.unique_id !== uniqueId));
        setSuccess('文件删除成功');
      } else {
        throw new Error('文件删除失败');
      }
    } catch (err: any) {
      setError(err.message || '文件删除失败');
    }
  };



  // 文件上传处理
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let uploadedCount = 0;
    let hasErrors = false;
    
    // 清除之前的消息
    setError('');
    setSuccess('');
    
    setUploadingFile(true);
    
    for (const file of fileArray) {
      // 验证文件类型
      if (!fileService.isSupportedFileType(file)) {
        setError(`不支持的文件类型: ${file.name}`);
        hasErrors = true;
        continue;
      }

      // 验证文件大小（50MB）
      if (!fileService.isValidFileSize(file, 50)) {
        setError(`文件过大: ${file.name}，最大支持50MB`);
        hasErrors = true;
        continue;
      }
      
      try {
        const result = await fileService.uploadFile(file);
        
        if (result.file) {
          // 添加到文件列表
          setUserFiles(prev => [result.file, ...prev]);
          uploadedCount++;
        }
      } catch (err: any) {
        console.error('文件上传失败:', err);
        setError(`文件 ${file.name} 上传失败: ${err.message || '未知错误'}`);
        hasErrors = true;
      }
    }
    
    setUploadingFile(false);
    setUploadProgress(0);
    
    // 显示上传结果
    if (uploadedCount > 0) {
      setSuccess(`成功上传 ${uploadedCount} 个文件！`);
      // 自动刷新文件列表以确保数据同步
      setTimeout(() => {
        loadUserFiles();
      }, 1000);
    }
    
    if (!hasErrors && uploadedCount === 0) {
      setError('没有文件被上传');
    }
  };

  // 密码修改处理
  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess(result.message);
        setError('');
      }
      return result;
    } catch (err) {
      console.error('密码修改失败:', err);
      const errorMessage = '密码修改失败，请重试';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Handle password dialog
  const handlePasswordDialogChange = (open: boolean) => {
    setIsPasswordDialogOpen(open);
    if (!open) {
      // Clear global messages when dialog closes
      setError('');
      setSuccess('');
    }
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

      {/* 全局消息提示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-success/20 bg-success/5">
          <Check className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile">个人信息</TabsTrigger>
          <TabsTrigger value="files">文件管理</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>个人信息</CardTitle>
              <CardDescription>管理您的头像和账户基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AvatarUpload
                user={user}
                onAvatarUpload={handleAvatarUpload}
                uploading={uploadingAvatar}
                onError={setError}
              />

              <UserProfileInfo user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>文件管理</CardTitle>
              <CardDescription>上传、查看、下载和删除您的文件</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadArea
                onFileUpload={handleFileUpload}
                uploading={uploadingFile}
                uploadProgress={uploadProgress}
              />

              <FileList
                files={userFiles}
                loading={loadingFiles}
                onDelete={handleFileDelete}
                onRefresh={loadUserFiles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>密码管理</CardTitle>
              <CardDescription>管理您的账户密码</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
                <div>
                  <h4 className="font-medium">账户密码</h4>
                  <p className="text-sm text-muted-foreground mt-1">定期更改密码可以提高账户安全性</p>
                </div>
                <PasswordChangeDialog
                  open={isPasswordDialogOpen}
                  onOpenChange={handlePasswordDialogChange}
                  onPasswordChange={handlePasswordChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>其他安全设置</CardTitle>
              <CardDescription>更多安全相关的设置选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">两步验证</h4>
                  <p className="text-sm text-muted-foreground mt-1">增加额外的安全保护层</p>
                </div>
                <Badge variant="secondary">即将推出</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">登录历史</h4>
                  <p className="text-sm text-muted-foreground mt-1">查看您的账户登录记录</p>
                </div>
                <Badge variant="secondary">即将推出</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
} 