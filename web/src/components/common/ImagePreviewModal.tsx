import React from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImagePreviewModalProps {
  filePreview: string;
  showFilePreview: boolean;
  zoomLevel: number;
  isDragging: boolean;
  position: { x: number; y: number };
  onZoom: (delta: number, event?: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onResetViewer: () => void;
  onClosePreview: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function ImagePreviewModal({
  filePreview,
  showFilePreview,
  zoomLevel,
  isDragging,
  position,
  onZoom,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onResetViewer,
  onClosePreview,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}: ImagePreviewModalProps) {
  if (!showFilePreview || !filePreview) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center touch-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onClosePreview}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all touch-manipulation"
        title="关闭预览"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute top-4 left-4 z-10 flex-col gap-2 hidden md:flex">
        <button
          onClick={() => onZoom(0.2)}
          className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
          title="放大"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => onZoom(-0.2)}
          className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={onResetViewer}
          className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all text-xs"
          title="重置视图"
        >
          1:1
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
        {Math.round(zoomLevel * 100)}%
      </div>

      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          onZoom(delta, e);
        }}
      >
        <img 
          src={filePreview} 
          alt="文件预览" 
          className={`max-w-none max-h-none object-contain select-none ${
            zoomLevel > 1 ? 'cursor-move' : 'cursor-zoom-in'
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          onMouseDown={onMouseDown}
          onDoubleClick={() => {
            if (zoomLevel === 1) {
              onZoom(1);
            } else {
              onResetViewer();
            }
          }}
          draggable={false}
        />
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">
        <div className="text-xs opacity-80 hidden md:block">
          滚轮缩放 • 拖拽移动 • 双击重置
        </div>
        <div className="text-xs opacity-80 block md:hidden">
          双指缩放 • 拖拽移动 • 双击重置
        </div>
      </div>
    </div>
  );
}