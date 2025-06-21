import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { BlogStorage } from '@/utils/storage';
import { Blog } from '@/types';
import { formatDate } from '@/utils/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownPreview } from '@/components/ui/markdown-preview';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Eye, 
  Tag, 
  ArrowLeft, 
  Edit, 
  Share,
  Clock,
  User
} from 'lucide-react';
// Note: Highlight.js styles are included via CDN in index.html for better compatibility

export function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadBlog(id);
    }
  }, [id]);

  const loadBlog = async (blogId: string) => {
    setLoading(true);
    try {
      const blogData = BlogStorage.getBlogById(blogId);
      if (blogData) {
        setBlog(blogData);
        // 增加阅读量
        BlogStorage.incrementViews(blogId);
        
        // 获取相关文章
        const allBlogs = BlogStorage.getPublishedBlogs();
        const related = allBlogs
          .filter(b => b.id !== blogId && b.category === blogData.category)
          .slice(0, 3);
        setRelatedBlogs(related);
      } else {
        navigate('/404');
      }
    } catch (error) {
      console.error('加载博客失败:', error);
      navigate('/404');
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
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // 这里可以添加一个toast通知
      console.log('链接已复制到剪贴板');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">文章不存在</h2>
          <p className="text-slate-600 mb-4">您访问的文章不存在或已被删除</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
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
            {/* <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                {blog.authorName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar> */}
            <div>
              {/* <p className="font-medium text-slate-800">{blog.authorName}</p> */}
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
              <Share className="w-4 h-4 mr-2" />
              分享
            </Button>
            {user && user.id === blog.authorId && (
              <Button 
                size="sm" 
                onClick={() => navigate(`/edit/${blog.id}`)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
            )}
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
                            {/* <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {relatedBlog.summary}
                            </p> */}
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
