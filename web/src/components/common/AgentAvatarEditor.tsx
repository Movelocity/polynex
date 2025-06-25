import React, { useState, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Card, CardContent } from '@/components/x-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { ImageCropperDialog } from '@/components/ImageCropV1/ImageCropperDialog';
import { AvatarConfig } from '@/types';
import { Upload, Palette, Image as ImageIcon, Bot } from 'lucide-react';
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
}

export const AgentAvatarEditor: React.FC<AgentAvatarEditorProps> = ({
  avatar,
  name,
  onChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const currentAvatar = avatar || {
    variant: 'emoji',
    emoji: '🤖',
    bg_color: 'bg-blue-500'
  };

  // 更新头像配置
  const updateAvatar = (updates: Partial<AvatarConfig>) => {
    onChange({
      ...currentAvatar,
      ...updates
    });
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
        updateAvatar({
          variant: 'link',
          link: result.avatarUrl
        });
        
        toast({
          title: '上传成功',
          description: 'Agent头像已成功上传'
        });
        
        // 清理预览URL
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

  // Agent头像预览组件
  const AvatarPreview: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'lg' }) => {
    const [imageError, setImageError] = useState(false);
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-12 h-12 text-lg',
      lg: 'w-16 h-16 text-xl'
    };

    const bgColor = currentAvatar.bg_color || 'bg-blue-500';

    const displayLink = currentAvatar.variant === 'link' ? fileService.resolveFileUrl(currentAvatar.link) : '';

    // 当头像链接变化时重置错误状态
    React.useEffect(() => {
      setImageError(false);
      
    }, [currentAvatar.link]);

    if (currentAvatar.variant === 'link' && displayLink && !imageError) {
      return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center`}>
          <img 
            src={displayLink} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.warn('头像图片加载失败:', currentAvatar.link);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('头像图片加载成功:', currentAvatar.link);
            }}
          />
        </div>
      );
    }

    if (currentAvatar.variant === 'emoji' && currentAvatar.emoji) {
      return (
        <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center`}>
          <span className="text-white">{currentAvatar.emoji}</span>
        </div>
      );
    }

    // 默认显示用户名首字符
    return (
      <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 头像预览 */}
      <div className="flex items-center justify-center">
        <AvatarPreview />
      </div>

      {/* 编辑选项 */}
      <Tabs 
        value={currentAvatar.variant} 
        onValueChange={(value) => updateAvatar({ variant: value as 'emoji' | 'link' })}
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
        <TabsContent value="emoji" className="space-y-4">
          <div>
            <Label className="text-sm font-medium">选择图标</Label>
            <div className="grid grid-cols-8 gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {PRESET_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-8 h-8 rounded border-2 flex items-center justify-center text-lg hover:bg-gray-100 transition-colors",
                    currentAvatar.emoji === emoji ? "border-primary bg-primary/10" : "border-gray-200"
                  )}
                  onClick={() => updateAvatar({ emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">自定义图标</Label>
            <Input
              placeholder="输入表情符号或文字..."
              value={currentAvatar.emoji || ''}
              onChange={(e) => updateAvatar({ emoji: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">背景颜色</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {PRESET_COLORS.map((color, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110",
                    currentAvatar.bg_color === color.value 
                      ? "border-primary border-2 ring-2 ring-primary/20" 
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: color.color }}
                  onClick={() => updateAvatar({ bg_color: color.value })}
                  title={color.name}
                >
                  {currentAvatar.bg_color === color.value && (
                    <span className="text-white text-xs">✓</span>
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
                "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-300 hover:border-gray-400"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={cn(
                "mx-auto h-12 w-12 mb-4 transition-colors",
                isDragOver ? "text-primary" : "text-gray-400"
              )} />
              <p className={cn(
                "text-sm mb-4 transition-colors",
                isDragOver ? "text-primary" : "text-gray-600"
              )}>
                {isDragOver ? '释放以上传图片' : '点击上传图片或拖拽图片到此处'}
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
                    选择图片
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
            
            <p className="text-xs text-gray-500">
              支持 JPG、PNG 等格式，文件大小不超过 2MB
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium">图片链接</Label>
            <Input
              placeholder="输入图片URL..."
              value={currentAvatar.link || ''}
              onChange={(e) => updateAvatar({ link: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              也可以直接粘贴图片链接
            </p>
          </div>
        </TabsContent>
      </Tabs>

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