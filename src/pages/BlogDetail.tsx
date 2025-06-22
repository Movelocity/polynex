import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogService } from '@/services';
import { Blog } from '@/types';
import { MarkdownPreview } from '@/components/common/markdown-preview';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/x-ui/avatar';
import { Separator } from '@/components/x-ui/separator';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Clock, 
  User,
  Tag,
  BookOpen,
  Share2
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user/UserAvatar';
import { TOC } from '@/components/common/TOC';
// Note: Highlight.js styles are included via CDN in index.html for better compatibility

// Temporary formatDate function until we move it to a proper utils file
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 动态设置页面标题 - 根据文章标题更新
  useTitle(blog ? blog.title : '文章详情');

  useEffect(() => {
    if (id) {
      loadBlogAndRelated(id);
    }
  }, [id]);

  const loadBlogAndRelated = async (blogId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Load blog details
      const blogData = await blogService.getBlogById(blogId);
      if (!blogData) {
        setError('文章不存在');
        return;
      }
      
      setBlog(blogData);
      
      // Increment view count
      await blogService.incrementViews(blogId);
      
      // Load related blogs
      const allBlogs = await blogService.getPublishedBlogs();
      const related = allBlogs
        .filter(b => b.id !== blogId && b.category === blogData.category)
        .slice(0, 3);
      setRelatedBlogs(related);
      
    } catch (err) {
      console.error('加载文章失败:', err);
      setError('加载文章失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && blog) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.summary,
          url: window.location.href,
        });
      } catch (err) {
        console.log('分享失败:', err);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      // You might want to show a toast notification here
    }
  };

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

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error || '文章不存在'}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 mb-8">
      {/* 顶部导航区域 */}
      <div className="my-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span 
            onClick={() => navigate(-1)}
            className="cursor-pointer flex items-center hover:text-blue-600 mr-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {blog.category}
          </Badge>
          <div className="flex items-center text-slate-500 text-sm">
            <Eye className="w-4 h-4 mr-1" />
            {blog.views} 次阅读
          </div>
        </div>
      </div>
      
      {/* 左中右三栏布局 */}
      <div className="flex gap-8">
        {/* 左侧栏 - 推荐文章 */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          {relatedBlogs.length > 0 && (
            <div className="sticky top-20">
              <h3 className="text-lg font-bold text-slate-800 mb-4">推荐文章</h3>
              <div className="space-y-4">
                {relatedBlogs.map((relatedBlog) => (
                  <Link 
                    key={relatedBlog.id}
                    to={`/blog/${relatedBlog.id}`}
                    className="group block p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <h4 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {relatedBlog.title}
                    </h4>
                    <div className="flex flex-col text-xs text-slate-500 space-y-1">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(relatedBlog.createTime)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
        
        {/* 中间主内容区 */}
        <main className="flex-1 min-w-0">
          {/* 文章头部信息 */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                {/* <UserAvatar 
                  username={blog.authorName}
                  size="lg"
                /> */}
                <div>
                  <p className="font-medium text-slate-800">{blog.authorName}</p>
                  <div className="flex items-center text-sm text-slate-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(blog.createTime)}
                    {blog.updateTime !== blog.createTime && (
                      <>
                        <span className="mx-2">·</span>
                        <Clock className="w-4 h-4 mr-1" />
                        更新于 {formatDate(blog.updateTime)}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </Button>
              </div>
            </div>
            
            {blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>
          
          {/* 文章内容 */}
          <article className="prose prose-slate max-w-none">
            <MarkdownPreview content={blog.content} />
          </article>
        </main>
        
        {/* 右侧栏 - TOC */}
        <aside className="hidden xl:block w-64 flex-shrink-0">
          <div className="sticky top-20">
            <h3 className="text-lg font-bold text-slate-800 mb-4">目录</h3>
            <div className="text-sm text-slate-600">
              <TOC content={blog.content} />
            </div>
          </div>
        </aside>
      </div>
      
      {/* 移动端推荐文章 */}
      <div className="lg:hidden mt-12">
        {relatedBlogs.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-6">推荐文章</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedBlogs.map((relatedBlog) => (
                <Link 
                  key={relatedBlog.id}
                  to={`/blog/${relatedBlog.id}`}
                  className="group block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <h4 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors mb-2">
                    {relatedBlog.title}
                  </h4>
                  <div className="flex items-center text-xs text-slate-500 space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(relatedBlog.createTime)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
