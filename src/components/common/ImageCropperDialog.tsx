import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/x-ui/dialog';
import { Button } from '@/components/x-ui/button';
import { ImageCropper, CropArea } from '@/components/ImageCropLegacy/ImageCropper';

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  aspectRatio?: number; // 宽高比，1 表示正方形
  maxWidth?: number;
  maxHeight?: number;
  maxFileSize?: number; // 最大文件大小（字节）
  onCrop: (croppedBlob: Blob) => void;
  title?: string;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageUrl,
  aspectRatio = 1, // 默认正方形
  maxWidth = 512,
  maxHeight = 512,
  maxFileSize = 2 * 1024 * 1024, // 默认2MB
  onCrop,
  title = '裁剪图片'
}: ImageCropperDialogProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载图片并计算初始裁剪区域
  useEffect(() => {
    if (!imageUrl || !open) return;

    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      setImageSize({ width, height });

      // 计算居中的裁剪区域
      let cropWidth, cropHeight;
      
      if (aspectRatio === 1) {
        // 正方形：取较小的尺寸
        const minSize = Math.min(width, height);
        cropWidth = cropHeight = Math.min(minSize, 300); // 默认最大300px
      } else {
        // 按照指定宽高比计算
        if (width / height > aspectRatio) {
          cropHeight = Math.min(height, 300);
          cropWidth = cropHeight * aspectRatio;
        } else {
          cropWidth = Math.min(width, 300);
          cropHeight = cropWidth / aspectRatio;
        }
      }

      const x = (width - cropWidth) / 2;
      const y = (height - cropHeight) / 2;

      setCropArea({ x, y, width: cropWidth, height: cropHeight });
    };
    img.src = imageUrl;
  }, [imageUrl, aspectRatio, open]);

  // 调整裁剪区域以保持宽高比
  const handleCropAreaChange = useCallback((area: CropArea) => {
    if (aspectRatio === 1) {
      // 正方形：保持宽高相等
      const size = Math.min(area.width, area.height);
      setCropArea({
        x: area.x,
        y: area.y,
        width: size,
        height: size
      });
    } else {
      // 按照指定宽高比调整
      const newHeight = area.width / aspectRatio;
      setCropArea({
        x: area.x,
        y: area.y,
        width: area.width,
        height: newHeight
      });
    }
  }, [aspectRatio]);

  // 执行裁剪
  const handleConfirm = useCallback(async () => {
    if (!imageUrl || isProcessing) return;

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取canvas上下文');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // 设置输出尺寸
      let outputWidth = cropArea.width;
      let outputHeight = cropArea.height;

      // 如果超过最大尺寸，按比例缩放
      if (outputWidth > maxWidth || outputHeight > maxHeight) {
        const scale = Math.min(maxWidth / outputWidth, maxHeight / outputHeight);
        outputWidth = Math.round(outputWidth * scale);
        outputHeight = Math.round(outputHeight * scale);
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // 绘制裁剪后的图片
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, outputWidth, outputHeight
      );

      // 转换为Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('图片处理失败');
        }

        // 检查文件大小
        if (blob.size > maxFileSize) {
          // 如果文件太大，降低质量重新生成
          canvas.toBlob((smallerBlob) => {
            if (smallerBlob && smallerBlob.size <= maxFileSize) {
              onCrop(smallerBlob);
              onOpenChange(false);
            } else {
              alert(`图片文件过大，请选择较小的裁剪区域或较低的质量`);
            }
            setIsProcessing(false);
          }, 'image/jpeg', 0.8);
        } else {
          onCrop(blob);
          onOpenChange(false);
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('图片裁剪失败:', error);
      alert('图片裁剪失败，请重试');
      setIsProcessing(false);
    }
  }, [imageUrl, cropArea, maxWidth, maxHeight, maxFileSize, onCrop, onOpenChange, isProcessing]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!imageSize.width || !imageSize.height) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            拖拽调整裁剪区域，输出尺寸：最大 {maxWidth}×{maxHeight}px，
            最大文件大小：{Math.round(maxFileSize / 1024 / 1024)}MB
          </div>
          
          <div className="border rounded-lg p-4 bg-gray-50">
            <ImageCropper
              imageUrl={imageUrl}
              cropArea={cropArea}
              onCropAreaChange={handleCropAreaChange}
              containerWidth={imageSize.width}
              containerHeight={imageSize.height}
              maxContainerWidth={600}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            裁剪区域：{Math.round(cropArea.width)}×{Math.round(cropArea.height)}px
            {aspectRatio === 1 && ' (正方形)'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? '处理中...' : '确认裁剪'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 