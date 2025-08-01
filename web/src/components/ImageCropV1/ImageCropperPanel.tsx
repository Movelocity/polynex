import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperProps {
  imageUrl: string;
  cropArea: CropArea;
  onCropAreaChange: (area: CropArea) => void;
  containerWidth: number;
  containerHeight: number;
  maxContainerWidth?: number;
  maxContainerHeight?: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function ImageCropperPanel({
  imageUrl,
  cropArea,
  onCropAreaChange,
  containerWidth,
  containerHeight,
  maxContainerWidth = 800,
  maxContainerHeight = 600
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const animationFrameRef = useRef<number>();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCropArea, setInitialCropArea] = useState<CropArea>(cropArea);

  const getActualDisplaySize = useCallback(() => {
    let displayWidth = containerWidth;
    let displayHeight = containerHeight;
    
    const widthScale = maxContainerWidth / displayWidth;
    const heightScale = maxContainerHeight / displayHeight;
    
    const scale = Math.min(widthScale, heightScale, 1);
    
    displayWidth = displayWidth * scale;
    displayHeight = displayHeight * scale;
    
    return { displayWidth, displayHeight };
  }, [containerWidth, containerHeight, maxContainerWidth, maxContainerHeight]);

  const actualSize = getActualDisplaySize();
  const displayScale = actualSize.displayWidth / containerWidth;

  const toDisplayCoords = useCallback((area: CropArea) => {
    return {
      x: area.x * displayScale,
      y: area.y * displayScale,
      width: area.width * displayScale,
      height: area.height * displayScale
    };
  }, [displayScale]);

  const toOriginalCoords = useCallback((area: CropArea) => {
    return {
      x: area.x / displayScale,
      y: area.y / displayScale,
      width: area.width / displayScale,
      height: area.height / displayScale
    };
  }, [displayScale]);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { scaleX: 1, scaleY: 1 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { scaleX, scaleY };
  }, []);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const { scaleX, scaleY } = getCanvasScale();
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  }, [getCanvasScale]);

  const displayCropArea = toDisplayCoords(cropArea);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(img, 0, 0, actualSize.displayWidth, actualSize.displayHeight);
  }, [actualSize]);

  const drawCropOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.clearRect(displayCropArea.x, displayCropArea.y, displayCropArea.width, displayCropArea.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(displayCropArea.x, displayCropArea.y, displayCropArea.width, displayCropArea.height);
    ctx.clip();
    ctx.drawImage(img, 0, 0, actualSize.displayWidth, actualSize.displayHeight);
    ctx.restore();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(displayCropArea.x, displayCropArea.y, displayCropArea.width, displayCropArea.height);

    const handleSize = 8;
    const handles = [
      { x: displayCropArea.x - handleSize / 2, y: displayCropArea.y - handleSize / 2 },
      { x: displayCropArea.x + displayCropArea.width - handleSize / 2, y: displayCropArea.y - handleSize / 2 },
      { x: displayCropArea.x - handleSize / 2, y: displayCropArea.y + displayCropArea.height - handleSize / 2 },
      { x: displayCropArea.x + displayCropArea.width - handleSize / 2, y: displayCropArea.y + displayCropArea.height - handleSize / 2 },
      { x: displayCropArea.x + displayCropArea.width / 2 - handleSize / 2, y: displayCropArea.y - handleSize / 2 },
      { x: displayCropArea.x + displayCropArea.width / 2 - handleSize / 2, y: displayCropArea.y + displayCropArea.height - handleSize / 2 },
      { x: displayCropArea.x - handleSize / 2, y: displayCropArea.y + displayCropArea.height / 2 - handleSize / 2 },
      { x: displayCropArea.x + displayCropArea.width - handleSize / 2, y: displayCropArea.y + displayCropArea.height / 2 - handleSize / 2 },
    ];

    ctx.fillStyle = '#fff';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  }, [displayCropArea, actualSize]);

  const scheduleRedraw = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (imageLoaded) {
        drawImage();
        drawCropOverlay();
      }
    });
  }, [imageLoaded, drawImage, drawCropOverlay]);

  useEffect(() => {
    if (!imageUrl) return;

    if (imageRef.current && imageRef.current.src === imageUrl && imageLoaded) {
      scheduleRedraw();
      return;
    }

    setImageLoaded(false);
    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
      setImageLoaded(false);
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      scheduleRedraw();
    }
  }, [imageLoaded, displayCropArea, actualSize, scheduleRedraw]);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDragging || !dragHandle) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      let newCropArea = { ...initialCropArea };

      switch (dragHandle) {
        case 'move':
          newCropArea.x = Math.max(0, Math.min(actualSize.displayWidth - newCropArea.width, initialCropArea.x + dx));
          newCropArea.y = Math.max(0, Math.min(actualSize.displayHeight - newCropArea.height, initialCropArea.y + dy));
          break;
        case 'nw':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 'ne':
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.width = Math.max(20, Math.min(actualSize.displayWidth - initialCropArea.x, initialCropArea.width + dx));
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 'sw':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          newCropArea.height = Math.max(20, Math.min(actualSize.displayHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'se':
          newCropArea.width = Math.max(20, Math.min(actualSize.displayWidth - initialCropArea.x, initialCropArea.width + dx));
          newCropArea.height = Math.max(20, Math.min(actualSize.displayHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'n':
          newCropArea.y = Math.max(0, Math.min(initialCropArea.y + initialCropArea.height - 20, initialCropArea.y + dy));
          newCropArea.height = initialCropArea.height - (newCropArea.y - initialCropArea.y);
          break;
        case 's':
          newCropArea.height = Math.max(20, Math.min(actualSize.displayHeight - initialCropArea.y, initialCropArea.height + dy));
          break;
        case 'w':
          newCropArea.x = Math.max(0, Math.min(initialCropArea.x + initialCropArea.width - 20, initialCropArea.x + dx));
          newCropArea.width = initialCropArea.width - (newCropArea.x - initialCropArea.x);
          break;
        case 'e':
          newCropArea.width = Math.max(20, Math.min(actualSize.displayWidth - initialCropArea.x, initialCropArea.width + dx));
          break;
      }

      const originalCropArea = toOriginalCoords(newCropArea);
      onCropAreaChange(originalCropArea);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragHandle(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragHandle, dragStart, initialCropArea, actualSize, onCropAreaChange, toOriginalCoords, getCanvasCoordinates]);

  const getHandleAtPosition = useCallback((x: number, y: number): DragHandle => {
    const handleSize = 16;
    const halfSize = handleSize / 2;

    if (Math.abs(x - displayCropArea.x) < halfSize && Math.abs(y - displayCropArea.y) < halfSize) return 'nw';
    if (Math.abs(x - (displayCropArea.x + displayCropArea.width)) < halfSize && Math.abs(y - displayCropArea.y) < halfSize) return 'ne';
    if (Math.abs(x - displayCropArea.x) < halfSize && Math.abs(y - (displayCropArea.y + displayCropArea.height)) < halfSize) return 'sw';
    if (Math.abs(x - (displayCropArea.x + displayCropArea.width)) < halfSize && Math.abs(y - (displayCropArea.y + displayCropArea.height)) < halfSize) return 'se';

    if (Math.abs(x - (displayCropArea.x + displayCropArea.width / 2)) < halfSize && Math.abs(y - displayCropArea.y) < halfSize) return 'n';
    if (Math.abs(x - (displayCropArea.x + displayCropArea.width / 2)) < halfSize && Math.abs(y - (displayCropArea.y + displayCropArea.height)) < halfSize) return 's';
    if (Math.abs(x - displayCropArea.x) < halfSize && Math.abs(y - (displayCropArea.y + displayCropArea.height / 2)) < halfSize) return 'w';
    if (Math.abs(x - (displayCropArea.x + displayCropArea.width)) < halfSize && Math.abs(y - (displayCropArea.y + displayCropArea.height / 2)) < halfSize) return 'e';

    if (x >= displayCropArea.x && x <= displayCropArea.x + displayCropArea.width &&
        y >= displayCropArea.y && y <= displayCropArea.y + displayCropArea.height) {
      return 'move';
    }

    return null;
  }, [displayCropArea]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setIsDragging(true);
      setDragHandle(handle);
      setDragStart({ x, y });
      setInitialCropArea({ ...displayCropArea });
      
      e.preventDefault();
    }
  }, [displayCropArea, getHandleAtPosition, getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

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
  }, [getHandleAtPosition, getCanvasCoordinates, isDragging]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={actualSize.displayWidth}
        height={actualSize.displayHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="max-w-full h-auto"
        style={{ 
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          userSelect: 'none'
        }}
      />
    </div>
  );
} 