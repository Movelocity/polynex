import React, { useRef, useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { Upload } from 'lucide-react';
import { allowedExtensions } from '@/services/api/FileApiService';

interface FileUploadAreaProps {
  onFileUpload: (files: FileList | File[]) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
  maxFileSizeMB?: number;
  supportedTypes?: string[];
  multiple?: boolean;
}

export function FileUploadArea({ 
  onFileUpload, 
  uploading = false, 
  uploadProgress = 0,
  maxFileSizeMB = 50,
  supportedTypes = allowedExtensions,
  multiple = true
}: FileUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileUpload(files);
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  // 拖拽处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileUpload(files);
    }
  };

  return (
    <div className="mb-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            {uploading ? (
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Upload className="w-12 h-12 text-slate-400" />
            )}
          </div>
          
          <div>
            
            {uploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-4"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? '上传中...' : '选择文件'}
            </Button>
            
            <div className="text-xs text-slate-500 space-y-1">
              <p>支持的文件类型：图片、PDF、Word、文本文档</p>
              <p>单个文件最大{maxFileSizeMB}MB</p>
            </div>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={supportedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
} 