import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Badge } from '@/components/x-ui/badge';
import { userService, blogService, categoryService, fileService } from '@/services';
import { User, Blog, Category } from '@/types';
import { FileUpload } from '@/components/common/file/FileUpload';
import { FileInfo } from '@/services/api/FileApiService';
import { toast } from '@/hooks/use-toast';

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
        setFiles(filesData.files);
      } catch (fileError) {
        console.log('无法加载文件列表，可能未登录');
        setFiles([]);
      }
      
      setUsers(usersData);
      setBlogs(blogsData);
      setCategories(categoriesData);
      
      // 显示成功toast
      toast.success({
        title: "数据加载成功",
        description: `成功加载 ${usersData.length} 个用户，${blogsData.length} 篇博客，${categoriesData.length} 个分类`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      // 显示错误toast
      toast.error({
        title: "数据加载失败",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // 测试添加博客
  const testAddBlog = async () => {
    if (users.length === 0) {
      const errorMsg = '请先加载用户数据';
      setError(errorMsg);
      toast.warning({
        title: "操作提示",
        description: errorMsg
      });
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
      toast.success({
        title: "博客添加成功",
        description: `博客"${newBlog.title}"已成功添加`
      });
      await loadData(); // 重新加载数据
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加博客失败';
      setError(errorMessage);
      toast.error({
        title: "博客添加失败",
        description: errorMessage
      });
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
      toast.info({
        title: "搜索完成",
        description: `找到 ${results.length} 条包含"测试"的博客记录，请查看控制台`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '搜索失败';
      setError(errorMessage);
      toast.error({
        title: "搜索失败",
        description: errorMessage
      });
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
        toast.success({
          title: "登录成功",
          description: `欢迎回来，${result.user?.username}!`
        });
        // 重新加载数据以更新用户信息
        await loadData();
      } else {
        const errorMsg = result.message || '登录失败';
        setError(errorMsg);
        toast.error({
          title: "登录失败",
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      setError(errorMessage);
      toast.error({
        title: "登录失败",
        description: errorMessage
      });
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
        const result = await fileService.uploadAvatar(file);
        if (result.user) {
          console.log('头像上传成功:', result.user);
          setError(null);
          toast.success({
            title: "头像上传成功",
            description: `头像已更新为 ${file.name}`
          });
          // 重新加载数据以更新用户信息
          await loadData();
        } else {
          const errorMsg = result.message || '头像上传失败';
          setError(errorMsg);
          toast.error({
            title: "头像上传失败",
            description: errorMsg
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '头像上传失败';
        setError(errorMessage);
        toast.error({
          title: "头像上传失败",
          description: errorMessage
        });
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
    // 显示成功toast
    toast.success({
      title: "文件上传成功",
      description: `文件 ${fileInfo.original_name} 已成功上传`
    });
  };

  // Toast演示功能
  const showInfoToast = () => {
    toast.info({
      title: "信息提示",
      description: "这是一个信息提示的toast消息"
    });
  };

  const showSuccessToast = () => {
    toast.success({
      title: "操作成功",
      description: "您的操作已成功完成"
    });
  };

  const showWarningToast = () => {
    toast.warning({
      title: "警告提示",
      description: "请注意这个重要的警告信息"
    });
  };

  const showErrorToast = () => {
    toast.error({
      title: "错误提示",
      description: "操作失败，请检查后重试"
    });
  };

  const showDefaultToast = () => {
    toast({
      title: "默认提示",
      description: "这是一个默认样式的toast消息"
    });
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
          
          {/* Toast演示按钮 */}
          <div className="pt-4 border-t">
            <h4 className="text-lg font-medium mb-3">Toast消息演示</h4>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={showDefaultToast} variant="outline">
                默认Toast
              </Button>
              <Button onClick={showInfoToast} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                信息Toast
              </Button>
              <Button onClick={showSuccessToast} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                成功Toast
              </Button>
              <Button onClick={showWarningToast} variant="outline" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                警告Toast
              </Button>
              <Button onClick={showErrorToast} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                错误Toast
              </Button>
            </div>
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
              <strong>Toast消息:</strong> 
              <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                import {`{ toast }`} from '@/hooks/use-toast'; toast.success({`{title, description}`});
              </code>
            </p>
            <p>
              <strong>认证:</strong> 使用 JWT Token 进行API认证
            </p>
            <p>
              <strong>错误处理:</strong> 所有API调用都包含完整的错误处理和Toast提示
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
            <p>
              <strong>Toast类型:</strong> 支持 info(蓝色)、success(绿色)、warning(黄色)、error(红色)、default 五种类型，带有对应图标
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 