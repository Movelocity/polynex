import { useState, useRef, useCallback } from 'react';

// 定义图片编辑指令类型
export interface CropCommand {
  type: 'crop';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeCommand {
  type: 'resize';
  width: number;
  height: number;
}

export interface PadCommand {
  type: 'pad';
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: string;
}

export type ImageCommand = CropCommand | ResizeCommand | PadCommand;

// 图片信息接口
export interface ImageInfo {
  id: string;
  url: string;
  width: number;
  height: number;
  name: string;
}

// 编辑历史记录
export interface EditHistory {
  id: string;
  commands: ImageCommand[];
  timestamp: number;
  previewUrl: string;
  width?: number;  // 添加这行
  height?: number; // 添加这行
}

export interface UseImageEditorReturn {
  // 图片相关
  images: ImageInfo[];
  currentImageId: string | null;
  currentImageUrl: string | null;
  currentSize: {
    width: number;
    height: number;
  };

  // 编辑相关
  isProcessing: boolean;
  history: EditHistory[];
  currentHistoryIndex: number;
  
  // 方法
  uploadImage: (file: File) => Promise<void>;
  addImage: (url: string, name: string) => Promise<ImageInfo>;
  selectImage: (imageId: string) => void;
  applyCommand: (command: ImageCommand) => Promise<string | null>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export function useImageEditor(): UseImageEditorReturn {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const imageRefs = useRef<Record<string, HTMLImageElement>>({});
  
  // 获取当前图片信息
  const currentImageUrl = images.find(img => img.id === currentImageId)?.url || null;
  const [currentSize, setCurrentSize] = useState({
    width: 0,
    height: 0
  });
  
  // 上传图片
  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('请上传图片文件');
    }
    
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const img = new Image();
      const imageInfo = await new Promise<ImageInfo>((resolve, reject) => {
        img.onload = () => {
          const info: ImageInfo = {
            id: `img_${Date.now()}`,
            url: imageData,
            width: img.width,
            height: img.height,
            name: file.name
          };
          imageRefs.current[info.id] = img;
          resolve(info);
        };
        img.onerror = reject;
        img.src = imageData;
      });

      setCurrentSize({
        width: img.width,
        height: img.height
      });

      setImages(prev => [...prev, imageInfo]);
      setCurrentImageId(imageInfo.id);
      
      // 添加初始历史记录
      const initialHistory: EditHistory = {
        id: `hist_${Date.now()}`,
        commands: [],
        timestamp: Date.now(),
        previewUrl: imageData,
        width: img.width,
        height: img.height
      };
      
      setHistory([initialHistory]);
      setCurrentHistoryIndex(0);
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  // 添加图片（通过URL）
  const addImage = useCallback(async (url: string, name: string) => {
    setIsProcessing(true);
    try {
      const img = new Image();
      const imageInfo = await new Promise<ImageInfo>((resolve, reject) => {
        img.onload = () => {
          const info: ImageInfo = {
            id: `img_${Date.now()}`,
            url,
            width: img.width,
            height: img.height,
            name
          };
          imageRefs.current[info.id] = img;
          resolve(info);
        };
        img.onerror = reject;
        img.src = url;
      });
      
      setImages(prev => [...prev, imageInfo]);
      setCurrentImageId(imageInfo.id);
      
      // 添加初始历史记录
      const initialHistory: EditHistory = {
        id: `hist_${Date.now()}`,
        commands: [],
        timestamp: Date.now(),
        previewUrl: url,
        width: img.width,
        height: img.height
      };
      
      setHistory([initialHistory]);
      setCurrentHistoryIndex(0);
      
      return imageInfo;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  // 选择图片
  const selectImage = useCallback((imageId: string) => {
    if (images.some(img => img.id === imageId)) {
      setCurrentImageId(imageId);
    }
  }, [images]);
  
  // 应用编辑指令
  const applyCommand = useCallback(async (command: ImageCommand) => {
    if (!currentImageId) return null;
    
    setIsProcessing(true);
    try {
      // 获取当前历史状态
      const currentHistory = currentHistoryIndex >= 0 ? history[currentHistoryIndex] : null;
      const commands = currentHistory ? [...currentHistory.commands, command] : [command];
      
      // 基于当前历史记录的预览图片创建新的图片对象
      const currentPreviewUrl = currentHistory?.previewUrl || imageRefs.current[currentImageId]?.src;
      if (!currentPreviewUrl) return null;
      
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = currentPreviewUrl;
      });
      
      // 等待图片加载完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 创建新的预览URL（在实际实现中会是处理后的图片）
      const previewUrl = URL.createObjectURL(
        await new Promise<Blob>((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(new Blob());
            return;
          }
          
          // 根据不同指令类型设置画布尺寸
          let width = img.width;
          let height = img.height;
          
          switch (command.type) {
            case 'resize':
              width = command.width;
              height = command.height;
              break;
            case 'pad':
              width = img.width + command.left + command.right;
              height = img.height + command.top + command.bottom;
              break;
            case 'crop':
              width = command.width;
              height = command.height;
              break;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 应用不同的编辑效果
          switch (command.type) {
            case 'crop':
              ctx.drawImage(
                img,
                command.x,
                command.y,
                command.width,
                command.height,
                0,
                0,
                command.width,
                command.height
              );
              break;
              
            case 'resize':
              ctx.drawImage(img, 0, 0, command.width, command.height);
              break;
              
            case 'pad':
              // 填充背景色
              ctx.fillStyle = command.color;
              ctx.fillRect(0, 0, width, height);
              // 绘制原始图片
              ctx.drawImage(img, command.left, command.top);
              break;
          }

          setCurrentSize((prev) => ({
            ...prev,
            width: width,
            height: height
          }));

          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        })
      );
      
      // 创建新的历史记录
      const newHistory: EditHistory = {
        id: `hist_${Date.now()}`,
        commands,
        timestamp: Date.now(),
        previewUrl,
        width: img.width,
        height: img.height
      };
      
      // 更新历史记录（删除当前之后的历史）
      const newHistoryList = [...history.slice(0, currentHistoryIndex + 1), newHistory];
      setHistory(newHistoryList);
      setCurrentHistoryIndex(newHistoryList.length - 1);
      
      return previewUrl;
    } finally {
      setIsProcessing(false);
    }
  }, [currentImageId, history, currentHistoryIndex]);
  
  // 撤销操作
  const undo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    }
  }, [currentHistoryIndex]);
  
  // 重做操作
  const redo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
  }, [currentHistoryIndex, history.length]);
  
  // 重置编辑器
  const reset = useCallback(() => {
    setImages([]);
    setCurrentImageId(null);
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setIsProcessing(false);
    imageRefs.current = {};
  }, []);
  
  return {
    images,
    currentImageId,
    currentImageUrl,
    currentSize,
    isProcessing,
    history,
    currentHistoryIndex,
    uploadImage,
    addImage,
    selectImage,
    applyCommand,
    undo,
    redo,
    reset
  };
}