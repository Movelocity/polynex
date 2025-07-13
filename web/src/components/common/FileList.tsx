import React, { useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/x-ui/pagination';
import { File, Image as ImageIcon, Download, Trash2, RefreshCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { fileService } from '@/services';
import { PaginationInfo } from '@/services/api/FileApiService';

interface FileItem {
  unique_id: string;
  extension: string;
  original_name?: string;
  size: number;
  upload_time: string;
  url: string;
  thumbnail?: string; // 缩略图URL（如果是图片且存在缩略图）
}

interface FileListProps {
  files: FileItem[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onDelete: (uniqueId: string, extension: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onPageChange?: (page: number) => Promise<void>;
}

export function FileList({ 
  files, 
  loading = false, 
  pagination,
  onDelete, 
  onRefresh,
  onPageChange
}: FileListProps) {
  const [filePreview, setFilePreview] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string>('');  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });

  // 预览图片
  const previewImage = (fileUrl: string) => {
    setFilePreview(fileService.resolveFileUrl(fileUrl));
    setShowFilePreview(true);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // 处理缩放
  const handleZoom = (delta: number, event?: React.WheelEvent) => {
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel + delta));
    setZoomLevel(newZoom);
    
    // 如果是鼠标滚轮事件，以鼠标位置为中心缩放
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = event.clientX - rect.left - rect.width / 2;
      const centerY = event.clientY - rect.top - rect.height / 2;
      
      setPosition(prev => ({
        x: prev.x - centerX * (delta / zoomLevel),
        y: prev.y - centerY * (delta / zoomLevel)
      }));
    }
  };

  // 处理拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 重置查看器状态
  const resetViewer = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // 关闭预览
  const closePreview = () => {
    setShowFilePreview(false);
    resetViewer();
  };

  // 计算两点之间距离
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // 计算两点中心
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 单指拖拽
      if (zoomLevel > 1) {
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
      }
    } else if (e.touches.length === 2) {
      // 双指缩放
      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      // 单指拖拽
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && lastTouchDistance > 0) {
      // 双指缩放
      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      
      const scale = distance / lastTouchDistance;
      const newZoom = Math.max(0.1, Math.min(5, zoomLevel * scale));
      
      // 以触摸中心为基准缩放
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = center.x - rect.left - rect.width / 2;
      const centerY = center.y - rect.top - rect.height / 2;
      
      setZoomLevel(newZoom);
      setPosition(prev => ({
        x: prev.x - centerX * (scale - 1),
        y: prev.y - centerY * (scale - 1)
      }));
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  // 下载文件
  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = fileService.resolveFileUrl(fileUrl);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 删除文件
  const handleDelete = async (uniqueId: string, extension: string) => {
    setDeletingFile(uniqueId);
    try {
      await onDelete(uniqueId, extension);
    } finally {
      setDeletingFile('');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    return fileService.formatFileSize(bytes);
  };

  // 获取文件的缩略图URL
  const getThumbnailUrl = (file: FileItem) => {
    // 如果有缩略图字段且是图片，使用缩略图
    if (file.thumbnail && fileService.isImageFile(`${file.unique_id}${file.extension}`)) {
      return fileService.resolveFileUrl(file.thumbnail);
    }
    // 如果是图片但没有缩略图字段，尝试构建缩略图URL
    if (fileService.isImageFile(`${file.unique_id}${file.extension}`)) {
      return fileService.getThumbnailUrl(file.unique_id);
    }
    return null;
  };

  // 渲染分页
  const renderPagination = () => {
    if (!pagination || !onPageChange || pagination.total_pages <= 1) {
      return null;
    }

    const { current_page, total_pages } = pagination;
    const pages = [];
    
    // 计算显示的页码范围
    const startPage = Math.max(1, current_page - 2);
    const endPage = Math.min(total_pages, current_page + 2);

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          {/* 上一页 */}
          <PaginationItem>
            <PaginationPrevious 
              onClick={current_page > 1 ? () => onPageChange(current_page - 1) : undefined}
              className={current_page <= 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            />
          </PaginationItem>

          {/* 首页 */}
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink 
                  onClick={() => onPageChange(1)}
                  className="cursor-pointer"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {/* 页码 */}
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const pageNum = startPage + i;
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  isActive={pageNum === current_page}
                  onClick={() => onPageChange(pageNum)}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* 末页 */}
          {endPage < total_pages && (
            <>
              {endPage < total_pages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink 
                  onClick={() => onPageChange(total_pages)}
                  className="cursor-pointer"
                >
                  {total_pages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          {/* 下一页 */}
          <PaginationItem>
            <PaginationNext 
              onClick={current_page < total_pages ? () => onPageChange(current_page + 1) : undefined}
              className={current_page >= total_pages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (files.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无上传的文件</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '加载中...' : '刷新列表'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          {pagination ? (
            `第 ${pagination.current_page} 页，共 ${pagination.total_pages} 页，总计 ${pagination.total_items} 个文件`
          ) : (
            `您上传的文件列表 (${files.length} 个文件)`
          )}
        </div>
        <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '加载中...' : '刷新'}
        </Button>
      </div>

      <div>
        {files.map((file) => {
          const fileTypeInfo = fileService.getFileTypeInfo(`${file.unique_id}${file.extension}`);
          const thumbnailUrl = getThumbnailUrl(file);
          const isDeleting = deletingFile === file.unique_id;
          
          return (
            <div key={file.unique_id} className="flex items-center justify-between p-4 border-b border-border hover:bg-accent">
              <div className="flex items-center space-x-4">
                {/* 文件图标或缩略图 */}
                <div className="flex-shrink-0">
                  {fileTypeInfo.isImage && thumbnailUrl ? (
                    <div className="relative w-12 h-12 cursor-pointer group" onClick={() => previewImage(file.url)}>
                      <img 
                        src={thumbnailUrl}
                        alt={file.original_name || file.unique_id}
                        className="w-12 h-12 rounded-md object-cover border border-border bg-muted transition-all group-hover:opacity-80"
                        onError={(e) => {
                          // 如果缩略图加载失败，显示默认图标
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center"><svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-md transition-all flex items-center justify-center">
                        <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center ${
                        fileTypeInfo.isImage ? 'cursor-pointer group' : ''
                      }`}
                      onClick={fileTypeInfo.isImage ? () => previewImage(file.url) : undefined}
                    >
                      {fileTypeInfo.isImage ? (
                        <div className="relative">
                          <ImageIcon className="w-6 h-6 text-blue-500 group-hover:opacity-80 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-4 h-4 text-blue-500" />
                          </div>
                        </div>
                      ) : fileTypeInfo.isDocument ? (
                        <File className="w-6 h-6 text-green-500" />
                      ) : (
                        <File className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* 文件信息 */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {file.original_name || `${file.unique_id}${file.extension}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {new Date(file.upload_time).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  variant="outline"  
                  size="sm"
                  onClick={() => downloadFile(file.url, file.original_name || `${file.unique_id}${file.extension}`)}
                  title="下载文件"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(file.unique_id, file.extension)}
                  disabled={isDeleting}
                  title="删除文件"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分页 */}
      {renderPagination()}

      {/* Full Screen Image Viewer */}
      {showFilePreview && filePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center touch-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all touch-manipulation"
            title="关闭预览"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Zoom Controls - Hidden on mobile */}
          <div className="absolute top-4 left-4 z-10 flex-col gap-2 hidden md:flex">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              title="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={resetViewer}
              className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all text-xs"
              title="重置视图"
            >
              1:1
            </button>
          </div>

          {/* Zoom Level Indicator */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
            {Math.round(zoomLevel * 100)}%
          </div>

          {/* Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              handleZoom(delta, e);
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
              onMouseDown={handleMouseDown}
              onDoubleClick={() => {
                if (zoomLevel === 1) {
                  handleZoom(1);
                } else {
                  resetViewer();
                }
              }}
              draggable={false}
            />
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 z-10 text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">
            <div className="text-xs opacity-80 hidden md:block">
              滚轮缩放 • 拖拽移动 • 双击重置
            </div>
            <div className="text-xs opacity-80 block md:hidden">
              双指缩放 • 拖拽移动 • 双击重置
            </div>
          </div>
        </div>
      )}
    </>
  );
} 