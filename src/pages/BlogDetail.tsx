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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {/* Article Header */}
      <Card className="mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
        <CardHeader className="pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {blog.category}
            </Badge>
            <div className="flex items-center text-slate-500 text-sm">
              <Eye className="w-4 h-4 mr-1" />
              {blog.views} 次阅读
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 leading-tight">
            {blog.title}
          </h1>
          
          <p className="text-lg text-slate-600 mb-6">
            {blog.summary}
          </p>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                  {blog.authorName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
            <div className="flex flex-wrap gap-2 mt-4">
              {blog.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Article Content */}
      <Card className="mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
        <CardContent className="pt-8">
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-slate-800 mb-6 mt-8 first:mt-0 border-b border-slate-200 pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-slate-800 mb-3 mt-6">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    {children}
                  </p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-300 pl-4 py-2 my-6 bg-blue-50 italic text-slate-700">
                    {children}
                  </blockquote>
                ),
                code: ({ children, ...props }) => {
                  const inline = !props.className?.includes('language-');
                  return inline ? (
                    <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                      {children}
                    </code>
                  );
                },
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-700">
                    {children}
                  </ol>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {blog.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Related Articles */}
      {relatedBlogs.length > 0 && (
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <h3 className="text-xl font-bold text-slate-800">相关文章</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {relatedBlogs.map((relatedBlog) => (
                <div key={relatedBlog.id}>
                  <Link 
                    to={`/blog/${relatedBlog.id}`}
                    className="group block"
                  >
                    <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors mb-2">
                          {relatedBlog.title}
                        </h4>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                          {relatedBlog.summary}
                        </p>
                        <div className="flex items-center text-xs text-slate-500">
                          <User className="w-3 h-3 mr-1" />
                          {relatedBlog.authorName}
                          <span className="mx-2">·</span>
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(relatedBlog.createTime)}
                          <span className="mx-2">·</span>
                          <Eye className="w-3 h-3 mr-1" />
                          {relatedBlog.views}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {relatedBlogs.indexOf(relatedBlog) < relatedBlogs.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
