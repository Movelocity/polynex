import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogService, categoryService } from '@/services';
import { Blog, Category } from '@/types';
import { Button } from '@/components/x-ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
// import { Badge } from '@/components/x-ui/badge';
import { BlogCard } from '@/components/common/blog/BlogCard';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  // Calendar, 
  // Tag, 
  // TrendingUp,
  BookOpen,
  PenTool,
  // BarChart3
} from 'lucide-react';

// Temporary formatDate function until we move it to a proper utils file
// const formatDate = (dateString: string): string => {
//   const date = new Date(dateString);
//   return date.toLocaleDateString('zh-CN', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric'
//   });
// };

export function Home() {
  // 设置页面标题
  useTitle('首页');
  
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const blogsPerPage = 9; // 改为9个，适配3x3网格

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
  // const totalBlogs = blogs.length;
  // const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}

      {/* Category Filter Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === '' ? 'pretty' : 'outline'}
            onClick={() => {
              setSelectedCategory('');
              setCurrentPage(1);
            }}
          >
            全部
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? 'pretty' : 'outline'}
              onClick={() => {
                setSelectedCategory(category.name);
                setCurrentPage(1);
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Blog Grid */}
      {currentBlogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-12">
          {currentBlogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              layout="grid"
              summaryLines={3}
              maxTags={3}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-600 dark:text-slate-400 mb-2">
            {selectedCategory ? `"${selectedCategory}"分类下暂无文章` : '还没有文章'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {selectedCategory ? '换个分类看看吧' : '成为第一个分享故事的人'}
          </p>
          <Button 
            onClick={() => navigate('/write')}
            variant="pretty"
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
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className={currentPage === pageNum ? 
                  'bg-gradient-to-r from-blue-600 to-purple-600' : 
                  'hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
