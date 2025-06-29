import React, { useState, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { UserAvatar } from '@/components/common/user/UserAvatar';
import { ImageCropperDialog } from '@/components/ImageCropV1/ImageCropperDialog';
import { Camera, Upload } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AvatarUploadProps {
  user: User;
  onAvatarUpload: (croppedBlob: Blob) => Promise<void>;
  uploading?: boolean;
  onError: (error: string) => void;
}

export function AvatarUpload({ user, onAvatarUpload, uploading = false, onError }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      onError('请选择图片文件');
      return;
    }

    // 检查文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      onError('图片文件大小不能超过2MB');
      return;
    }

    // 创建预览URL
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropDialog(true);
  };

  // 头像裁剪完成
  const handleAvatarCrop = async (croppedBlob: Blob) => {
    try {
      await onAvatarUpload(croppedBlob);
      
      // 清理预览URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage('');
      }
    } catch (error) {
      // 错误处理由父组件负责
    }
  };

  return (
    <>
      
        <div className="relative">
          <UserAvatar 
            user={user}
            size="2xl"
          />
          <Button
            size="sm"
            className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
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
    </>
  );
} 