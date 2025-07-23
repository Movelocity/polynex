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

// 新增：模式枚举
export type CropperMode = 'preview' | 'cropping' | 'result';

export interface UseImageCropReturn {
  originalImage: string | null;
  proxyImage: string | null;
  croppedImage: string | null; // 新增：裁剪后的图片
  cropArea: CropArea;
  imageDimensions: ImageDimensions | null;
  isLoading: boolean;
  mode: CropperMode; // 新增：当前模式
  sizeBasis: number; // 新增：宽高基数
  setSizeBasis: (basis: number) => void; // 新增：设置宽高基数
  loadImage: (base64: string) => Promise<void>;
  updateCropArea: (area: CropArea) => void;
  getCroppedImage: () => Promise<string | null>;
  startCropping: () => void; // 新增：开始裁剪模式
  finishCropping: () => Promise<void>; // 新增：完成裁剪，进入结果模式
  backToPreview: () => void; // 新增：返回预览模式
  reset: () => void;
}

const MAX_DISPLAY_WIDTH = 1000;

export function useImageCrop(): UseImageCropReturn {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [proxyImage, setProxyImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null); // 新增
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<CropperMode>('preview'); // 新增
  const [sizeBasis, setSizeBasis] = useState<number>(1); // 新增
  
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const proxyImageRef = useRef<HTMLImageElement | null>(null);

  // 对齐到sizeBasis的倍数
  const alignToBasis = useCallback((value: number, basis: number) => {
    return Math.round(value / basis) * basis;
  }, []);

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

      // 重置为预览模式
      setMode('preview');
      setCroppedImage(null);
    } catch (error) {
      console.error('Failed to load image:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createProxyImage]);

  // 更新裁剪区域，自动对齐sizeBasis
  const updateCropArea = useCallback((area: CropArea) => {
    setCropArea(prev => {
      const basis = sizeBasis > 1 ? sizeBasis : 1;
      return {
        x: alignToBasis(area.x, basis),
        y: alignToBasis(area.y, basis),
        width: Math.max(basis, alignToBasis(area.width, basis)),
        height: Math.max(basis, alignToBasis(area.height, basis)),
      };
    });
  }, [alignToBasis, sizeBasis]);

  // 获取裁剪后的图片，canvas宽高对齐sizeBasis
  const getCroppedImage = useCallback(async (): Promise<string | null> => {
    if (!originalImageRef.current || !imageDimensions) return null;

    const basis = sizeBasis > 1 ? sizeBasis : 1;
    const scale = imageDimensions.scale;
    let sourceX = cropArea.x / scale;
    let sourceY = cropArea.y / scale;
    let sourceWidth = cropArea.width / scale;
    let sourceHeight = cropArea.height / scale;

    // 对齐到基数
    sourceX = alignToBasis(sourceX, basis);
    sourceY = alignToBasis(sourceY, basis);
    sourceWidth = Math.max(basis, alignToBasis(sourceWidth, basis));
    sourceHeight = Math.max(basis, alignToBasis(sourceHeight, basis));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

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
  }, [cropArea, imageDimensions, sizeBasis, alignToBasis]);

  // 新增：开始裁剪模式
  const startCropping = useCallback(() => {
    setMode('cropping');
  }, []);

  // 新增：完成裁剪，进入结果模式
  const finishCropping = useCallback(async () => {
    const cropped = await getCroppedImage();
    if (cropped) {
      setCroppedImage(cropped);
      setMode('result');
    }
  }, [getCroppedImage]);

  // 新增：返回预览模式
  const backToPreview = useCallback(() => {
    setMode('preview');
    setCroppedImage(null);
  }, []);

  // 重置
  const reset = useCallback(() => {
    setOriginalImage(null);
    setProxyImage(null);
    setCroppedImage(null); // 新增
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    setImageDimensions(null);
    setIsLoading(false);
    setMode('preview'); // 新增
    setSizeBasis(1); // 新增
    originalImageRef.current = null;
    proxyImageRef.current = null;
  }, []);

  return {
    originalImage,
    proxyImage,
    croppedImage, // 新增
    cropArea,
    imageDimensions,
    isLoading,
    mode, // 新增
    sizeBasis, // 新增
    setSizeBasis, // 新增
    loadImage,
    updateCropArea,
    getCroppedImage,
    startCropping, // 新增
    finishCropping, // 新增
    backToPreview, // 新增
    reset
  };
} 