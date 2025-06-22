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
      {/* Article Header */}
      <div className="my-6 border-0">
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
        
        <h1 className="mx-4 text-3xl md:text-4xl font-bold text-slate-800 mb-4 leading-tight">
          {blog.title}
        </h1>
        
        <p className="mx-4 text-lg text-slate-600 mb-6">
          {blog.summary}
        </p>
        
        <div className="mx-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <UserAvatar 
              username={blog.authorName}
              size="lg"
            />
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
          <div className="mx-4 flex flex-wrap gap-2 mt-4">
            {blog.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Article Content */}
        <Card className="col-span-1 xl:col-span-3 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardContent className="pt-8">
            <MarkdownPreview content={blog.content} />
          </CardContent>
        </Card>
        
        <div className="xl:col-span-1">
          {/* TOC */}
          <div></div>

          {/* Related Articles */}
          {relatedBlogs.length > 0 && (
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <h3 className="text-xl font-bold text-slate-800">相关文章</h3>
              </CardHeader>
              <CardContent>
                <div className="">
                  {relatedBlogs.map((relatedBlog) => (
                    <div key={relatedBlog.id}>
                      <Link 
                        to={`/blog/${relatedBlog.id}`}
                        className="group block"
                      >
                        <div className="flex items-start space-x-4 p-2 rounded-lg">
                          <div className="flex-1 gap-1">
                            <h4 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                              {relatedBlog.title}
                            </h4>
                            <div className="flex flex-col text-xs text-slate-500">
                              <span className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {relatedBlog.authorName}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(relatedBlog.createTime)}
                                <span className="mx-2">·</span>
                                <Eye className="w-3 h-3 mr-1" />
                                {relatedBlog.views}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      {relatedBlogs.indexOf(relatedBlog) < relatedBlogs.length - 1 && (
                        <Separator className="bg-slate-200" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
