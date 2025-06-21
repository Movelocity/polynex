import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogService, categoryService } from '@/services';
import { Blog, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Tag, 
  Clock, 
  BookOpen,
  PenTool,
  FileX
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

// Temporary formatDate function until we move it to a proper utils file
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const blogsPerPage = 9;

  useEffect(() => {
    if (category) {
      loadCategoryData(category);
    }
  }, [category]);

  const loadCategoryData = async (categoryName: string) => {
    setLoading(true);
    setError(null);
    try {
      // Load category info
      const categoryInfo = await categoryService.getCategoryByName(categoryName);
      setCategoryData(categoryInfo);

      // Load blogs for this category
      const categoryBlogs = await blogService.getBlogsByCategory(categoryName);
      setBlogs(categoryBlogs);
    } catch (err) {
      console.error('加载分类数据失败:', err);
      setError('加载分类数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 分页
  const totalPages = Math.ceil(blogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const currentBlogs = blogs.slice(startIndex, startIndex + blogsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => category && loadCategoryData(category)} variant="outline">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  if (!categoryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">分类不存在</h2>
          <p className="text-slate-600 mb-4">您访问的分类不存在</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Button>
      </div>

      {/* Category Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
          <Tag className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {categoryData.name}
        </h1>
        <p className="text-xl text-slate-600 mb-6 max-w-2xl mx-auto">
          {categoryData.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex items-center space-x-4 text-slate-600">
            <div className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              <span>{blogs.length} 篇文章</span>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/write')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <PenTool className="w-4 h-4 mr-2" />
            写{categoryData.name}文章
          </Button>
        </div>
      </div>

      {/* Blog Grid */}
      {currentBlogs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            {currentBlogs.map((blog) => (
              <Card key={blog.id} className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {blog.category}
                    </Badge>
                    <div className="flex items-center text-slate-500 text-sm">
                      <Eye className="w-4 h-4 mr-1" />
                      {blog.views}
                    </div>
                  </div>
                  <CardTitle className="group-hover:text-blue-600 transition-colors">
                    <Link to={`/blog/${blog.id}`}>
                      {blog.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {blog.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                                              <UserAvatar 
                          username={blog.authorName}
                          size="xs"
                        />
                      <span className="text-sm text-slate-600">{blog.authorName}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(blog.createTime)}
                    </div>
                  </div>
                  
                  {blog.updateTime !== blog.createTime && (
                    <div className="flex items-center text-xs text-slate-500 mb-3">
                      <Clock className="w-3 h-3 mr-1" />
                      更新于 {formatDate(blog.updateTime)}
                    </div>
                  )}
                  
                  {blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {blog.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {blog.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{blog.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileX className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-600 mb-2">
            暂无 "{categoryData.name}" 分类的文章
          </h3>
          <p className="text-slate-500 mb-6">
            成为第一个在此分类下分享内容的人吧！
          </p>
          <Button 
            onClick={() => navigate('/write')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <PenTool className="w-4 h-4 mr-2" />
            写第一篇{categoryData.name}文章
          </Button>
        </div>
      )}
    </div>
  );
}
