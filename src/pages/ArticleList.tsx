import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BlogStorage, CategoryStorage } from '@/utils/storage';
import { Blog, Category } from '@/types';
import { formatDate } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BlogCard } from '@/components/ui/BlogCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Filter,
  BookOpen
} from 'lucide-react';

export function ArticleList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const blogsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allBlogs = BlogStorage.getPublishedBlogs();
      setBlogs(allBlogs);

      const allCategories = CategoryStorage.getCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选和排序博客
  const filteredAndSortedBlogs = blogs
    .filter(blog => {
      const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          blog.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          blog.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      } else {
        return b.views - a.views;
      }
    });

  // 分页
  const totalPages = Math.ceil(filteredAndSortedBlogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const currentBlogs = filteredAndSortedBlogs.slice(startIndex, startIndex + blogsPerPage);

  // 重置页码当筛选条件改变
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">所有文章</h1>
        <p className="text-slate-600">
          共有 {filteredAndSortedBlogs.length} 篇文章
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="搜索文章标题、摘要或标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="所有分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分类</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <Select value={sortBy} onValueChange={(value: 'latest' | 'popular') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">最新发布</SelectItem>
                  <SelectItem value="popular">最多阅读</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Article List */}
      {currentBlogs.length > 0 ? (
        <>
          <div className="space-y-6 mb-8">
            {currentBlogs.map((blog) => (
              <BlogCard 
                key={blog.id}
                blog={blog}
                layout="list"
                summaryLines={2}
                maxTags={3}
              />
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
              
              <div className="flex items-center space-x-2">
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
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
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
            <Filter className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-slate-600 mb-2">
            没有找到文章
          </h3>
          <p className="text-slate-500">
            尝试调整筛选条件或搜索其他关键词
          </p>
        </div>
      )}
    </div>
  );
} 