import { useState, useRef, useEffect, useCallback } from 'react';

export interface CropRect {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ScaleSettings {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export interface UseAdvancedImageCropProps {
  imageData: string;
  initialWidth?: number;
  initialHeight?: number;
  onCropComplete?: (croppedImage: string | null) => void;
}

export const useAdvancedImageCrop = ({
  imageData,
  initialWidth = 300,
  initialHeight = 300,
  onCropComplete
}: UseAdvancedImageCropProps) => {
  // 状态管理
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropWindow, setCropWindow] = useState<CropRect>({
    width: initialWidth / 2,
    height: initialHeight / 2,
    x: 0,
    y: 0
  });
  const [isCropping, setIsCropping] = useState(true); // 默认进入裁剪模式
  const [croppedImageData, setCroppedImageData] = useState<string | null>(null);
  
  // 缩放相关状态
  const [scaleSettings, setScaleSettings] = useState<ScaleSettings>({
    width: 0,
    height: 0,
    maintainAspectRatio: true
  });
  const [scaledImageData, setScaledImageData] = useState<string | null>(null);
  
  // 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 加载图片并获取尺寸
  useEffect(() => {
    if (imageData) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        
        // 初始化缩放设置为原图尺寸
        setScaleSettings({
          width: img.width,
          height: img.height,
          maintainAspectRatio: true
        });
        
        // 自动设置默认裁剪区域
        setTimeout(() => {
          if (imageContainerRef.current) {
            const containerRect = imageContainerRef.current.getBoundingClientRect();
            const { width: imgWidth, height: imgHeight } = { width: img.width, height: img.height };
            
            // 计算图片在容器中的显示尺寸和位置
            const containerRatio = containerRect.width / containerRect.height;
            const imageRatio = imgWidth / imgHeight;
            
            let displayedWidth, displayedHeight, offsetX, offsetY;
            
            if (imageRatio > containerRatio) {
              displayedWidth = containerRect.width;
              displayedHeight = containerRect.width / imageRatio;
              offsetX = 0;
              offsetY = (containerRect.height - displayedHeight) / 2;
            } else {
              displayedHeight = containerRect.height;
              displayedWidth = containerRect.height * imageRatio;
              offsetX = (containerRect.width - displayedWidth) / 2;
              offsetY = 0;
            }
            
            // 智能设置默认裁剪区域
            if (Math.abs(imgWidth - imgHeight) < Math.min(imgWidth, imgHeight) * 0.01) {
              // 图片接近1:1，选框覆盖整个显示区域
              setCropWindow({
                width: displayedWidth,
                height: displayedHeight,
                x: offsetX,
                y: offsetY
              });
            } else {
              const shortSide = Math.min(imgWidth, imgHeight);
              const longSide = Math.max(imgWidth, imgHeight);
              const sideRatio = shortSide / longSide;
              
              if (sideRatio > 0.6) {
                // 智能裁剪：选框设置为正方形
                const shortDisplaySide = Math.min(displayedWidth, displayedHeight);
                setCropWindow({
                  width: shortDisplaySide,
                  height: shortDisplaySide,
                  x: offsetX + (displayedWidth - shortDisplaySide) / 2,
                  y: offsetY + (displayedHeight - shortDisplaySide) / 2
                });
              } else {
                // 窄图片：选框覆盖整个显示区域
                setCropWindow({
                  width: displayedWidth,
                  height: displayedHeight,
                  x: offsetX,
                  y: offsetY
                });
              }
            }
          }
        }, 100);
      };
      img.src = imageData;
    }
  }, [imageData]);

  // 缩放图片函数
  const scaleImage = useCallback((sourceImageData: string, targetWidth: number, targetHeight: number) => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const scaledDataUrl = canvas.toDataURL('image/png');
        resolve(scaledDataUrl);
      };
      img.src = sourceImageData;
    });
  }, []);

  // 计算实际裁剪尺寸
  const calculateRealCropDimensions = useCallback(() => {
    if (!originalDimensions || !imageContainerRef.current || !cropWindow) {
      return { width: 0, height: 0 };
    }
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const { width: imgWidth, height: imgHeight } = originalDimensions;
    
    // 计算图片在容器中的显示尺寸和位置
    const containerRatio = containerRect.width / containerRect.height;
    const imageRatio = imgWidth / imgHeight;
    
    let displayedWidth, displayedHeight, offsetX, offsetY;
    
    if (imageRatio > containerRatio) {
      displayedWidth = containerRect.width;
      displayedHeight = containerRect.width / imageRatio;
      offsetX = 0;
      offsetY = (containerRect.height - displayedHeight) / 2;
    } else {
      displayedHeight = containerRect.height;
      displayedWidth = containerRect.height * imageRatio;
      offsetX = (containerRect.width - displayedWidth) / 2;
      offsetY = 0;
    }
    
    // 将选框坐标转换为原图坐标
    const relativeX = (cropWindow.x - offsetX) / displayedWidth;
    const relativeY = (cropWindow.y - offsetY) / displayedHeight;
    const relativeWidth = cropWindow.width / displayedWidth;
    const relativeHeight = cropWindow.height / displayedHeight;
    
    // 计算在原图中的实际裁剪区域尺寸
    const sourceWidth = relativeWidth * imgWidth;
    const sourceHeight = relativeHeight * imgHeight;
    
    // 设置最大输出尺寸为512，但保持原始比例
    const maxSize = 512;
    const aspectRatio = sourceWidth / sourceHeight;
    
    let outputWidth, outputHeight;
    if (aspectRatio > 1) {
      // 宽图
      outputWidth = Math.min(maxSize, sourceWidth);
      outputHeight = outputWidth / aspectRatio;
    } else {
      // 高图
      outputHeight = Math.min(maxSize, sourceHeight);
      outputWidth = outputHeight * aspectRatio;
    }
    
    return { 
      width: Math.round(outputWidth), 
      height: Math.round(outputHeight) 
    };
  }, [originalDimensions, cropWindow]);

  // 处理缩放设置变化
  const handleScaleChange = useCallback(async (newWidth?: number, newHeight?: number, newMaintainAspectRatio?: boolean) => {
    if (!originalDimensions) return;
    
    const maintainRatio = newMaintainAspectRatio !== undefined ? newMaintainAspectRatio : scaleSettings.maintainAspectRatio;
    let finalWidth = newWidth || scaleSettings.width;
    let finalHeight = newHeight || scaleSettings.height;
    
    // 获取当前图片的宽高比
    let currentImageWidth = originalDimensions.width;
    let currentImageHeight = originalDimensions.height;
    
    if (croppedImageData) {
      const realDims = calculateRealCropDimensions();
      currentImageWidth = realDims.width;
      currentImageHeight = realDims.height;
    }
    
    // 如果保持宽高比
    if (maintainRatio) {
      const aspectRatio = currentImageWidth / currentImageHeight;
      
      if (newWidth && !newHeight) {
        finalHeight = newWidth / aspectRatio;
      } else if (newHeight && !newWidth) {
        finalWidth = newHeight * aspectRatio;
      }
    }
    
    setScaleSettings({
      width: finalWidth,
      height: finalHeight,
      maintainAspectRatio: maintainRatio
    });
    
    // 获取当前要缩放的图片
    const sourceImage = croppedImageData || imageData;
    const scaled = await scaleImage(sourceImage, finalWidth, finalHeight);
    if (scaled) {
      setScaledImageData(scaled);
      if (onCropComplete) {
        onCropComplete(scaled);
      }
    }
  }, [originalDimensions, scaleSettings, croppedImageData, imageData, scaleImage, onCropComplete, calculateRealCropDimensions]);

  // 裁剪图片
  const cropImage = useCallback(() => {
    if (!originalDimensions || !canvasRef.current || !imageContainerRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { width: imgWidth, height: imgHeight } = originalDimensions;
      const containerRect = imageContainerRef.current!.getBoundingClientRect();
      
      // 计算图片在容器中的显示尺寸和位置
      const containerRatio = containerRect.width / containerRect.height;
      const imageRatio = imgWidth / imgHeight;
      
      let displayedWidth, displayedHeight, offsetX, offsetY;
      
      if (imageRatio > containerRatio) {
        displayedWidth = containerRect.width;
        displayedHeight = containerRect.width / imageRatio;
        offsetX = 0;
        offsetY = (containerRect.height - displayedHeight) / 2;
      } else {
        displayedHeight = containerRect.height;
        displayedWidth = containerRect.height * imageRatio;
        offsetX = (containerRect.width - displayedWidth) / 2;
        offsetY = 0;
      }
      
      // 将选框坐标转换为原图坐标
      const relativeX = (cropWindow.x - offsetX) / displayedWidth;
      const relativeY = (cropWindow.y - offsetY) / displayedHeight;
      const relativeWidth = cropWindow.width / displayedWidth;
      const relativeHeight = cropWindow.height / displayedHeight;
      
      // 计算在原图中的实际裁剪区域
      const sourceX = relativeX * imgWidth;
      const sourceY = relativeY * imgHeight;
      const sourceWidth = relativeWidth * imgWidth;
      const sourceHeight = relativeHeight * imgHeight;

      // 计算输出尺寸，保持原始比例
      const realDims = calculateRealCropDimensions();
      const targetWidth = realDims.width;
      const targetHeight = realDims.height;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 裁剪逻辑
      if (relativeX >= 0 && relativeY >= 0 && relativeX + relativeWidth <= 1 && relativeY + relativeHeight <= 1) {
        // 选框完全在图片内，直接按比例缩放
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetWidth, targetHeight
        );
      } else {
        // 选框超出图片边界的处理
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        const intersectX = Math.max(0, sourceX);
        const intersectY = Math.max(0, sourceY);
        const intersectWidth = Math.min(imgWidth - intersectX, sourceX + sourceWidth - intersectX);
        const intersectHeight = Math.min(imgHeight - intersectY, sourceY + sourceHeight - intersectY);
        
        if (intersectWidth > 0 && intersectHeight > 0) {
          const relativeIntersectX = (intersectX - sourceX) / sourceWidth;
          const relativeIntersectY = (intersectY - sourceY) / sourceHeight;
          const relativeIntersectWidth = intersectWidth / sourceWidth;
          const relativeIntersectHeight = intersectHeight / sourceHeight;
          
          const canvasX = relativeIntersectX * targetWidth;
          const canvasY = relativeIntersectY * targetHeight;
          const canvasWidth = relativeIntersectWidth * targetWidth;
          const canvasHeight = relativeIntersectHeight * targetHeight;
          
          ctx.drawImage(
            img,
            intersectX, intersectY, intersectWidth, intersectHeight,
            canvasX, canvasY, canvasWidth, canvasHeight
          );
        }
      }

      const croppedDataUrl = canvas.toDataURL('image/png');
      setCroppedImageData(croppedDataUrl);
      
      // 重置缩放设置为裁剪结果的实际尺寸
      setScaleSettings({
        width: targetWidth,
        height: targetHeight,
        maintainAspectRatio: true
      });
      setScaledImageData(null);
      
      if (onCropComplete) {
        onCropComplete(croppedDataUrl);
      }
    };
    img.src = imageData;
  }, [originalDimensions, imageData, onCropComplete, cropWindow, calculateRealCropDimensions]);

  // 确认裁剪
  const handleConfirmCrop = useCallback(() => {
    cropImage();
    setIsCropping(false);
  }, [cropImage]);

  // 重新裁剪
  const handleReCrop = useCallback(() => {
    setIsCropping(true);
    setCroppedImageData(null);
    setScaledImageData(null);
    
    if (originalDimensions) {
      setScaleSettings({
        width: originalDimensions.width,
        height: originalDimensions.height,
        maintainAspectRatio: true
      });
    }
    
    if (onCropComplete) {
      onCropComplete(null);
    }
  }, [originalDimensions, onCropComplete]);

  // 设置为正方形
  const handleMakeSquare = useCallback(() => {
    setCropWindow(prev => {
      const side = Math.min(prev.width, prev.height);
      return {
        ...prev,
        width: side,
        height: side
      };
    });
  }, []);

  // 裁剪区域变化处理
  const handleCropWindowChange = useCallback((newCropWindow: CropRect) => {
    setCropWindow(newCropWindow);
  }, []);

  const realDimensions = calculateRealCropDimensions();

  // 获取当前显示的图片
  const getCurrentDisplayImage = useCallback(() => {
    if (isCropping) {
      return imageData; // 裁剪模式显示原图
    }
    return scaledImageData || croppedImageData || imageData; // 非裁剪模式显示缩放图或裁剪图或原图
  }, [isCropping, scaledImageData, croppedImageData, imageData]);

  return {
    // 状态
    cropWindow,
    isCropping,
    croppedImageData,
    originalDimensions,
    realDimensions,
    scaleSettings,
    scaledImageData,
    
    // 引用
    canvasRef,
    imageContainerRef,
    imageRef,
    
    // 处理函数
    handleCropWindowChange,
    handleConfirmCrop,
    handleReCrop,
    handleMakeSquare,
    handleScaleChange,

    // 功能函数
    cropImage,
    calculateRealCropDimensions,
    getCurrentDisplayImage
  };
}; 