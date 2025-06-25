import React, { useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/x-ui/dialog';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/x-ui/pagination';
import { File, Image as ImageIcon, Eye, Download, Trash2, RefreshCw } from 'lucide-react';
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

  // 预览图片
  const previewImage = (fileUrl: string) => {
    setFilePreview(fileService.resolveFileUrl(fileUrl));
    setShowFilePreview(true);
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

      <div className="space-y-2">
        {files.map((file) => {
          const fileTypeInfo = fileService.getFileTypeInfo(`${file.unique_id}${file.extension}`);
          const thumbnailUrl = getThumbnailUrl(file);
          const isDeleting = deletingFile === file.unique_id;
          
          return (
            <div key={file.unique_id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center space-x-4">
                {/* 文件图标或缩略图 */}
                <div className="flex-shrink-0">
                  {fileTypeInfo.isImage && thumbnailUrl ? (
                    <div className="relative w-12 h-12">
                      <img 
                        src={thumbnailUrl}
                        alt={file.original_name || file.unique_id}
                        className="w-12 h-12 rounded-md object-cover border border-border bg-muted"
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
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                      {fileTypeInfo.isImage ? (
                        <ImageIcon className="w-6 h-6 text-blue-500" />
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
                  {file.original_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {file.unique_id}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {fileTypeInfo.isImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewImage(file.url)}
                    title="预览图片"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
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

      {/* File Preview Dialog */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {filePreview && (
            <div className="flex justify-center items-center max-h-[70vh] overflow-hidden">
              <img 
                src={filePreview} 
                alt="文件预览" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 