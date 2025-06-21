import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogService, categoryService } from '@/services';
import { Blog, Category } from '@/types';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { BlogCard } from '@/components/common/blog/BlogCard';
import { 
  Calendar, 
  Tag, 
  TrendingUp,
  BookOpen,
  PenTool,
  BarChart3
} from 'lucide-react';

// Temporary formatDate function until we move it to a proper utils file
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export function Home() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const blogsPerPage = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 获取已发布的博客和分类信息
      const [blogsData, categoriesData] = await Promise.all([
        blogService.getPublishedBlogs(),
        categoryService.getCategories()
      ]);
      
      setBlogs(blogsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据失败，请刷新页面重试');
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
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
      </div>

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
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  layout="grid"
                  summaryLines={3}
                  maxTags={3}
                  className="group border-0 bg-white/80 backdrop-blur-sm"
                />
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
