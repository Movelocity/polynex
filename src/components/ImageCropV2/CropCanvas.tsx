import { useState, useCallback, useEffect, MouseEvent } from 'react';
import { CropRect } from './useAdvancedImageCrop';

interface CropCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  cropWindow: CropRect;
  onCropWindowChange: (newCropWindow: CropRect) => void;
  aspectRatio?: number;
}

interface DragState {
  active: boolean;
  type: 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
}

export function CropCanvas({
  containerRef,
  cropWindow,
  onCropWindowChange,
  aspectRatio
}: CropCanvasProps) {
  const [dragState, setDragState] = useState<DragState>({
    active: false,
    type: null,
    startX: 0,
    startY: 0,
    startWidth: cropWindow.width,
    startHeight: cropWindow.height,
    startLeft: cropWindow.x,
    startTop: cropWindow.y
  });

  // 处理鼠标按下事件
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>, type: DragState['type']) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      active: true,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: cropWindow.width,
      startHeight: cropWindow.height,
      startLeft: cropWindow.x,
      startTop: cropWindow.y
    });
  }, [cropWindow]);

  // 处理鼠标移动事件
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!dragState.active || !containerRef.current) return;

    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    let newWidth = dragState.startWidth;
    let newHeight = dragState.startHeight;
    let newX = dragState.startLeft;
    let newY = dragState.startTop;

    const minWidth = 40;
    const minHeight = 40;
    const maxWidth = containerRect.width * 2;
    const maxHeight = containerRect.height * 2;

    // 根据拖拽类型处理
    switch (dragState.type) {
      case 'move': {
        const minVisibleSize = 40;
        newX = Math.max(-newWidth + minVisibleSize, Math.min(containerRect.width - minVisibleSize, dragState.startLeft + deltaX));
        newY = Math.max(-newHeight + minVisibleSize, Math.min(containerRect.height - minVisibleSize, dragState.startTop + deltaY));
        break;
      }
      
      case 'e': { // 右边缘
        newWidth = Math.max(minWidth, Math.min(maxWidth, dragState.startWidth + deltaX));
        if (aspectRatio) {
          newHeight = newWidth / aspectRatio;
          newY = dragState.startTop - (newHeight - dragState.startHeight) / 2;
        }
        break;
      }
      
      case 'w': { // 左边缘
        const maxLeftDrag = dragState.startLeft + dragState.startWidth - minWidth;
        const leftDelta = Math.max(-dragState.startLeft - maxWidth, Math.min(maxLeftDrag, deltaX));
        newWidth = dragState.startWidth - leftDelta;
        newX = dragState.startLeft + leftDelta;
        
        if (aspectRatio) {
          newHeight = newWidth / aspectRatio;
          newY = dragState.startTop - (newHeight - dragState.startHeight) / 2;
        }
        break;
      }
      
      case 'n': { // 上边缘
        const maxTopDrag = dragState.startTop + dragState.startHeight - minHeight;
        const topDelta = Math.max(-dragState.startTop - maxHeight, Math.min(maxTopDrag, deltaY));
        newHeight = dragState.startHeight - topDelta;
        newY = dragState.startTop + topDelta;
        
        if (aspectRatio) {
          newWidth = newHeight * aspectRatio;
          newX = dragState.startLeft - (newWidth - dragState.startWidth) / 2;
        }
        break;
      }
      
      case 's': { // 下边缘
        newHeight = Math.max(minHeight, Math.min(maxHeight, dragState.startHeight + deltaY));
        if (aspectRatio) {
          newWidth = newHeight * aspectRatio;
          newX = dragState.startLeft - (newWidth - dragState.startWidth) / 2;
        }
        break;
      }
      
      case 'ne': { // 右上角
        newWidth = Math.max(minWidth, Math.min(maxWidth, dragState.startWidth + deltaX));
        const neTopDelta = Math.max(-dragState.startTop - maxHeight, Math.min(dragState.startTop + dragState.startHeight - minHeight, deltaY));
        newHeight = dragState.startHeight - neTopDelta;
        newY = dragState.startTop + neTopDelta;
        
        if (aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
            newY = dragState.startTop - (newHeight - dragState.startHeight);
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        break;
      }
      
      case 'nw': { // 左上角
        const nwLeftDelta = Math.max(-dragState.startLeft - maxWidth, Math.min(dragState.startLeft + dragState.startWidth - minWidth, deltaX));
        newWidth = dragState.startWidth - nwLeftDelta;
        newX = dragState.startLeft + nwLeftDelta;
        
        const nwTopDelta = Math.max(-dragState.startTop - maxHeight, Math.min(dragState.startTop + dragState.startHeight - minHeight, deltaY));
        newHeight = dragState.startHeight - nwTopDelta;
        newY = dragState.startTop + nwTopDelta;
        
        if (aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
            newY = dragState.startTop - (newHeight - dragState.startHeight);
          } else {
            newWidth = newHeight * aspectRatio;
            newX = dragState.startLeft - (newWidth - dragState.startWidth);
          }
        }
        break;
      }
      
      case 'se': { // 右下角
        newWidth = Math.max(minWidth, Math.min(maxWidth, dragState.startWidth + deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, dragState.startHeight + deltaY));
        
        if (aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        break;
      }
      
      case 'sw': { // 左下角
        const swLeftDelta = Math.max(-dragState.startLeft - maxWidth, Math.min(dragState.startLeft + dragState.startWidth - minWidth, deltaX));
        newWidth = dragState.startWidth - swLeftDelta;
        newX = dragState.startLeft + swLeftDelta;
        newHeight = Math.max(minHeight, Math.min(maxHeight, dragState.startHeight + deltaY));
        
        if (aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
            newX = dragState.startLeft - (newWidth - dragState.startWidth);
          }
        }
        break;
      }
    }

    // 确保裁剪框至少有一部分可见
    const minVisibleSize = 40;
    newX = Math.max(-newWidth + minVisibleSize, Math.min(containerRect.width - minVisibleSize, newX));
    newY = Math.max(-newHeight + minVisibleSize, Math.min(containerRect.height - minVisibleSize, newY));

    // 更新裁剪窗口
    onCropWindowChange({
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY
    });
  }, [dragState, aspectRatio, containerRef, onCropWindowChange]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, active: false }));
  }, []);

  // 添加和移除全局事件监听器
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 获取光标样式
  const getCursorStyle = (type: DragState['type']) => {
    switch (type) {
      case 'n': 
      case 's': return 'ns-resize';
      case 'e': 
      case 'w': return 'ew-resize';
      case 'ne': 
      case 'sw': return 'nesw-resize';
      case 'nw': 
      case 'se': return 'nwse-resize';
      case 'move': return 'move';
      default: return 'default';
    }
  };

  // 手柄尺寸
  const handleSize = 12;
  const cornerHandleSize = 16;

  return (
    <div 
      style={{
        position: 'absolute',
        left: `${cropWindow.x}px`,
        top: `${cropWindow.y}px`,
        width: `${cropWindow.width}px`,
        height: `${cropWindow.height}px`,
        border: '3px solid #3b82f6',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.2)',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        cursor: dragState.active ? getCursorStyle(dragState.type) : 'move',
        willChange: 'transform, width, height',
        transition: dragState.active ? 'none' : 'all 0.1s ease-out',
        zIndex: 10,
        pointerEvents: 'auto'
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      
      {/* 边缘调整手柄 */}
      <div 
        style={{
          position: 'absolute',
          top: `-${handleSize/2}px`,
          left: '12px',
          right: '12px',
          height: `${handleSize}px`,
          cursor: 'ns-resize',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          zIndex: 11
        }}
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      
      <div 
        style={{
          position: 'absolute',
          right: `-${handleSize/2}px`,
          top: '12px',
          bottom: '12px',
          width: `${handleSize}px`,
          cursor: 'ew-resize',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          zIndex: 11
        }}
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
      
      <div 
        style={{
          position: 'absolute',
          bottom: `-${handleSize/2}px`,
          left: '12px',
          right: '12px',
          height: `${handleSize}px`,
          cursor: 'ns-resize',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          zIndex: 11
        }}
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      
      <div 
        style={{
          position: 'absolute',
          left: `-${handleSize/2}px`,
          top: '12px',
          bottom: '12px',
          width: `${handleSize}px`,
          cursor: 'ew-resize',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          zIndex: 11
        }}
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      
      {/* 角落调整手柄 - 使用不同的设计 */}
      <div 
        style={{
          position: 'absolute',
          top: `-${cornerHandleSize/2}px`,
          left: `-${cornerHandleSize/2}px`,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
          cursor: 'nwse-resize',
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 12,
          transition: 'all 0.1s ease-out'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      
      <div 
        style={{
          position: 'absolute',
          top: `-${cornerHandleSize/2}px`,
          right: `-${cornerHandleSize/2}px`,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
          cursor: 'nesw-resize',
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 12,
          transition: 'all 0.1s ease-out'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      
      <div 
        style={{
          position: 'absolute',
          bottom: `-${cornerHandleSize/2}px`,
          right: `-${cornerHandleSize/2}px`,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
          cursor: 'nwse-resize',
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 12,
          transition: 'all 0.1s ease-out'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      
      <div 
        style={{
          position: 'absolute',
          bottom: `-${cornerHandleSize/2}px`,
          left: `-${cornerHandleSize/2}px`,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
          cursor: 'nesw-resize',
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 12,
          transition: 'all 0.1s ease-out'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />

    </div>
  );
} 