import { useState, useCallback, useRef } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  originalWidth: number;
  originalHeight: number;
  displayWidth: number;
  displayHeight: number;
  scale: number;
}

export interface UseImageCropReturn {
  originalImage: string | null;
  proxyImage: string | null;
  cropArea: CropArea;
  imageDimensions: ImageDimensions | null;
  isLoading: boolean;
  loadImage: (base64: string) => Promise<void>;
  updateCropArea: (area: CropArea) => void;
  getCroppedImage: () => Promise<string | null>;
  reset: () => void;
}

const MAX_DISPLAY_WIDTH = 1000;

export function useImageCrop(): UseImageCropReturn {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [proxyImage, setProxyImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const proxyImageRef = useRef<HTMLImageElement | null>(null);

  // 创建缩放后的代理图片
  const createProxyImage = useCallback(async (img: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    let { width, height } = img;
    let scale = 1;

    // 如果图片宽度超过最大显示宽度，则缩放
    if (width > MAX_DISPLAY_WIDTH) {
      scale = MAX_DISPLAY_WIDTH / width;
      width = MAX_DISPLAY_WIDTH;
      height = img.height * scale;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  // 加载图片
  const loadImage = useCallback(async (base64: string) => {
    setIsLoading(true);
    try {
      // 加载原图
      const img = new Image();
      img.src = base64;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      originalImageRef.current = img;
      setOriginalImage(base64);

      // 计算缩放比例
      const scale = img.width > MAX_DISPLAY_WIDTH ? MAX_DISPLAY_WIDTH / img.width : 1;
      const displayWidth = img.width * scale;
      const displayHeight = img.height * scale;

      // 创建代理图片
      const proxy = await createProxyImage(img);
      setProxyImage(proxy);

      // 创建代理图片元素
      const proxyImg = new Image();
      proxyImg.src = proxy;
      await new Promise((resolve) => {
        proxyImg.onload = resolve;
      });
      proxyImageRef.current = proxyImg;

      // 设置图片尺寸信息
      setImageDimensions({
        originalWidth: img.width,
        originalHeight: img.height,
        displayWidth,
        displayHeight,
        scale
      });

      // 初始化裁剪区域为图片中心的正方形
      const size = Math.min(displayWidth, displayHeight) * 0.5;
      setCropArea({
        x: (displayWidth - size) / 2,
        y: (displayHeight - size) / 2,
        width: size,
        height: size
      });
    } catch (error) {
      console.error('Failed to load image:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createProxyImage]);

  // 更新裁剪区域
  const updateCropArea = useCallback((area: CropArea) => {
    setCropArea(area);
  }, []);

  // 获取裁剪后的图片
  const getCroppedImage = useCallback(async (): Promise<string | null> => {
    if (!originalImageRef.current || !imageDimensions) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 将显示坐标转换为原图坐标
    const scale = imageDimensions.scale;
    const sourceX = cropArea.x / scale;
    const sourceY = cropArea.y / scale;
    const sourceWidth = cropArea.width / scale;
    const sourceHeight = cropArea.height / scale;

    // 设置画布大小为裁剪区域大小
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    // 从原图裁剪
    ctx.drawImage(
      originalImageRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    return canvas.toDataURL('image/jpeg', 0.95);
  }, [cropArea, imageDimensions]);

  // 重置
  const reset = useCallback(() => {
    setOriginalImage(null);
    setProxyImage(null);
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    setImageDimensions(null);
    setIsLoading(false);
    originalImageRef.current = null;
    proxyImageRef.current = null;
  }, []);

  return {
    originalImage,
    proxyImage,
    cropArea,
    imageDimensions,
    isLoading,
    loadImage,
    updateCropArea,
    getCroppedImage,
    reset
  };
} 