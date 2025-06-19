import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useImageCrop } from '@/hooks/useImageCrop';
import { ImageCropperCanvas } from '@/components/ImageCropperCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, RotateCw, Crop, Edit, Download, ArrowLeft, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// 新增：下载组件
function ImageDownloader({ imageUrl, onBack }: { imageUrl: string; onBack: () => void }) {
  const [downloadWidth, setDownloadWidth] = useState(800);
  const [downloadHeight, setDownloadHeight] = useState(600);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setOriginalAspectRatio(aspectRatio);
      setDownloadWidth(img.width);
      setDownloadHeight(img.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleWidthChange = useCallback((value: number) => {
    setDownloadWidth(value);
    if (maintainAspectRatio) {
      setDownloadHeight(Math.round(value / originalAspectRatio));
    }
  }, [maintainAspectRatio, originalAspectRatio]);

  const handleHeightChange = useCallback((value: number) => {
    setDownloadHeight(value);
    if (maintainAspectRatio) {
      setDownloadWidth(Math.round(value * originalAspectRatio));
    }
  }, [maintainAspectRatio, originalAspectRatio]);

  const handleDownload = useCallback(async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = downloadWidth;
      canvas.height = downloadHeight;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, downloadWidth, downloadHeight);
        
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = `resized-image-${downloadWidth}x${downloadHeight}-${Date.now()}.jpg`;
        link.click();

        toast({
          title: '成功',
          description: `图片已下载 (${downloadWidth}×${downloadHeight})`
        });
      };
      img.src = imageUrl;
    } catch (error) {
      toast({
        title: '错误',
        description: '下载失败',
        variant: 'destructive'
      });
    }
  }, [imageUrl, downloadWidth, downloadHeight]);

  return (
    <div className="space-y-6">
      {/* 图片预览 */}
      <div className="flex justify-center">
        <img 
          src={imageUrl} 
          alt="裁剪结果" 
          className="max-w-full max-h-96 rounded-lg border border-slate-200"
        />
      </div>

      {/* 下载设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">下载设置</CardTitle>
          <CardDescription>调整图片尺寸后下载</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">宽度 (px)</Label>
              <Input
                id="width"
                type="number"
                value={downloadWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                min="1"
                max="4000"
              />
            </div>
            <div>
              <Label htmlFor="height">高度 (px)</Label>
              <Input
                id="height"
                type="number"
                value={downloadHeight}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                min="1"
                max="4000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="aspectRatio"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="aspectRatio">保持宽高比</Label>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              下载图片
            </Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              重新裁剪
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ImageCropper() {
  const {
    proxyImage,
    croppedImage,
    cropArea,
    imageDimensions,
    isLoading,
    mode,
    loadImage,
    updateCropArea,
    startCropping,
    finishCropping,
    backToPreview,
    reset
  } = useImageCrop();

  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maxWidth, setMaxWidth] = useState(800);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理窗口尺寸变化
  useEffect(() => {
    const updateMaxWidth = () => {
      const screenWidth = window.innerWidth;
      setMaxWidth(Math.min(800, screenWidth - 100));
    };

    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);
    
    return () => {
      window.removeEventListener('resize', updateMaxWidth);
    };
  }, []);

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

  // 处理开始裁剪
  const handleStartCropping = useCallback(() => {
    startCropping();
  }, [startCropping]);

  // 处理完成裁剪
  const handleFinishCropping = useCallback(async () => {
    setIsProcessing(true);
    try {
      await finishCropping();
      toast({
        title: '成功',
        description: '图片裁剪完成'
      });
    } catch (error) {
      toast({
        title: '错误',
        description: '裁剪图片失败',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [finishCropping]);

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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              ) : mode === 'preview' ? (
                // 预览模式
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={proxyImage} 
                      alt="图片预览" 
                      className="max-w-full max-h-96 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleStartCropping} className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      裁剪编辑
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      <RotateCw className="w-4 h-4 mr-2" />
                      重新上传
                    </Button>
                  </div>
                </div>
              ) : mode === 'cropping' ? (
                // 裁剪模式
                <div className="relative">
                  <div className="w-full max-w-full overflow-auto rounded-lg bg-slate-50 flex justify-center p-4">
                    {imageDimensions && (
                      <ImageCropperCanvas
                        imageUrl={proxyImage}
                        cropArea={cropArea}
                        onCropAreaChange={handleCropAreaChange}
                        containerWidth={imageDimensions.displayWidth}
                        containerHeight={imageDimensions.displayHeight}
                        maxContainerWidth={maxWidth}
                      />
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={handleFinishCropping}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      {isProcessing ? '处理中...' : '确认裁剪'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={backToPreview}
                      disabled={isProcessing}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      返回预览
                    </Button>
                  </div>
                </div>
              ) : mode === 'result' && croppedImage ? (
                // 结果模式
                <ImageDownloader 
                  imageUrl={croppedImage} 
                  onBack={backToPreview}
                />
              ) : null}
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

          {/* 裁剪设置 - 只在裁剪模式显示 */}
          {mode === 'cropping' && (
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
              {mode === 'preview' && (
                <>
                  <p>• 图片已上传完成</p>
                  <p>• 点击"裁剪编辑"开始裁剪</p>
                  <p>• 可以重新上传其他图片</p>
                </>
              )}
              {mode === 'cropping' && (
                <>
                  <p>• 拖拽裁剪框调整位置</p>
                  <p>• 拖拽边角调整大小</p>
                  <p>• 选择预设宽高比快速调整</p>
                  <p>• 大图片会自动缩放显示，但裁剪时使用原图</p>
                </>
              )}
              {mode === 'result' && (
                <>
                  <p>• 裁剪已完成</p>
                  <p>• 可以调整输出尺寸</p>
                  <p>• 支持保持宽高比缩放</p>
                  <p>• 点击下载保存图片</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 