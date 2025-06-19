import React, { useState, useCallback, useRef } from 'react';
import { useImageCrop } from '@/hooks/useImageCrop';
import { ImageCropperCanvas } from '@/components/ImageCropperCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, RotateCw, Crop, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ImageCropper() {
  const {
    proxyImage,
    cropArea,
    imageDimensions,
    isLoading,
    loadImage,
    updateCropArea,
    getCroppedImage,
    reset
  } = useImageCrop();

  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '错误',
        description: '请上传图片文件',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      loadImage(base64);
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  // 处理拖放上传
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '错误',
        description: '请上传图片文件',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      loadImage(base64);
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  // 处理裁剪区域变化（保持宽高比）
  const handleCropAreaChange = useCallback((newArea: typeof cropArea) => {
    if (aspectRatio) {
      // 根据变化的边决定如何调整
      const widthChanged = Math.abs(newArea.width - cropArea.width) > Math.abs(newArea.height - cropArea.height);
      
      if (widthChanged) {
        newArea.height = newArea.width / aspectRatio;
      } else {
        newArea.width = newArea.height * aspectRatio;
      }

      // 确保不超出图片边界
      if (imageDimensions) {
        if (newArea.x + newArea.width > imageDimensions.displayWidth) {
          newArea.width = imageDimensions.displayWidth - newArea.x;
          newArea.height = newArea.width / aspectRatio;
        }
        if (newArea.y + newArea.height > imageDimensions.displayHeight) {
          newArea.height = imageDimensions.displayHeight - newArea.y;
          newArea.width = newArea.height * aspectRatio;
        }
      }
    }
    updateCropArea(newArea);
  }, [aspectRatio, cropArea, imageDimensions, updateCropArea]);

  // 处理裁剪并下载
  const handleCrop = useCallback(async () => {
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImage();
      if (croppedImage) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = croppedImage;
        link.download = `cropped-image-${Date.now()}.jpg`;
        link.click();

        toast({
          title: '成功',
          description: '图片已裁剪并下载'
        });
      }
    } catch (error) {
      toast({
        title: '错误',
        description: '裁剪图片失败',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [getCroppedImage]);

  // 设置预设宽高比
  const setPresetAspectRatio = useCallback((ratio: number | null) => {
    setAspectRatio(ratio);
    if (ratio && imageDimensions) {
      const currentRatio = cropArea.width / cropArea.height;
      let newArea = { ...cropArea };

      if (currentRatio > ratio) {
        // 当前比例太宽，调整宽度
        newArea.width = cropArea.height * ratio;
      } else {
        // 当前比例太高，调整高度
        newArea.height = cropArea.width / ratio;
      }

      // 确保不超出边界
      if (newArea.x + newArea.width > imageDimensions.displayWidth) {
        newArea.width = imageDimensions.displayWidth - newArea.x;
        newArea.height = newArea.width / ratio;
      }
      if (newArea.y + newArea.height > imageDimensions.displayHeight) {
        newArea.height = imageDimensions.displayHeight - newArea.y;
        newArea.width = newArea.height * ratio;
      }

      updateCropArea(newArea);
    }
  }, [cropArea, imageDimensions, updateCropArea]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">图片裁剪工具</h1>
        <p className="mt-2 text-slate-600">上传图片并裁剪成所需尺寸</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要操作区域 */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              {!proxyImage ? (
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    拖放图片到这里或点击上传
                  </p>
                  <p className="text-sm text-slate-500">
                    支持 JPG、PNG、GIF 等格式
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  {imageDimensions && (
                    <ImageCropperCanvas
                      imageUrl={proxyImage}
                      cropArea={cropArea}
                      onCropAreaChange={handleCropAreaChange}
                      containerWidth={imageDimensions.displayWidth}
                      containerHeight={imageDimensions.displayHeight}
                    />
                  )}
                  
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={handleCrop}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      {isProcessing ? '处理中...' : '裁剪并下载'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={reset}
                      disabled={isProcessing}
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      重新上传
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 控制面板 */}
        <div className="space-y-4">
          {/* 图片信息 */}
          {imageDimensions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">图片信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">原始尺寸：</span>
                    <span className="font-medium">
                      {imageDimensions.originalWidth} × {imageDimensions.originalHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">显示尺寸：</span>
                    <span className="font-medium">
                      {Math.round(imageDimensions.displayWidth)} × {Math.round(imageDimensions.displayHeight)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">缩放比例：</span>
                    <span className="font-medium">
                      {(imageDimensions.scale * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 裁剪设置 */}
          {proxyImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">裁剪设置</CardTitle>
                <CardDescription>调整裁剪区域和宽高比</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 宽高比预设 */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">宽高比预设</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={aspectRatio === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(null)}
                    >
                      自由
                    </Button>
                    <Button
                      variant={aspectRatio === 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(1)}
                    >
                      1:1
                    </Button>
                    <Button
                      variant={aspectRatio === 16/9 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(16/9)}
                    >
                      16:9
                    </Button>
                    <Button
                      variant={aspectRatio === 4/3 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(4/3)}
                    >
                      4:3
                    </Button>
                    <Button
                      variant={aspectRatio === 3/2 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(3/2)}
                    >
                      3:2
                    </Button>
                    <Button
                      variant={aspectRatio === 9/16 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(9/16)}
                    >
                      9:16
                    </Button>
                  </div>
                </div>

                {/* 裁剪区域信息 */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">裁剪区域</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">位置：</span>
                      <span className="font-medium">
                        ({Math.round(cropArea.x)}, {Math.round(cropArea.y)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">尺寸：</span>
                      <span className="font-medium">
                        {Math.round(cropArea.width)} × {Math.round(cropArea.height)}
                      </span>
                    </div>
                    {imageDimensions && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">实际尺寸：</span>
                        <span className="font-medium">
                          {Math.round(cropArea.width / imageDimensions.scale)} × {Math.round(cropArea.height / imageDimensions.scale)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>• 拖拽裁剪框调整位置</p>
              <p>• 拖拽边角调整大小</p>
              <p>• 选择预设宽高比快速调整</p>
              <p>• 大图片会自动缩放显示，但裁剪时使用原图</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 