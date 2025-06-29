import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { FileUploadArea } from '@/components/common/file/FileUploadArea';
import { FileList } from '@/components/common/FileList';
import { fileService } from '@/services';
import { toast } from '@/hooks/use-toast';

export function FileManage() {
  // File management state
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filePagination, setFilePagination] = useState({
    current_page: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 加载用户文件列表
  const loadUserFiles = async (page: number = 1, pageSize: number = 10) => {
    // 确保传递的是数字，防止对象传递
    const validPage = typeof page === 'number' ? page : (filePagination.current_page || 1);
    const validPageSize = typeof pageSize === 'number' ? pageSize : (filePagination.page_size || 10);
    
    setLoadingFiles(true);
    try {
      const response = await fileService.getUserFiles(validPage, validPageSize);
      setUserFiles(response.files);
      setFilePagination(response.pagination);
    } catch (err: any) {
      toast({
        title: "加载文件列表失败",
        description: "加载文件列表失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  // 组件加载时自动加载文件列表
  useEffect(() => {
    loadUserFiles();
  }, []);

  // 处理页面切换
  const handlePageChange = async (page: number) => {
    // 确保传递的是数字
    const validPage = typeof page === 'number' ? page : 1;
    await loadUserFiles(validPage, filePagination.page_size || 10);
  };

  // 删除文件
  const handleFileDelete = async (uniqueId: string, extension: string) => {
    try {
      const success = await fileService.deleteFile(uniqueId, extension);
      if (success) {
        // 先从当前列表中移除文件以提供即时反馈
        setUserFiles(prev => prev.filter(file => file.unique_id !== uniqueId));
        toast({
          title: "文件删除成功",
          description: "文件删除成功",
        });
        
        // 计算删除后是否需要调整页面
        const remainingFilesOnCurrentPage = userFiles.length - 1;
        let targetPage = filePagination.current_page;
        
        // 如果当前页没有文件了且不是第一页，跳转到上一页
        if (remainingFilesOnCurrentPage === 0 && filePagination.current_page > 1) {
          targetPage = filePagination.current_page - 1;
        }
        
        // 刷新文件列表以确保分页信息正确
        setTimeout(() => {
          loadUserFiles(targetPage, filePagination.page_size || 10);
        }, 500);
      } else {
        throw new Error('文件删除失败');
      }
    } catch (err: any) {
      toast({
        title: "文件删除失败",
        description: err.message || '文件删除失败',
        variant: "destructive",
      });
    }
  };

  // 文件上传处理
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let uploadedCount = 0;
    let hasErrors = false;
    
    setUploadingFile(true);
    
    for (const file of fileArray) {
      // 验证文件类型
      if (!fileService.isSupportedFileType(file)) {
        toast({
          title: "不支持的文件类型",
          description: `不支持的文件类型: ${file.name}`,
          variant: "destructive",
        });
        hasErrors = true;
        continue;
      }

      // 验证文件大小（50MB）
      if (!fileService.isValidFileSize(file, 50)) {
        toast({
          title: "文件过大",
          description: `文件过大: ${file.name}，最大支持50MB`,
          variant: "destructive",
        });
        hasErrors = true;
        continue;
      }
      
      try {
        const result = await fileService.uploadFile(file);
        
        if (result.file) {
          // 添加到文件列表
          setUserFiles(prev => [result.file, ...prev]);
          uploadedCount++;
        }
      } catch (err: any) {
        console.error('文件上传失败:', err);
        toast({
          title: "文件上传失败",
          description: `文件 ${file.name} 上传失败: ${err.message || '未知错误'}`,
          variant: "destructive",
        });
        hasErrors = true;
      }
    }
    
    setUploadingFile(false);
    setUploadProgress(0);
    
    // 显示上传结果
    if (uploadedCount > 0) {
      toast({
        title: "文件上传成功",
        description: `成功上传 ${uploadedCount} 个文件！`,
      });
      // 自动刷新文件列表以确保数据同步，回到第一页显示新上传的文件
      setTimeout(() => {
        loadUserFiles(1, filePagination.page_size || 10);
      }, 1000);
    }
    
    if (!hasErrors && uploadedCount === 0) {
      toast({
        title: "没有文件被上传",
        description: "具体原因请查看控制台",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto pt-6">
      <Card>
        <CardHeader>
          <CardTitle>文件管理</CardTitle>
          <CardDescription>上传、查看、下载和删除您的文件</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadArea
            onFileUpload={handleFileUpload}
            uploading={uploadingFile}
            uploadProgress={uploadProgress}
          />

          <FileList
            files={userFiles}
            loading={loadingFiles}
            pagination={filePagination}
            onDelete={handleFileDelete}
            onRefresh={loadUserFiles}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}