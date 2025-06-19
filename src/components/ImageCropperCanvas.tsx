import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperCanvasProps {
  imageUrl: string;
  cropArea: CropArea;
  onCropAreaChange: (area: CropArea) => void;
  containerWidth: number;
  containerHeight: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function ImageCropperCanvas({
  imageUrl,
  cropArea,
  onCropAreaChange,
  containerWidth,
  containerHeight
}: ImageCropperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCropArea, setInitialCropArea] = useState<CropArea>(cropArea);

  // 绘制图片和裁剪框
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制图片
      ctx.drawImage(img, 0, 0, containerWidth, containerHeight);

      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 清除裁剪区域的遮罩（显示原图）
      ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

      // 绘制裁剪框边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

      // 绘制裁剪框把手
      const handleSize = 8;
      const handles = [
        { x: cropArea.x - handleSize / 2, y: cropArea.y - handleSize / 2 }, // nw
        { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y - handleSize / 2 }, // ne
        { x: cropArea.x - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2 }, // sw
        { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2 }, // se
        { x: cropArea.x + cropArea.width / 2 - handleSize / 2, y: cropArea.y - handleSize / 2 }, // n
        { x: cropArea.x + cropArea.width / 2 - handleSize / 2, y: cropArea.y + cropArea.height - handleSize / 2 }, // s
        { x: cropArea.x - handleSize / 2, y: cropArea.y + cropArea.height / 2 - handleSize / 2 }, // w
        { x: cropArea.x + cropArea.width - handleSize / 2, y: cropArea.y + cropArea.height / 2 - handleSize / 2 }, // e
      ];

      ctx.fillStyle = '#fff';
      handles.forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      });

      // 绘制裁剪区域内的图片
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      ctx.clip();
      ctx.drawImage(img, 0, 0, containerWidth, containerHeight);
      ctx.restore();
    };
  }, [imageUrl, cropArea, containerWidth, containerHeight]);

  // 获取鼠标位置对应的拖拽把手
  const getHandleAtPosition = useCallback((x: number, y: number): DragHandle => {
    const handleSize = 16; // 把手的点击区域
    const halfSize = handleSize / 2;

    // 角把手
    if (Math.abs(x - cropArea.x) < halfSize && Math.abs(y - cropArea.y) < halfSize) return 'nw';
    if (Math.abs(x - (cropArea.x + cropArea.width)) < halfSize && Math.abs(y - cropArea.y) < halfSize) return 'ne';
    if (Math.abs(x - cropArea.x) < halfSize && Math.abs(y - (cropArea.y + cropArea.height)) < halfSize) return 'sw';
    if (Math.abs(x - (cropArea.x + cropArea.width)) < halfSize && Math.abs(y - (cropArea.y + cropArea.height)) < halfSize) return 'se';

    // 边把手
    if (Math.abs(x - (cropArea.x + cropArea.width / 2)) < halfSize && Math.abs(y - cropArea.y) < halfSize) return 'n';
    if (Math.abs(x - (cropArea.x + cropArea.width / 2)) < halfSize && Math.abs(y - (cropArea.y + cropArea.height)) < halfSize) return 's';
    if (Math.abs(x - cropArea.x) < halfSize && Math.abs(y - (cropArea.y + cropArea.height / 2)) < halfSize) return 'w';
    if (Math.abs(x - (cropArea.x + cropArea.width)) < halfSize && Math.abs(y - (cropArea.y + cropArea.height / 2)) < halfSize) return 'e';

    // 裁剪框内部
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      return 'move';
    }

    return null;
  }, [cropArea]);

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setIsDragging(true);
      setDragHandle(handle);
      setDragStart({ x, y });
      setInitialCropArea({ ...cropArea });
    }
  }, [cropArea, getHandleAtPosition]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 更新鼠标样式
    if (!isDragging) {
      const handle = getHandleAtPosition(x, y);
      switch (handle) {
        case 'nw':
        case 'se':
          canvas.style.cursor = 'nwse-resize';
          break;
        case 'ne':
        case 'sw':
          canvas.style.cursor = 'nesw-resize';
          break;
        case 'n':
        case 's':
          canvas.style.cursor = 'ns-resize';
          break;
        case 'e':
        case 'w':
          canvas.style.cursor = 'ew-resize';
          break;
        case 'move':
          canvas.style.cursor = 'move';
          break;
        default:
          canvas.style.cursor = 'default';
      }
    }

    // 处理拖拽
    if (isDragging && dragHandle) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      let newCropArea = { ...initialCropArea };

      switch (dragHandle) {
        case 'move':
          newCropArea.x = Math.max(0, Math.min(containerWidth - newCropArea.width, initialCropArea.x + dx));
          newCropArea.y = Math.max(0, Math.min(containerHeight - newCropArea.height, initialCropArea.y + dy));
          break;
        case 'nw':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 'ne':
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.width = Math.max(20, Math.min(containerWidth - initialCropArea.x, initialCropArea.width + dx));
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 'sw':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          newCropArea.height = Math.max(20, Math.min(containerHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'se':
          newCropArea.width = Math.max(20, Math.min(containerWidth - initialCropArea.x, initialCropArea.width + dx));
          newCropArea.height = Math.max(20, Math.min(containerHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'n':
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 's':
          newCropArea.height = Math.max(20, Math.min(containerHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'w':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          break;
        case 'e':
          newCropArea.width = Math.max(20, Math.min(containerWidth - initialCropArea.x, initialCropArea.width + dx));
          break;
      }

      onCropAreaChange(newCropArea);
    }
  }, [isDragging, dragHandle, dragStart, initialCropArea, containerWidth, containerHeight, getHandleAtPosition, onCropAreaChange]);

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // 处理鼠标离开画布
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragHandle(null);
    }
  }, [isDragging]);

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={containerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="border border-slate-200 rounded-lg"
    />
  );
} 