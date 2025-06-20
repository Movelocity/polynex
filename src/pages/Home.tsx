import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlogStorage, CategoryStorage } from '@/utils/storage';
import { Blog, Category } from '@/types';
import { formatDate } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Eye, 
  Tag, 
  User, 
  Clock, 
  TrendingUp,
  BookOpen,
  PenTool,
  BarChart3
} from 'lucide-react';

export function Home() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const blogsPerPage = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 获取已发布的博客
      const allBlogs = BlogStorage.getPublishedBlogs();
      setBlogs(allBlogs);

      // 更新分类计数并获取分类
      CategoryStorage.updateCategoryCounts();
      const allCategories = CategoryStorage.getCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选博客
  const filteredBlogs = selectedCategory 
    ? blogs.filter(blog => blog.category === selectedCategory)
    : blogs;

  // 分页
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const currentBlogs = filteredBlogs.slice(startIndex, startIndex + blogsPerPage);

  // 统计数据
  const totalBlogs = blogs.length;
  const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);
  const recentBlogs = blogs.slice(0, 3);

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

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      {/* <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          分享你的故事
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          在这里记录生活、分享知识、连接世界。每一篇文章都是一段独特的旅程。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/write')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <PenTool className="w-5 h-5 mr-2" />
            开始写作
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/register')}>
            加入我们
          </Button>
        </div>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 lg:col-span-1">
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  站点统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">文章总数</span>
                  <span className="font-semibold text-blue-600">{totalBlogs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">总阅读量</span>
                  <span className="font-semibold text-purple-600">{totalViews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">分类数量</span>
                  <span className="font-semibold text-green-600">{categories.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  分类
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedCategory === '' ? 'default' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => {
                    setSelectedCategory('');
                    setCurrentPage(1);
                  }}
                >
                  全部
                  <Badge variant="secondary">{totalBlogs}</Badge>
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.name ? 'default' : 'ghost'}
                    className="w-full justify-between"
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setCurrentPage(1);
                    }}
                  >
                    {category.name}
                    <Badge variant="secondary">{category.count}</Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  最新文章
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentBlogs.map((blog) => (
                  <div key={blog.id} className="border-l-2 border-blue-200 pl-4">
                    <Link 
                      to={`/blog/${blog.id}`}
                      className="text-sm font-medium hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {blog.title}
                    </Link>
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(blog.createTime)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 xl:col-span-3">
          {/* Blog Grid */}
          {currentBlogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              {currentBlogs.map((blog) => (
                <Card key={blog.id} className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{blog.category}</Badge>
                      <div className="flex items-center text-slate-500 text-sm">
                        <Eye className="w-4 h-4 mr-1" />
                        {blog.views}
                      </div>
                    </div>
                    <CardTitle className="group-hover:text-blue-600 transition-colors">
                      <Link className="item-title" to={`/blog/${blog.id}`}>
                        {blog.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {blog.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {blog.authorName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-slate-600">{blog.authorName}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(blog.createTime)}
                      </div>
                    </div>
                    {blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
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
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-600 mb-2">
                {selectedCategory ? `"${selectedCategory}"分类下暂无文章` : '还没有文章'}
              </h3>
              <p className="text-slate-500 mb-6">
                {selectedCategory ? '换个分类看看吧' : '成为第一个分享故事的人'}
              </p>
              <Button 
                onClick={() => navigate('/write')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <PenTool className="w-4 h-4 mr-2" />
                写第一篇文章
              </Button>
            </div>
          )}

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
                const pageNum = i + 1;
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
        </div>
      </div>
    </div>
  );
}
