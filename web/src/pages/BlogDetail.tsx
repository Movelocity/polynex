import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogService } from '@/services';
import { Blog } from '@/types';
import { MarkdownPreview } from '@/components/common/MarkdownPreview';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Clock, 
  Tag,
  BookOpen,
  Share2,
  Pencil
} from 'lucide-react';
import { TOC } from '@/components/common/TOC';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const isAuthor = user?.id === blog?.authorId;
  
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
          <div className="w-16 h-16 bg-gradient-to-br from-theme-blue to-theme-purple rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-destructive mb-4">{error || '文章不存在'}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-2 mb-8">
      {/* 左中右三栏布局 */}
      <div className="flex gap-8">
        {/* 左侧栏 - 推荐文章 */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span 
              onClick={() => navigate(-1)}
              className="cursor-pointer flex items-center text-foreground hover:text-theme-blue mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />返回
            </span>
          </div>
          {relatedBlogs.length > 0 && (
            <div className="sticky top-20">
              <h3 className="text-lg font-bold text-foreground mb-4">推荐文章</h3>
              <div className="space-y-4">
                {relatedBlogs.map((relatedBlog) => (
                  <Link 
                    key={relatedBlog.id}
                    to={`/blog/${relatedBlog.id}`}
                    className="group block px-3 py-1 rounded-lg transition-all hover:bg-muted"
                  >
                    <h4 className="font-medium text-foreground group-hover:text-theme-blue transition-colors mb-1 line-clamp-2">
                      {relatedBlog.title}
                    </h4>
                    <div className="flex flex-col text-xs text-muted-foreground space-y-1">
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
        <main className="flex-1 min-w-0 px-4">
          {/* 文章头部信息 */}
          <header className="my-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              {blog.title}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div className="flex items-center flex-wrap">
                <div className="flex items-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{blog.authorName}</p>
                  
                </div>
                <Badge variant="secondary" className="bg-theme-blue/10 text-theme-blue ml-2">
                  {blog.category}
                </Badge>
                <div className="flex items-center text-muted-foreground text-sm ml-2">
                  <Eye className="w-4 h-4 mr-1" />
                  {blog.views} 次阅读
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </Button>
                {isAuthor && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/edit/${blog.id}`)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                )}
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
          <article className="prose prose-slate max-w-none mb-16 min-h-[60vh]">
            <MarkdownPreview content={blog.content} />
          </article>

          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(blog.createTime)}
            </span>
            {blog.updateTime !== blog.createTime && (
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                更新于 {formatDate(blog.updateTime)}
              </span>
            )}
          </div>
        </main>
        
        {/* 右侧栏 - TOC */}
        <aside className="hidden xl:block w-64 flex-shrink-0">
          <div className="sticky top-20">
            <h3 className="text-lg font-bold text-foreground mb-4">目录</h3>
            <div className="text-sm text-foreground">
              <TOC content={blog.content} />
            </div>
          </div>
        </aside>
      </div>
      
      {/* 移动端推荐文章 */}
      <div className="lg:hidden mt-12">
        {relatedBlogs.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">推荐文章</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedBlogs.map((relatedBlog) => (
                <Link 
                  key={relatedBlog.id}
                  to={`/blog/${relatedBlog.id}`}
                  className="group block p-4 rounded-lg border border-border hover:border-theme-blue/30 hover:shadow-md transition-all"
                >
                  <h4 className="font-medium text-foreground group-hover:text-theme-blue transition-colors mb-2">
                    {relatedBlog.title}
                  </h4>
                  <div className="flex items-center text-xs text-muted-foreground space-x-4">
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
