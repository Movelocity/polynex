import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageCropperDialog } from '@/components/ui/ImageCropperDialog';
import { 
  User, 
  Lock, 
  ArrowLeft, 
  Save,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Upload,
  Camera,
  File,
  Trash2,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { userService, fileService } from '@/services';

export function UserSettings() {
  const { user, updatePassword, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // File management state
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filePreview, setFilePreview] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  // Form states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 检查文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      setError('图片文件大小不能超过2MB');
      return;
    }

    // 创建预览URL
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropDialog(true);
    setError('');
  };

  // 头像裁剪完成
  const handleAvatarCrop = async (croppedBlob: Blob) => {
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

      // 清理预览URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage('');
      }

    } catch (err: any) {
      console.error('头像上传失败:', err);
      setError(err.message || '头像上传失败，请重试');
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
  const deleteFile = async (uniqueId: string, extension: string) => {
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

  // 预览图片
  const previewImage = (fileUrl: string) => {
    setFilePreview(fileService.resolveFileUrl(fileUrl));
    setShowFilePreview(true);
  };

  // 下载文件
  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = fileService.resolveFileUrl(fileUrl);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    return fileService.formatFileSize(bytes);
  };

  // 判断是否为图片文件
  const isImageFile = (extension: string) => {
    const info = fileService.getFileTypeInfo(`file${extension}`);
    return info.isImage;
  };

  const validatePasswordForm = () => {
    if (!currentPassword) {
      setError('请输入当前密码');
      return false;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return false;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      return false;
    }
    return true;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePasswordForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess(result.message);
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Close dialog after success
        setTimeout(() => {
          handleDialogChange(false);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('密码修改失败:', err);
      setError('密码修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleDialogChange = (open: boolean) => {
    setIsPasswordDialogOpen(open);
    if (!open) {
      // Clear form and errors when dialog closes
      setError('');
      setSuccess('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
          <h1 className="text-2xl font-bold text-slate-800">账户设置</h1>
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
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
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
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <UserAvatar 
                    user={user}
                    size="xl"
                  />
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{user.username}</h3>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingAvatar ? '上传中...' : '更换头像'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    支持 JPG、PNG 等格式，文件大小不超过 2MB
                  </p>
                </div>
              </div>

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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>文件管理</CardTitle>
              <CardDescription>查看、下载和删除您上传的文件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-slate-500">
                  您上传的文件列表
                </div>
                <Button onClick={loadUserFiles} disabled={loadingFiles}>
                  {loadingFiles ? '加载中...' : '刷新列表'}
                </Button>
              </div>

              {userFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无上传的文件</p>
                  <Button variant="outline" className="mt-4" onClick={loadUserFiles}>
                    加载文件列表
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userFiles.map((file) => (
                    <div key={file.unique_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {isImageFile(file.extension) ? (
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        ) : (
                          <File className="w-5 h-5 text-slate-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {file.unique_id}{file.extension}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(file.size)} • {new Date(file.upload_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isImageFile(file.extension) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewImage(file.url)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file.url, `${file.unique_id}${file.extension}`)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFile(file.unique_id, file.extension)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                <div>
                  <h4 className="font-medium">账户密码</h4>
                  <p className="text-sm text-slate-500 mt-1">定期更改密码可以提高账户安全性</p>
                </div>
                <Dialog open={isPasswordDialogOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Lock className="w-4 h-4 mr-2" />
                      修改密码
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>修改密码</DialogTitle>
                      <DialogDescription>
                        请输入当前密码和新密码
                      </DialogDescription>
                    </DialogHeader>
                    
                    {error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mt-4 border-green-200 bg-green-50">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="currentPassword">当前密码</Label>
                        <div className="relative mt-1">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="pr-10"
                            placeholder="请输入当前密码"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">新密码</Label>
                        <div className="relative mt-1">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                            placeholder="请输入新密码（至少6个字符）"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">密码至少需要6个字符</p>
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">确认新密码</Label>
                        <div className="relative mt-1">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pr-10"
                            placeholder="请再次输入新密码"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleDialogChange(false)}
                          disabled={loading}
                        >
                          取消
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              保存中...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              保存密码
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
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
                  <p className="text-sm text-slate-500 mt-1">增加额外的安全保护层</p>
                </div>
                <Badge variant="secondary">即将推出</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">登录历史</h4>
                  <p className="text-sm text-slate-500 mt-1">查看您的账户登录记录</p>
                </div>
                <Badge variant="secondary">即将推出</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        imageUrl={selectedImage}
        aspectRatio={1} // 正方形头像
        maxWidth={512}
        maxHeight={512}
        maxFileSize={2 * 1024 * 1024} // 2MB
        onCrop={handleAvatarCrop}
        title="裁剪头像"
      />

      {/* File Preview Dialog */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {filePreview && (
            <div className="flex justify-center">
              <img 
                src={filePreview} 
                alt="文件预览" 
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 