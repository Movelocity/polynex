import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Progress } from '@/components/x-ui/progress';
import { fileService } from '@/services';
import { FileInfo } from '@/services/api/FileApiService';

interface FileUploadProps {
  onUploadComplete?: (fileInfo: FileInfo) => void;
  accept?: string;
  maxSizeMB?: number;
  showPreview?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  accept = 'image/*,.pdf,.doc,.docx,.txt,.md,.rtf',
  maxSizeMB = 50,
  showPreview = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // 目前只支持单文件上传
    setError(null);

    // 检查文件类型
    if (!fileService.isSupportedFileType(file)) {
      setError('不支持的文件类型');
      return;
    }

    // 检查文件大小
    if (!fileService.isValidFileSize(file, maxSizeMB)) {
      setError(`文件大小不能超过 ${maxSizeMB}MB`);
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fileService.uploadFile(file);
      
      clearInterval(progressInterval);
      setProgress(100);

      // 添加到已上传文件列表
      // setUploadedFiles(prev => [response.file, ...prev]);
      
      // 调用回调函数
      // if (onUploadComplete) {
      //   onUploadComplete(response);
      // }

      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [maxSizeMB, onUploadComplete]);

  // 处理拖拽事件
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = async (fileInfo: FileInfo) => {
    try {
      const extension = fileInfo.extension.startsWith('.') ? fileInfo.extension.slice(1) : fileInfo.extension;
      await fileService.deleteFile(fileInfo.unique_id, extension);
      setUploadedFiles(prev => prev.filter(f => f.unique_id !== fileInfo.unique_id));
    } catch (error) {
      setError('删除文件失败');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>文件上传</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/10'
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="text-lg font-medium">上传中...</div>
                <Progress value={progress} className="w-full max-w-md mx-auto" />
                <div className="text-sm text-gray-500">{progress}%</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">📁</div>
                <div>
                  <div className="text-lg font-medium mb-2">
                    拖拽文件到此处或点击选择文件
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    支持图片、PDF、Word文档等格式，最大 {maxSizeMB}MB
                  </div>
                  <Button onClick={handleButtonClick} variant="outline">
                    选择文件
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 已上传文件列表 */}
      {showPreview && uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>已上传文件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => {
                const typeInfo = fileService.getFileTypeInfo(file.original_name || '');
                return (
                  <div
                    key={file.unique_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <div className="font-medium">
                          {file.original_name || `${file.unique_id}${file.extension}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {fileService.formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {typeInfo.isImage && (
                        <img
                          src={fileService.resolveFileUrl(file.url)}
                          alt={file.original_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(fileService.resolveFileUrl(file.url), '_blank')}
                      >
                        查看
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile(file)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 