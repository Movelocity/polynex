import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { Separator } from '@/components/x-ui/separator';
import { useAdvancedImageCrop } from './useAdvancedImageCrop';
import { CropCanvas } from './CropCanvas';
import { 
  Crop, 
  Square, 
  RotateCcw, 
  Wand2, 
  Settings, 
  Maximize2,
  Download,
  Upload,
  ImageIcon
} from 'lucide-react';

interface NewImageCropperProps {
  imageData: string;
  initialWidth?: number;
  initialHeight?: number;
  onCropComplete?: (croppedImage: string | null) => void;
}

export function NewImageCropper({
  imageData,
  initialWidth = 300,
  initialHeight = 300,
  onCropComplete
}: NewImageCropperProps) {
  const {
    cropWindow,
    isCropping,
    realDimensions,
    scaleSettings,
    canvasRef,
    imageContainerRef,
    imageRef,
    handleCropWindowChange,
    handleConfirmCrop,
    handleReCrop,
    handleMakeSquare,
    handleScaleChange,
    getCurrentDisplayImage
  } = useAdvancedImageCrop({
    imageData,
    initialWidth,
    initialHeight,
    onCropComplete
  });

  // 本地状态用于输入框
  const [inputWidth, setInputWidth] = useState<string>('');
  const [inputHeight, setInputHeight] = useState<string>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  // 延迟应用的定时器引用
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 同步缩放设置到输入框
  useEffect(() => {
    setInputWidth(Math.round(scaleSettings.width).toString());
    setInputHeight(Math.round(scaleSettings.height).toString());
    setMaintainAspectRatio(scaleSettings.maintainAspectRatio);
  }, [scaleSettings]);

  // 延迟应用缩放变化
  useEffect(() => {
    // 清除之前的定时器
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
    }

    const width = parseInt(inputWidth);
    const height = parseInt(inputHeight);

    // 验证尺寸有效性
    const isWidthValid = !isNaN(width) && width >= 10;
    const isHeightValid = !isNaN(height) && height >= 10;

    // 只有当尺寸有效时才应用变化
    if (isWidthValid && (maintainAspectRatio || isHeightValid)) {
      delayTimerRef.current = setTimeout(() => {
        if (maintainAspectRatio) {
          handleScaleChange(width, undefined, true);
        } else if (isHeightValid) {
          handleScaleChange(width, height, false);
        }
      }, 500); // 500ms 延迟
    }

    // 清理函数
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, [inputWidth, inputHeight, maintainAspectRatio, handleScaleChange]);

  // 处理宽度输入变化
  const handleWidthChange = (value: string) => {
    setInputWidth(value);
  };

  // 处理高度输入变化
  const handleHeightChange = (value: string) => {
    setInputHeight(value);
  };

  // 处理等比例选项变化
  const handleAspectRatioChange = (checked: boolean) => {
    setMaintainAspectRatio(checked);
  };

  // 验证输入值是否有效
  const isInputValid = () => {
    const width = parseInt(inputWidth);
    const height = parseInt(inputHeight);
    const isWidthValid = !isNaN(width) && width >= 10;
    const isHeightValid = !isNaN(height) && height >= 10;

    return isWidthValid && (maintainAspectRatio || isHeightValid);
  };

  // 预设尺寸选项
  const presetSizes = [
    { label: '头像', width: 128, height: 128 },
    { label: '图标', width: 256, height: 256 },
    { label: '缩略图', width: 400, height: 300 },
    { label: '标准', width: 512, height: 512 },
  ];

  const handlePresetSize = (width: number, height: number) => {
    setInputWidth(width.toString());
    setInputHeight(height.toString());
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* 主要工作区域 */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ImageIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-800">智能图片裁剪</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {isCropping ? '调整裁剪区域' : '预览与调整'}
                </p>
              </div>
            </div>
            {isCropping && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                裁剪模式
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* 图片显示区域 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div
              ref={imageContainerRef}
              className="relative w-full h-[65vh] bg-gradient-to-br from-gray-50 to-gray-100"
            >
              {/* 原始图片 */}
              <img
                ref={imageRef}
                src={getCurrentDisplayImage()}
                alt="待裁剪图片"
                className="w-full h-full object-contain"
              />

              {/* 裁剪覆盖层 */}
              {isCropping && (
                <div className="absolute inset-0 bg-black/40 pointer-events-none">
                  <CropCanvas
                    containerRef={imageContainerRef}
                    cropWindow={cropWindow}
                    onCropWindowChange={handleCropWindowChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 控制面板 */}
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            {isCropping ? (
              /* 裁剪模式控制 */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-blue-600" />
                      裁剪设置
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>预期尺寸:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {Math.round(realDimensions.width)} × {Math.round(realDimensions.height)} 像素
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMakeSquare}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      正方形
                    </Button>
                    <Button 
                      onClick={handleConfirmCrop}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      确认裁剪
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* 非裁剪模式控制 */
              <div className="space-y-6">
                {/* 快捷操作按钮 */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Maximize2 className="w-5 h-5 mr-2 text-green-600" />
                    图片处理
                  </h3>
                  <div className="flex items-center space-x-3">
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReCrop}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      重新裁剪
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* 尺寸调整区域 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-700">尺寸调整</h4>
                  
                  {/* 预设尺寸 */}
                  <div className="grid grid-cols-4 gap-3">
                    {presetSizes.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetSize(preset.width, preset.height)}
                        className="flex flex-col items-center py-3 h-auto border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-slate-500">
                          {preset.width}×{preset.height}
                        </span>
                      </Button>
                    ))}
                  </div>

                  {/* 自定义尺寸输入 */}
                  <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        id="maintain-aspect-ratio"
                        type="checkbox"
                        checked={maintainAspectRatio}
                        onChange={(e) => handleAspectRatioChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <label htmlFor="maintain-aspect-ratio" className="text-sm font-medium text-slate-700">
                        保持宽高比
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-slate-700">宽:</label>
                        <Input
                          type="number"
                          value={inputWidth}
                          onChange={(e) => handleWidthChange(e.target.value)}
                          className={`w-20 h-8 text-sm ${
                            parseInt(inputWidth) < 10 && inputWidth !== '' ? 'border-red-300' : ''
                          }`}
                          min="10"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-slate-700">高:</label>
                        <Input
                          type="number"
                          value={inputHeight}
                          onChange={(e) => handleHeightChange(e.target.value)}
                          className={`w-20 h-8 text-sm ${
                            parseInt(inputHeight) < 10 && inputHeight !== '' && !maintainAspectRatio ? 'border-red-300' : ''
                          }`}
                          min="10"
                          disabled={maintainAspectRatio}
                        />
                      </div>

                      {/* 状态指示 */}
                      {!isInputValid() && (inputWidth !== '' || inputHeight !== '') && (
                        <Badge variant="destructive" className="text-xs">
                          尺寸需≥10px
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 隐藏的画布 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
} 