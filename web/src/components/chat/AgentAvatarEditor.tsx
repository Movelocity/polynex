import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Card, CardContent } from '@/components/x-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { ImageCropperDialog } from '@/components/ImageCropV1/ImageCropperDialog';
import { AvatarConfig } from '@/types';
import { Upload, Palette, Image as ImageIcon, Bot, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fileService } from '@/services';
import { toast } from '@/hooks/use-toast';

// 预设图标集合
const PRESET_EMOJIS = [
  '🤖', '🎯', '💡', '🚀', '⭐', '🔥', '💫', '✨', 
  '🎨', '🎭', '🎪', '🎲', '🎸', '🎵', '🎶', '🎤',
  '📚', '📖', '📝', '📊', '📈', '📉', '💻', '⌨️',
  '🔮', '🎊', '🎉', '🎈', '🎁', '🏆', '🥇', '🎯',
  '🌟', '💎', '👑', '🔱', '⚡', '🌙', '☀️', '🌈',
  '🦄', '🐉', '🦋', '🐙', '🌸', '🌺', '🌻', '🌹',
  '🍎', '🍊', '🍋', '🍇', '🥑', '🍓', '🍑', '🥝'
];

// 预设背景色集合
const PRESET_COLORS = [
  { name: '蓝色', value: 'bg-blue-500', color: '#3b82f6' },
  { name: '紫色', value: 'bg-purple-500', color: '#8b5cf6' },
  { name: '粉色', value: 'bg-pink-500', color: '#ec4899' },
  { name: '红色', value: 'bg-red-500', color: '#ef4444' },
  { name: '橙色', value: 'bg-orange-500', color: '#f97316' },
  { name: '黄色', value: 'bg-yellow-500', color: '#eab308' },
  { name: '绿色', value: 'bg-green-500', color: '#22c55e' },
  { name: '青色', value: 'bg-cyan-500', color: '#06b6d4' },
  { name: '靛色', value: 'bg-indigo-500', color: '#6366f1' },
  { name: '灰色', value: 'bg-gray-500', color: '#6b7280' },
  { name: '石色', value: 'bg-slate-500', color: '#64748b' },
  { name: '锌色', value: 'bg-zinc-500', color: '#71717a' }
];

interface AgentAvatarEditorProps {
  avatar?: AvatarConfig;
  name: string;
  onChange: (avatar: AvatarConfig) => void;
  onCancel?: () => void;
}

export const AgentAvatarEditor: React.FC<AgentAvatarEditorProps> = ({
  avatar,
  name,
  onChange,
  onCancel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // 本地预览状态
  const [previewAvatar, setPreviewAvatar] = useState<AvatarConfig>(() => {
    return avatar || {
      variant: 'emoji',
      emoji: '🤖',
      bg_color: 'bg-blue-500'
    };
  });
  
  // 预览图片状态
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  // 当外部传入的avatar改变时，更新预览状态
  useEffect(() => {
    if (avatar) {
      setPreviewAvatar(avatar);
    }
  }, [avatar]);

  // 更新本地预览配置
  const updatePreview = (updates: Partial<AvatarConfig>) => {
    setPreviewAvatar(prev => ({
      ...prev,
      ...updates
    }));
  };

  // 处理tab切换
  const handleTabChange = (value: string) => {
    const newVariant = value as 'emoji' | 'link';
    
    if (newVariant === 'emoji') {
      // 切换到emoji时，清除预览图片
      setPreviewImageUrl('');
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage('');
      }
    }
    
    updatePreview({ variant: newVariant });
  };

  // 处理文件（通用）
  const processFile = (file: File) => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: '文件类型错误',
        description: '请选择图片文件',
        variant: 'destructive'
      });
      return;
    }

    // 检查文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片文件大小不能超过2MB',
        variant: 'destructive'
      });
      return;
    }

    // 创建预览URL
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropDialog(true);
  };

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      processFile(file);
    }
  };

  // 头像裁剪完成
  const handleAvatarCrop = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      console.log('开始上传Agent头像...');
      // 上传文件到服务器
      const result = await fileService.uploadAgentAvatar(croppedBlob);
      console.log('上传结果:', result);
      
      if (result.success) {
        // 更新预览状态
        updatePreview({
          variant: 'link',
          link: result.avatarUrl
        });
        
        // 设置预览图片URL
        const previewUrl = URL.createObjectURL(croppedBlob);
        setPreviewImageUrl(previewUrl);
        
        toast({
          title: '上传成功',
          description: 'Agent头像已成功上传'
        });
        
        // 清理临时预览URL
        if (selectedImage) {
          URL.revokeObjectURL(selectedImage);
          setSelectedImage('');
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('上传失败:', error);
      toast({
        title: '上传失败',
        description: error.message || '上传失败，请重试',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // 确认保存
  const handleConfirm = () => {
    onChange(previewAvatar);
    console.log('确认保存', previewAvatar);
  };

  // 取消操作
  const handleCancel = () => {
    // 重置为原始状态
    setPreviewAvatar(avatar || {
      variant: 'emoji',
      emoji: '🤖',
      bg_color: 'bg-blue-500'
    });
    
    // 清理预览图片
    setPreviewImageUrl('');
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage('');
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  // Agent头像预览组件
  // const AvatarPreview: React.FC<{ size?: 'sm' | 'md' | 'lg'; config?: AvatarConfig }> = ({ 
  //   size = 'lg', 
  //   config = previewAvatar 
  // }) => {
  //   const [imageError, setImageError] = useState(false);
  //   const sizeClasses = {
  //     sm: 'w-8 h-8 text-sm',
  //     md: 'w-12 h-12 text-lg',
  //     lg: 'w-16 h-16 text-xl'
  //   };

  //   const bgColor = config.bg_color || 'bg-blue-500';

  //   const displayLink = config.variant === 'link' ? fileService.resolveFileUrl(config.link) : '';

  //   // 当头像链接变化时重置错误状态
  //   React.useEffect(() => {
  //     setImageError(false);
  //   }, [config.link]);

  //   if (config.variant === 'link' && displayLink && !imageError) {
  //     return (
  //       <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center`}>
  //         <img 
  //           src={displayLink} 
  //           alt={name}
  //           className="w-full h-full object-cover"
  //           onError={(e) => {
  //             console.warn('头像图片加载失败:', config.link);
  //             setImageError(true);
  //           }}
  //           onLoad={() => {
  //             console.log('头像图片加载成功:', config.link);
  //           }}
  //         />
  //       </div>
  //     );
  //   }

  //   if (config.variant === 'emoji' && config.emoji) {
  //     return (
  //       <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center`}>
  //         <span className="text-white">{config.emoji}</span>
  //       </div>
  //     );
  //   }

  //   // 默认显示用户名首字符
  //   return (
  //     <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium`}>
  //       {name.charAt(0).toUpperCase()}
  //     </div>
  //   );
  // };

  return (
    <div className="space-y-4">
      {/* 当前预览 */}
      {/* <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
        <AvatarPreview size="md" />
        <div>
          <p className="text-sm font-medium">预览效果</p>
          <p className="text-xs text-gray-500">{name}</p>
        </div>
      </div> */}

      {/* 编辑选项 */}
      <Tabs 
        value={previewAvatar.variant} 
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="emoji" className="flex items-center">
            <Bot className="w-4 h-4 mr-2" />
            图标
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center">
            <ImageIcon className="w-4 h-4 mr-2" />
            上传
          </TabsTrigger>
        </TabsList>

        {/* 图标选择 */}
        <TabsContent value="emoji" className="space-y-2">
          <div>
            <span className="flex items-center gap-2">
              <Label className="text-sm font-medium w-24">选择图标</Label>
              <Input
                placeholder="输入表情符号或文字自定义图标"
                value={previewAvatar.emoji || ''}
                onChange={(e) => updatePreview({ emoji: e.target.value })}
                className="mt-1"
              />
            </span>
            

            <div className="grid grid-cols-8 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {PRESET_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-8 h-8 rounded hover:border-2 flex items-center justify-center text-lg",
                    previewAvatar.emoji === emoji ? "border-primary bg-primary/10" : "border-gray-200"
                  )}
                  onClick={() => updatePreview({ emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">背景颜色</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {PRESET_COLORS.map((color, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all relative",
                    previewAvatar.bg_color === color.value 
                      ? "border-primary border-2 ring-2 ring-primary/20" 
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: color.color }}
                  onClick={() => updatePreview({ bg_color: color.value })}
                  title={color.name}
                >
                  {/* 显示当前选中的emoji效果 */}
                  <span className="text-white text-lg">
                    {previewAvatar.emoji || '🤖'}
                  </span>
                  {previewAvatar.bg_color === color.value && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white dark:text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 图片上传 */}
        <TabsContent value="link" className="space-y-4">
          <div className="text-center space-y-4">
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer relative",
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-300 hover:border-gray-400"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* 预览图片 */}
              {previewImageUrl ? (
                <div className="mb-4">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img 
                      src={previewImageUrl} 
                      alt="预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-green-600 mt-2">✓ 图片已上传</p>
                </div>
              ) : (
                <div>
                  <Upload className={cn(
                    "mx-auto h-12 w-12 mb-4 transition-colors",
                    isDragOver ? "text-primary" : "text-gray-400"
                  )} />
                  <p className={cn(
                    "text-sm mb-1 transition-colors",
                    isDragOver ? "text-primary" : "text-gray-600"
                  )}>
                    点击上传图片或拖拽图片到此处
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mb-1">
                支持 JPG、PNG 等格式，文件大小不超过 2MB
              </p>
              <Button
                variant="outline"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {previewImageUrl ? "更换图片" : "选择图片"}
                  </>
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
          </div>

          <div>
            <Label className="text-sm font-medium">图片链接</Label>
            <Input
              placeholder="输入图片URL..."
              value={previewAvatar.link || ''}
              onChange={(e) => updatePreview({ link: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              也可以直接粘贴图片链接
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex space-x-3 pt-2 border-t">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          取消
        </Button>
        <Button 
          onClick={handleConfirm}
          className="flex-1"
          variant="default"
        >
          <Check className="w-4 h-4 mr-2" />
          确认
        </Button>
      </div>

      {/* 图片裁剪对话框 */}
      <ImageCropperDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        imageUrl={selectedImage}
        aspectRatio={1} // 正方形头像
        maxWidth={512}
        maxHeight={512}
        maxFileSize={2 * 1024 * 1024} // 2MB
        onCrop={handleAvatarCrop}
        title="裁剪Agent头像"
      />
    </div>
  );
}; 