import React, { useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/x-ui/dialog';
import { File, Image as ImageIcon, Eye, Download, Trash2 } from 'lucide-react';
import { fileService } from '@/services';

interface FileItem {
  unique_id: string;
  extension: string;
  original_name?: string;
  size: number;
  upload_time: string;
  url: string;
}

interface FileListProps {
  files: FileItem[];
  loading?: boolean;
  onDelete: (uniqueId: string, extension: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function FileList({ files, loading = false, onDelete, onRefresh }: FileListProps) {
  const [filePreview, setFilePreview] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState(false);

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

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    return fileService.formatFileSize(bytes);
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无上传的文件</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh} disabled={loading}>
          {loading ? '加载中...' : '加载文件列表'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-500">
          您上传的文件列表
        </div>
        <Button onClick={onRefresh} disabled={loading}>
          {loading ? '加载中...' : '刷新列表'}
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file) => {
          const fileTypeInfo = fileService.getFileTypeInfo(`${file.unique_id}${file.extension}`);
          return (
            <div key={file.unique_id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {fileTypeInfo.isImage ? (
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                ) : fileTypeInfo.isDocument ? (
                  <File className="w-5 h-5 text-green-500" />
                ) : (
                  <File className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {file.original_name || `${file.unique_id}${file.extension}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)} • {new Date(file.upload_time).toLocaleString()}
                  </p>
                  {file.original_name && (
                    <p className="text-xs text-slate-400">
                      ID: {file.unique_id}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {fileTypeInfo.isImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewImage(file.url)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(file.url, file.original_name || `${file.unique_id}${file.extension}`)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(file.unique_id, file.extension)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* File Preview Dialog */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {filePreview && (
            <div className="flex justify-center">
              <img 
                src={filePreview} 
                alt="文件预览" 
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 