import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { blogService } from '@/services';
import { Blog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search as SearchIcon, 
  Calendar, 
  Eye, 
  Clock, 
  FileX,
  TrendingUp
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

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
      setHasSearched(true);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const results = await blogService.searchBlogs(query);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索失败:', err);
      setError('搜索失败，请重试');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
      performSearch(searchQuery.trim());
      setHasSearched(true);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">搜索文章</h1>
        <p className="text-slate-600 mb-6">
          在这里搜索您感兴趣的文章内容
        </p>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="输入关键词搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg"
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? '搜索中...' : '搜索'}
            </Button>
          </div>
        </form>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-slate-800">
                搜索结果
              </h2>
              {searchQuery && (
                <span className="text-slate-600">
                  关键词："{searchQuery}"
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500">
              共找到 {searchResults.length} 篇文章
            </div>
          </div>

          {/* Results List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">搜索中...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-6">
              {searchResults.map((blog) => (
                <Card key={blog.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{blog.category}</Badge>
                        <div className="flex items-center text-slate-500 text-sm">
                          <Eye className="w-4 h-4 mr-1" />
                          {blog.views}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-slate-800 mb-2 hover:text-blue-600 transition-colors">
                      <Link to={`/blog/${blog.id}`}>
                        {highlightText(blog.title, searchQuery)}
                      </Link>
                    </h3>
                    
                    <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                      {highlightText(blog.summary, searchQuery)}
                    </p>
                    
                    <div className="flex items-center justify-between">
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
                    
                    {blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {blog.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {highlightText(tag, searchQuery)}
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
                <FileX className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-600 mb-2">
                没有找到相关文章
              </h3>
              <p className="text-slate-500 mb-6">
                没有找到包含 "{searchQuery}" 的文章，试试其他关键词吧
              </p>
              <div className="space-y-4">
                <div className="text-sm text-slate-500">
                  搜索建议：
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['技术', '生活', '旅行', '美食', '读书'].map((keyword) => (
                    <Button
                      key={keyword}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(keyword);
                        setSearchParams({ q: keyword });
                        performSearch(keyword);
                      }}
                    >
                      {keyword}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Popular Searches - Show when no search has been performed */}
      {!hasSearched && (
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              热门搜索
            </CardTitle>
            <CardDescription>
              试试这些热门关键词
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['React', 'JavaScript', '前端', '后端', '编程', '技术', '生活', '旅行', '美食', '读书'].map((keyword) => (
                <Button
                  key={keyword}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(keyword);
                    setSearchParams({ q: keyword });
                    performSearch(keyword);
                    setHasSearched(true);
                  }}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
