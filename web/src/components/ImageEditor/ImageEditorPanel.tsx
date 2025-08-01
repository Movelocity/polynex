import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useImageEditor } from './useImageEditor';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Upload, Undo, Redo, Crop, Move, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageEditorPanelProps {
  className?: string;
}

export function ImageEditorPanel({ className = '' }: ImageEditorPanelProps) {
  const {
    images,
    currentImageId,
    currentImageUrl,
    currentSize,
    isProcessing,
    history,
    currentHistoryIndex,
    uploadImage,
    applyCommand,
    undo,
    redo,
    reset
  } = useImageEditor();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commandType, setCommandType] = useState<'crop' | 'resize' | 'pad'>('crop');

  // 新增：等比例缩放比例
  const [resizeScale, setResizeScale] = useState(1);
  
  // 裁剪参数
  const [cropParams, setCropParams] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });
  // 裁剪步长
  const CROP_STEP = 10;
  
  // 调整大小参数
  const [resizeParams, setResizeParams] = useState({
    width: 300,
    height: 300
  });
  
  // 填充参数
  const [padParams, setPadParams] = useState({
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    color: '#ffffff'
  });
  
  // 自动同步图片尺寸到裁剪和调整大小参数
  useEffect(() => {
    if (currentSize.width > 0 && currentSize.height > 0) {
      setResizeParams({
        width: currentSize.width,
        height: currentSize.height
      });
      setCropParams({
        x: 0,
        y: 0,
        width: currentSize.width,
        height: currentSize.height
      });
      setResizeScale(1);
    }
  }, [currentImageUrl, currentSize.width, currentSize.height]);
  
  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    uploadImage(file).catch(error => {
      toast({
        title: '上传失败',
        description: error.message,
        variant: 'destructive'
      });
    });
  }, [uploadImage]);
  
  // 应用当前指令
  const handleApplyCommand = useCallback(async () => {
    if (!currentImageId) {
      toast({
        title: '错误',
        description: '请先上传图片',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      let result: string | null = null;
      
      switch (commandType) {
        case 'crop':
          result = await applyCommand({
            type: 'crop',
            x: cropParams.x,
            y: cropParams.y,
            width: cropParams.width,
            height: cropParams.height
          });
          break;
          
        case 'resize':
          result = await applyCommand({
            type: 'resize',
            width: resizeParams.width,
            height: resizeParams.height
          });
          break;
          
        case 'pad':
          result = await applyCommand({
            type: 'pad',
            top: padParams.top,
            right: padParams.right,
            bottom: padParams.bottom,
            left: padParams.left,
            color: padParams.color
          });
          break;
      }
      
      if (result) {
        toast({
          title: '操作成功',
          description: '图片编辑完成'
        });
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '图片编辑时发生错误',
        variant: 'destructive'
      });
    }
  }, [
    currentImageId,
    commandType,
    cropParams,
    resizeParams,
    padParams,
    applyCommand
  ]);
  
  // 获取当前历史记录
  const currentHistory = currentHistoryIndex >= 0 ? history[currentHistoryIndex] : null;

  const downloadImage = useCallback(() => {
    if (!currentImageUrl) return;
    // 获取当前预览图片的URL
    const url = currentHistory?.previewUrl || currentImageUrl;
    // console.log("previewUrl", currentHistory?.previewUrl);
    // console.log("currentImageUrl", currentImageUrl);
    // 构造文件名
    const filename = `img-${currentSize.width}x${currentSize.height}.jpg`;
    // 创建a标签下载
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentHistory?.previewUrl, currentSize.width, currentSize.height]);
  
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* 主要编辑区域 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">图片编辑器</span>
              {currentImageUrl && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  更换图片
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!currentImageUrl ? (
              <div
                className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-muted-foreground mb-2">
                      点击上传图片或拖放图片到这里
                    </p>
                    <p className="text-sm text-muted-foreground">
                      支持 JPG, PNG, GIF 格式
                    </p>
                  </div>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">    
                <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={currentHistory?.previewUrl || currentImageUrl}
                    alt="编辑预览"
                    className="max-w-full max-h-full object-contain"
                  />
                  {(currentSize.width > 0 && currentSize.height > 0) && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    尺寸: {currentSize.width || 0}×{currentSize.height || 0}
                    </div>
                  )}
                </div>

                <span className="text-sm text-muted-foreground">
                  {images.find(img => img.id === currentImageId)?.name}
                </span>
                
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 控制面板 */}
      <div className="space-y-4">
        {/* 指令选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">编辑指令</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={commandType === 'crop' ? 'default' : 'outline'}
                onClick={() => setCommandType('crop')}
              >
                <Crop className="w-4 h-4 mr-2" />
                裁剪
              </Button>
              <Button
                variant={commandType === 'resize' ? 'default' : 'outline'}
                onClick={() => setCommandType('resize')}
              >
                <Move className="w-4 h-4 mr-2" />
                调整大小
              </Button>
              <Button
                variant={commandType === 'pad' ? 'default' : 'outline'}
                onClick={() => setCommandType('pad')}
              >
                <Palette className="w-4 h-4 mr-2" />
                填充
              </Button>
            </div>
            
            {/* 裁剪参数 */}
            {commandType === 'crop' && (
              <div className="space-y-3">
                {/* <h4 className="font-medium">裁剪参数</h4> */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="crop-x" className="text-xs">X坐标</Label>
                    <Input
                      id="crop-x"
                      type="number"
                      min="0"
                      value={cropParams.x}
                      onChange={(e) => setCropParams({
                        ...cropParams,
                        x: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-y" className="text-xs">Y坐标</Label>
                    <Input
                      id="crop-y"
                      type="number"
                      min="0"
                      value={cropParams.y}
                      onChange={(e) => setCropParams({
                        ...cropParams,
                        y: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-width" className="text-xs">宽度</Label>
                    <Input
                      id="crop-width"
                      type="number"
                      min="1"
                      value={cropParams.width}
                      onChange={(e) => setCropParams({
                        ...cropParams,
                        width: Math.max(1, parseInt(e.target.value) || 1)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-height" className="text-xs">高度</Label>
                    <Input
                      id="crop-height"
                      type="number"
                      min="1"
                      value={cropParams.height}
                      onChange={(e) => setCropParams({
                        ...cropParams,
                        height: Math.max(1, parseInt(e.target.value) || 1)
                      })}
                    />
                  </div>
                </div>
                {/* 裁剪快捷按钮 */}
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCropParams(p => ({
                      ...p,
                      x: Math.min(p.x + CROP_STEP, (p.x + p.width - 1)),
                      width: Math.max(1, p.width - 2 * CROP_STEP)
                    }))}
                  >
                    水平收缩
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCropParams(p => ({
                      ...p,
                      y: Math.min(p.y + CROP_STEP, (p.y + p.height - 1)),
                      height: Math.max(1, p.height - 2 * CROP_STEP)
                    }))}
                  >
                    垂直收缩
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCropParams({
                      x: 0,
                      y: 0,
                      width: currentSize.width,
                      height: currentSize.height
                    })}
                  >
                    全图
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // 计算最大16倍数宽高
                      const max16Width = Math.floor(currentSize.width / 16) * 16;
                      const max16Height = Math.floor(currentSize.height / 16) * 16;
                      setCropParams({
                        x: 0,
                        y: 0,
                        width: max16Width,
                        height: max16Height
                      });
                    }}
                  >
                    16 整除区域
                  </Button>
                </div>
              </div>
            )}
            
            {/* 调整大小参数 */}
            {commandType === 'resize' && (
              <div className="space-y-3">
                {/* <h4 className="font-medium">调整大小参数</h4> */}
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="resize-width" className="text-xs">宽度</Label>
                    <Input
                      id="resize-width"
                      type="number"
                      min="1"
                      value={resizeParams.width}
                      onChange={(e) => {
                        const width = Math.max(1, parseInt(e.target.value) || 300);
                        setResizeParams({
                          ...resizeParams,
                          width
                        });
                        // 反推scale
                        if (currentSize.width > 0) {
                          setResizeScale(width / currentSize.width);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resize-height" className="text-xs">高度</Label>
                    <Input
                      id="resize-height"
                      type="number"
                      min="1"
                      value={resizeParams.height}
                      onChange={(e) => {
                        const height = Math.max(1, parseInt(e.target.value) || 300);
                        setResizeParams({
                          ...resizeParams,
                          height
                        });
                        // 反推scale
                        if (currentSize.height > 0) {
                          setResizeScale(height / currentSize.height);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 新增：等比例缩放滑动条 */}
                <div className="mb-2">
                  <Label htmlFor="resize-scale" className="text-xs">等比例缩放</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="resize-scale"
                      type="range"
                      min={0.2}
                      max={1.8}
                      step={0.01}
                      value={resizeScale}
                      onChange={e => {
                        const scale = parseFloat(e.target.value);
                        setResizeScale(scale);
                        setResizeParams(prev => ({
                          width: Math.round(currentSize.width * scale),
                          height: Math.round(currentSize.height * scale)
                        }));
                      }}
                      className="flex-1 cursor-pointer"
                    />
                    <span className="w-12 text-right text-xs">{resizeScale.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 填充参数 */}
            {commandType === 'pad' && (
              <div className="space-y-3">
                {/* <h4 className="font-medium">填充参数</h4> */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="pad-top" className="text-xs">上边距</Label>
                    <Input
                      id="pad-top"
                      type="number"
                      min="0"
                      value={padParams.top}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        top: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pad-right" className="text-xs">右边距</Label>
                    <Input
                      id="pad-right"
                      type="number"
                      min="0"
                      value={padParams.right}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        right: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pad-bottom" className="text-xs">下边距</Label>
                    <Input
                      id="pad-bottom"
                      type="number"
                      min="0"
                      value={padParams.bottom}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        bottom: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pad-left" className="text-xs">左边距</Label>
                    <Input
                      id="pad-left"
                      type="number"
                      min="0"
                      value={padParams.left}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        left: Math.max(0, parseInt(e.target.value) || 0)
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pad-color" className="text-xs">填充颜色</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pad-color"
                      type="color"
                      value={padParams.color}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        color: e.target.value
                      })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={padParams.color}
                      onChange={(e) => setPadParams({
                        ...padParams,
                        color: e.target.value
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyCommand}
                disabled={isProcessing || !currentImageId}
                className="flex-1"
              >
                {isProcessing ? '处理中...' : '应用指令'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 历史记录 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-lg">编辑历史 {currentHistoryIndex >= 0 ? currentHistoryIndex + 1 : 0} / {history.length}</span>
              
              <Button
                variant="outline"
                onClick={reset}
                disabled={isProcessing}
              >
                重置编辑器
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={undo}
                disabled={currentHistoryIndex <= 0 || isProcessing}
                className="flex-1"
              >
                <Undo className="w-4 h-4 mr-2" />
                撤销
              </Button>
              <Button
                variant="outline"
                onClick={redo}
                disabled={currentHistoryIndex >= history.length - 1 || isProcessing}
                className="flex-1"
              >
                <Redo className="w-4 h-4 mr-2" />
                重做
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentImageUrl && (
          <Button
            variant="default"
            onClick={downloadImage}
          >
            下载图片
          </Button>
          )}
      </div>
    </div>
  );
}