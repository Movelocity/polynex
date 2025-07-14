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
import { File, Image as ImageIcon, Download, Trash2, RefreshCw, ZoomIn } from 'lucide-react';
import { fileService } from '@/services';
import { PaginationInfo } from '@/services/api/FileApiService';
import { useImagePreview } from '@/hooks/useImagePreview';
import { ImagePreviewModal } from '@/components/common/ImagePreviewModal';

interface FileItem {
  unique_id: string;
  extension: string;
  original_name?: string;
  size: number;
  upload_time: string;
  url: string;
  thumbnail?: string;
}

interface FileGridProps {
  files: FileItem[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onDelete: (uniqueId: string, extension: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onPageChange?: (page: number) => Promise<void>;
}

export function FileGrid({ 
  files, 
  loading = false, 
  pagination,
  onDelete, 
  onRefresh,
  onPageChange
}: FileGridProps) {
  const [deletingFile, setDeletingFile] = useState<string>('');  
  const imagePreview = useImagePreview();


  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = fileService.resolveFileUrl(fileUrl);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (uniqueId: string, extension: string) => {
    setDeletingFile(uniqueId);
    try {
      await onDelete(uniqueId, extension);
    } finally {
      setDeletingFile('');
    }
  };

  const formatFileSize = (bytes: number) => {
    return fileService.formatFileSize(bytes);
  };

  const getThumbnailUrl = (file: FileItem) => {
    if (file.thumbnail && fileService.isImageFile(`${file.unique_id}${file.extension}`)) {
      return fileService.resolveFileUrl(file.thumbnail);
    }
    if (fileService.isImageFile(`${file.unique_id}${file.extension}`)) {
      return fileService.getThumbnailUrl(file.unique_id);
    }
    return null;
  };

  const renderPagination = () => {
    if (!pagination || !onPageChange || pagination.total_pages <= 1) {
      return null;
    }

    const { current_page, total_pages } = pagination;
    const startPage = Math.max(1, current_page - 2);
    const endPage = Math.min(total_pages, current_page + 2);

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={current_page > 1 ? () => onPageChange(current_page - 1) : undefined}
              className={current_page <= 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            />
          </PaginationItem>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => {
          const fileTypeInfo = fileService.getFileTypeInfo(`${file.unique_id}${file.extension}`);
          const thumbnailUrl = getThumbnailUrl(file);
          const isDeleting = deletingFile === file.unique_id;
          
          return (
            <div key={file.unique_id} className="relative group border border-border rounded-lg overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-square relative">
                {fileTypeInfo.isImage && thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl}
                    alt={file.original_name || file.unique_id}
                    className="w-full h-full object-cover transition-transform"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <div 
                    className={`w-full h-full flex items-center justify-center bg-muted`}
                  >
                    {fileTypeInfo.isImage ? (
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    ) : fileTypeInfo.isDocument ? (
                      <File className="w-8 h-8 text-green-500" />
                    ) : (
                      <File className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                
                {fileTypeInfo.isImage && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center cursor-pointer"
                    onClick={() => imagePreview.previewImage(file.url)}
                  >
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              <div className="p-1">
                <div className="px-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.original_name || `${file.unique_id}${file.extension}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {new Date(file.upload_time).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"  
                    size="sm"
                    onClick={() => downloadFile(file.url, file.original_name || `${file.unique_id}${file.extension}`)}
                    title="下载文件"
                    className=""
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(file.unique_id, file.extension)}
                    disabled={isDeleting}
                    title="删除文件"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className={`w-3 h-3 ${isDeleting ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {renderPagination()}

      <ImagePreviewModal
        filePreview={imagePreview.filePreview}
        showFilePreview={imagePreview.showFilePreview}
        zoomLevel={imagePreview.zoomLevel}
        isDragging={imagePreview.isDragging}
        position={imagePreview.position}
        onZoom={imagePreview.handleZoom}
        onMouseDown={imagePreview.handleMouseDown}
        onMouseMove={imagePreview.handleMouseMove}
        onMouseUp={imagePreview.handleMouseUp}
        onResetViewer={imagePreview.resetViewer}
        onClosePreview={imagePreview.closePreview}
        onTouchStart={imagePreview.handleTouchStart}
        onTouchMove={imagePreview.handleTouchMove}
        onTouchEnd={imagePreview.handleTouchEnd}
        onUpdateContainerSize={imagePreview.updateContainerSize}
      />
    </>
  );
}