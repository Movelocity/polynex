import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  userService, 
  blogService, 
  categoryService, 
  getServiceFactory,
  StorageType 
} from '@/services';
import { User, Blog, Category } from '@/types';

/**
 * 服务层演示组件
 * 展示如何使用新的服务架构和存储切换功能
 */
export const ServiceDemo: React.FC = () => {
  const [currentStorageType, setCurrentStorageType] = useState<StorageType>('localStorage');
  const [users, setUsers] = useState<User[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前存储类型
  useEffect(() => {
    const factory = getServiceFactory();
    setCurrentStorageType(factory.getStorageType());
  }, []);

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
      
      setUsers(usersData);
      setBlogs(blogsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换存储类型
  const switchStorageType = (newType: StorageType) => {
    const factory = getServiceFactory();
    factory.switchStorageType(newType);
    setCurrentStorageType(newType);
    setError(null);
    // 重新加载数据
    loadData();
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

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            服务层演示
            <Badge variant={currentStorageType === 'localStorage' ? 'default' : 'secondary'}>
              当前存储: {currentStorageType}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 存储类型切换 */}
          <div className="flex gap-2">
            <Button
              variant={currentStorageType === 'localStorage' ? 'default' : 'outline'}
              onClick={() => switchStorageType('localStorage')}
              disabled={loading}
            >
              切换到 localStorage
            </Button>
            <Button
              variant={currentStorageType === 'api' ? 'default' : 'outline'}
              onClick={() => switchStorageType('api')}
              disabled={loading}
            >
              切换到 API
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button onClick={loadData} disabled={loading}>
              重新加载数据
            </Button>
            <Button onClick={testAddBlog} disabled={loading}>
              测试添加博客
            </Button>
            <Button onClick={testSearch} disabled={loading}>
              测试搜索功能
            </Button>
          </div>

          {/* 错误信息 */}
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 加载状态 */}
          {loading && <div className="text-center py-4">加载中...</div>}
        </CardContent>
      </Card>

      {/* 数据展示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 用户数据 */}
        <Card>
          <CardHeader>
            <CardTitle>用户数据 ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.slice(0, 3).map(user => (
                <div key={user.id} className="p-2 bg-gray-50 rounded">
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
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
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>localStorage 模式:</strong> 数据存储在浏览器本地，适合开发和演示
            </p>
            <p>
              <strong>API 模式:</strong> 数据通过HTTP API获取，需要后端服务支持
            </p>
            <p>
              <strong>切换方式:</strong> 可以通过环境变量 VITE_STORAGE_TYPE 或动态切换按钮
            </p>
            <p>
              <strong>代码使用:</strong> 
              <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                import {`{ userService }`} from '@/services';
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 