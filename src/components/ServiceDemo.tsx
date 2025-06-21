import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Badge } from '@/components/x-ui/badge';
import { userService, blogService, categoryService, fileService } from '@/services';
import { User, Blog, Category } from '@/types';
import { FileUpload } from '@/components/common/file/FileUpload';
import { FileInfo } from '@/services/api/FileApiService';

/**
 * API服务演示组件
 * 展示如何使用API服务进行数据操作
 */
export const ServiceDemo: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 并行加载所有数据
      const [usersData, blogsData, categoriesData] = await Promise.all([
        userService.getUsers(),
        blogService.getPublishedBlogs(),
        categoryService.getCategories()
      ]);
      
      // 尝试加载文件列表（需要认证）
      try {
        const filesData = await fileService.getUserFiles();
        setFiles(filesData);
      } catch (fileError) {
        console.log('无法加载文件列表，可能未登录');
        setFiles([]);
      }
      
      setUsers(usersData);
      setBlogs(blogsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试添加博客
  const testAddBlog = async () => {
    if (users.length === 0) {
      setError('请先加载用户数据');
      return;
    }

    const newBlog: Blog = {
      id: `demo-${Date.now()}`,
      title: '测试博客文章',
      content: '这是一篇测试博客文章的内容...',
      summary: '测试博客文章摘要',
      category: '技术',
      tags: ['测试', '演示'],
      authorId: users[0].id,
      authorName: users[0].username,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      status: 'published',
      views: 0
    };

    try {
      setLoading(true);
      await blogService.addBlog(newBlog);
      await loadData(); // 重新加载数据
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加博客失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试搜索功能
  const testSearch = async () => {
    try {
      setLoading(true);
      const results = await blogService.searchBlogs('测试');
      console.log('搜索结果:', results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试用户登录
  const testLogin = async () => {
    try {
      setLoading(true);
      const result = await userService.login('demo1@example.com', 'demo123');
      if (result.success) {
        console.log('登录成功:', result.user);
        setError(null);
        // 重新加载数据以更新用户信息
        await loadData();
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试头像上传
  const testAvatarUpload = async () => {
    // 创建一个文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        setLoading(true);
        const result = await userService.uploadAvatar(file);
        if (result.success) {
          console.log('头像上传成功:', result.user);
          setError(null);
          // 重新加载数据以更新用户信息
          await loadData();
        } else {
          setError(result.message || '头像上传失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '头像上传失败');
      } finally {
        setLoading(false);
      }
    };
    fileInput.click();
  };

  // 文件上传完成回调
  const handleFileUploadComplete = (fileInfo: FileInfo) => {
    setFiles(prev => [fileInfo, ...prev]);
    setError(null);
  };

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API服务演示
            <Badge variant="default">
              API模式
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadData} disabled={loading}>
              重新加载数据
            </Button>
            <Button onClick={testAddBlog} disabled={loading}>
              测试添加博客
            </Button>
            <Button onClick={testSearch} disabled={loading}>
              测试搜索功能
            </Button>
            <Button onClick={testLogin} disabled={loading}>
              测试用户登录
            </Button>
            <Button onClick={testAvatarUpload} disabled={loading}>
              测试头像上传
            </Button>
          </div>

          {/* 错误信息 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 加载状态 */}
          {loading && <div className="text-center py-4">加载中...</div>}
        </CardContent>
      </Card>

      {/* 文件上传演示 */}
      <Card>
        <CardHeader>
          <CardTitle>文件上传演示</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload 
            onUploadComplete={handleFileUploadComplete}
            showPreview={false}
          />
        </CardContent>
      </Card>

      {/* 数据展示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 用户数据 */}
        <Card>
          <CardHeader>
            <CardTitle>用户数据 ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.slice(0, 3).map(user => (
                <div key={user.id} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {user.avatar && (
                      <img 
                        src={fileService.resolveFileUrl(user.avatar)} 
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          // 如果头像加载失败，隐藏图片
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>
                </div>
              ))}
              {users.length > 3 && (
                <div className="text-sm text-gray-500">
                  还有 {users.length - 3} 个用户...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 博客数据 */}
        <Card>
          <CardHeader>
            <CardTitle>博客数据 ({blogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blogs.slice(0, 3).map(blog => (
                <div key={blog.id} className="p-2 bg-gray-50 rounded">
                  <div className="font-medium text-sm">{blog.title}</div>
                  <div className="text-xs text-gray-600">
                    {blog.category} • {blog.views} 浏览
                  </div>
                </div>
              ))}
              {blogs.length > 3 && (
                <div className="text-sm text-gray-500">
                  还有 {blogs.length - 3} 篇博客...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 分类数据 */}
        <Card>
          <CardHeader>
            <CardTitle>分类数据 ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category.id} className="p-2 bg-gray-50 rounded">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-gray-600">
                    {category.description} ({category.count})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 文件数据 */}
        <Card>
          <CardHeader>
            <CardTitle>文件数据 ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.slice(0, 3).map(file => {
                const typeInfo = fileService.getFileTypeInfo(file.original_name || '');
                return (
                  <div key={file.unique_id} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span>{typeInfo.icon}</span>
                      {file.original_name || `${file.unique_id}${file.extension}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {fileService.formatFileSize(file.size)}
                    </div>
                  </div>
                );
              })}
              {files.length > 3 && (
                <div className="text-sm text-gray-500">
                  还有 {files.length - 3} 个文件...
                </div>
              )}
              {files.length === 0 && (
                <div className="text-sm text-gray-500">
                  暂无文件，请先上传
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>API配置:</strong> 在环境变量中设置 VITE_API_BASE_URL
            </p>
            <p>
              <strong>代码使用:</strong> 
              <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                import {`{ userService, blogService, categoryService, fileService }`} from '@/services';
              </code>
            </p>
            <p>
              <strong>认证:</strong> 使用 JWT Token 进行API认证
            </p>
            <p>
              <strong>错误处理:</strong> 所有API调用都包含完整的错误处理
            </p>
            <p>
              <strong>文件上传:</strong> 支持拖拽上传，自动生成唯一URL，支持图片预览
            </p>
            <p>
              <strong>文件格式:</strong> 支持图片(jpg/png/gif等)、文档(pdf/doc/txt等)，最大50MB
            </p>
            <p>
              <strong>头像上传:</strong> 专门的头像上传接口，自动更新用户信息，限制5MB
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 