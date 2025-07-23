import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useImageCrop } from '@/components/ImageCropV1/useImageCrop';
import { ImageCropperPanel } from '@/components/ImageCropV1/ImageCropperPanel';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Upload, Crop, Edit, ArrowLeft, Image as ImageIcon, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ImageDownloader } from '@/components/ImageCropV1/ImageDownloader';

// 宽高比预设配置
const ASPECT_RATIO_PRESETS = [
  { key: 'free', label: '自由', ratio: null },
  { key: 'square', label: '1:1', ratio: 1 },
  { key: 'landscape_16_9', label: '16:9', ratio: 16/9 },
  { key: 'landscape_4_3', label: '4:3', ratio: 4/3 },
  { key: 'landscape_3_2', label: '3:2', ratio: 3/2 },
  { key: 'portrait_9_16', label: '9:16', ratio: 9/16 },
] as const;

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
    reset,
    sizeBasis,
    setSizeBasis,
  } = useImageCrop();

  const [aspectRatioKey, setAspectRatioKey] = useState<string>('free');
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maxWidth, setMaxWidth] = useState(800);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 新增：基数限制相关状态
  // 宽高基数限制默认启用，1代表未启用
  // const [sizeBasis, setSizeBasis] = useState(1); // 最小为1，默认1

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
      toast.success({title: '图片裁剪完成'});
    } catch (error) {
      toast.error({title: '裁剪图片失败'});
    } finally {
      setIsProcessing(false);
    }
  }, [finishCropping]);

  // 设置预设宽高比
  const setPresetAspectRatio = useCallback((key: string, ratio: number | null) => {
    setAspectRatioKey(key);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要操作区域 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>

            </CardHeader>
            <CardContent className="px-6">
              {!proxyImage ? (
                <div
                  className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-700 mb-2">
                      拖放图片到这里或点击上传
                    </p>
                    <p className="text-sm text-slate-500">
                      最大文件大小: 10MB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                  >
                    选择文件
                  </Button>
                </div>
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
                <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-slate-200 dark:border-gray-800 overflow-hidden">
                  <div className="flex justify-center h-[65vh]">
                    <img 
                      src={proxyImage} 
                      alt="图片预览" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : mode === 'cropping' ? (
                // 裁剪模式
                <div className="relative">
                  <div className="w-full max-w-full max-h-[65vh] rounded-lg bg-black/40 flex justify-center p-4">
                    {imageDimensions && (
                      <ImageCropperPanel
                        imageUrl={proxyImage}
                        cropArea={cropArea}
                        onCropAreaChange={handleCropAreaChange}
                        containerWidth={imageDimensions.displayWidth}
                        containerHeight={imageDimensions.displayHeight}
                        maxContainerWidth={maxWidth}
                        maxContainerHeight={900}
                      />
                    )}
                  </div>
                </div>
              ) : mode === 'result' && croppedImage ? (
                // 结果模式
                <div className="space-y-6">
                  <div className="w-full max-w-full h-[65vh] overflow-auto rounded-lg bg-slate-100 flex justify-center p-4">
                    <img 
                      src={croppedImage} 
                      alt="裁剪结果" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* 控制面板 */}
        <div className="space-y-4">
          <span className="hidden sm:flex items-center justify-center space-x-2 ">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              图片裁剪
            </span>
          </span>
          {/* 裁剪设置 - 只在裁剪模式显示 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                裁剪设置
                {mode === 'cropping' ?(
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={backToPreview}
                      disabled={isProcessing}
                    >
                      取消
                    </Button>
                    <Button
                      variant="pretty"
                      onClick={handleFinishCropping}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '处理中...' : '确认裁剪'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="pretty" onClick={handleStartCropping} disabled={!proxyImage}>
                      <Crop className="w-4 h-4 mr-2" />
                      裁剪
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            {mode === 'cropping' && (
            <CardContent className="space-y-4">
              {/* 宽高比预设 */}
              <div>
                <Label className="text-sm font-medium mb-3 block">宽高比预设</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      variant={aspectRatioKey === preset.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPresetAspectRatio(preset.key, preset.ratio)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 新增：宽高基数限制设置 */}
              <div>
                <Label className="text-sm font-medium mb-3 block">宽高基数限制</Label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">已启用，宽高基数为{sizeBasis}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={sizeBasis}
                    onChange={e => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setSizeBasis(val);
                    }}
                    className="w-20"
                  />
                  {/* 预设按钮 */}
                  {[1, 8, 16, 32, 64].map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant={sizeBasis === preset ? 'default' : 'outline'}
                      onClick={() => setSizeBasis(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 裁剪区域信息 */}
              <div className="text-foreground">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="">原图尺寸：</span>
                    <span className="font-medium">
                      {imageDimensions.originalWidth} × {imageDimensions.originalHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="">取景框位置：</span>
                    <span className="font-medium">
                      ({Math.round(cropArea.x / imageDimensions.scale)}, {Math.round(cropArea.y / imageDimensions.scale)})
                    </span>
                  </div>
                  {imageDimensions && (
                    <div className="flex justify-between items-center">
                      <span className="">取景框尺寸：</span>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="number"
                          min={1}
                          value={Math.round(cropArea.width / imageDimensions.scale)}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            updateCropArea({
                              ...cropArea,
                              width: val * imageDimensions.scale
                            });
                          }}
                          className="w-24"
                          placeholder="宽(px)"
                          disabled={isProcessing}
                        />
                        <span className="self-center">×</span>
                        <Input
                          type="number"
                          min={1}
                          value={Math.round(cropArea.height / imageDimensions.scale)}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            updateCropArea({
                              ...cropArea,
                              height: val * imageDimensions.scale
                            });
                          }}
                          className="w-24"
                          placeholder="高(px)"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </CardContent>
            )}
          </Card>
          
          {/* 图片信息 */}
          {mode === 'result' && croppedImage && (
            <Card>
              <ImageDownloader imageUrl={croppedImage} onReset={reset} />
            </Card>
          )}
          {mode === 'preview' && proxyImage && (
            <Card>
              <ImageDownloader imageUrl={proxyImage} onReset={reset} />
            </Card>
          )}

          {/* 使用说明 */}
          {/* <Card>
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
          </Card> */}
        </div>
      </div>
    </div>
  );
} 