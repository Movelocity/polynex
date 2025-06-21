import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperCanvasProps {
  imageUrl: string;
  cropArea: CropArea;
  onCropAreaChange: (area: CropArea) => void;
  containerWidth: number;
  containerHeight: number;
  maxContainerWidth?: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function ImageCropperCanvas({
  imageUrl,
  cropArea,
  onCropAreaChange,
  containerWidth,
  containerHeight,
  maxContainerWidth = 800
}: ImageCropperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCropArea, setInitialCropArea] = useState<CropArea>(cropArea);

  const getActualDisplaySize = useCallback(() => {
    let displayWidth = containerWidth;
    let displayHeight = containerHeight;
    
    if (displayWidth > maxContainerWidth) {
      const scale = maxContainerWidth / displayWidth;
      displayWidth = maxContainerWidth;
      displayHeight = displayHeight * scale;
    }
    
    return { displayWidth, displayHeight };
  }, [containerWidth, containerHeight, maxContainerWidth]);

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

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const { scaleX, scaleY } = getCanvasScale();
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    return { x, y };
  }, [getCanvasScale]);

  const displayCropArea = toDisplayCoords(cropArea);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, actualSize.displayWidth, actualSize.displayHeight);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.clearRect(displayCropArea.x, displayCropArea.y, displayCropArea.width, displayCropArea.height);

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

      ctx.save();
      ctx.beginPath();
      ctx.rect(displayCropArea.x, displayCropArea.y, displayCropArea.width, displayCropArea.height);
      ctx.clip();
      ctx.drawImage(img, 0, 0, actualSize.displayWidth, actualSize.displayHeight);
      ctx.restore();
    };
  }, [imageUrl, displayCropArea, actualSize]);

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
    const { x, y } = getCanvasCoordinates(e);

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setIsDragging(true);
      setDragHandle(handle);
      setDragStart({ x, y });
      setInitialCropArea({ ...displayCropArea });
    }
  }, [displayCropArea, getHandleAtPosition, getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e);

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

    if (isDragging && dragHandle) {
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
    }
  }, [isDragging, dragHandle, dragStart, initialCropArea, actualSize, getHandleAtPosition, onCropAreaChange, toOriginalCoords, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragHandle(null);
    }
  }, [isDragging]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={actualSize.displayWidth}
        height={actualSize.displayHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="border border-slate-200 rounded-lg max-w-full h-auto"
        style={{ 
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
} 