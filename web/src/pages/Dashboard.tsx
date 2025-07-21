import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService, blogService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent } from '@/components/x-ui/card';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/x-ui/dialog';
import { Input } from '@/components/x-ui/input';
import { Badge } from '@/components/x-ui/badge';
import { useTitle } from '@/hooks/usePageTitle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Blog } from '@/types';
import { cn } from '@/lib/utils';
import { 
  User,
  File,
  Newspaper,
  Users,
  PanelLeftOpen,
  Plus,
  Edit,
  Settings,
  FileText,
  Search,
  Folder,
  PenTool,
  Calendar,
  Save,
  Globe,
  Lock,
  Tag,
  Eye,
  RefreshCcw,
} from 'lucide-react';
// import { BlogManagement } from '@/components/dashboard/BlogManagement';
import { FileManagement } from '@/components/dashboard/FileManagement';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { ProfileManagement } from '@/components/dashboard/ProfileManagement';
import { ArticleEditor } from '@/components/dashboard/ArticleEditor';

type ActiveView = 'blogs' | 'files' | 'users' | 'profile' | 'article-edit' | 'article-create';
type SidebarContent = 'articles' | 'files';

export function Dashboard() {
  useTitle('管理中心');
  
  const [activeView, setActiveView] = useState<ActiveView>('article-create');
  const [sidebarContent, setSidebarContent] = useState<SidebarContent>('articles');
  const [selectedArticle, setSelectedArticle] = useState<Blog | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      loadUserBlogs();
    }
  }, [user]);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const loadUserBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const response = await blogService.getBlogsByAuthor(user!.id);
      setBlogs(response);
    } catch (error) {
      console.error('Failed to load user blogs:', error);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSidebarClose = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleArticleSelect = (blog: Blog) => {
    setSelectedArticle(blog);
    setActiveView('article-edit');
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewArticle = () => {
    setActiveView('article-create');
    setSelectedArticle(null);
    console.log('handleNewArticle');
    handleSidebarClose();
  };

  const handleArticleCreated = (article: Blog) => {
    setBlogs(prev => [article, ...prev]);
    setActiveView('article-edit');
    setSelectedArticle(article);
    toast({
      title: "文章创建成功",
      description: "您可以继续编辑文章或查看其他文章",
    });
  };

  const handleArticleSaved = (newBlog: Blog) => {
    setBlogs(prev => prev.map(blog => 
      blog.id === newBlog.id ? newBlog : blog
    ));
    setSelectedArticle(newBlog);
  };

  const handleArticleDelete = (article: Blog) => {
    setBlogs(prev => prev.filter(blog => blog.id !== article.id));
    setSelectedArticle(null);
  };

  const renderSidebarContent = () => {
    if (sidebarContent === 'articles') {
      return (
        <div className="flex flex-col h-full">
          <div className="px-3 py-2 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="过滤标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-foreground"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button onClick={loadUserBlogs} size="sm" variant="outline" >
                <RefreshCcw className="w-4 h-4 mr-1" />
                刷新
              </Button>
              <Button onClick={handleNewArticle} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loadingBlogs ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">加载中...</p>
                </div>
              ) : filteredBlogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无文章</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredBlogs.reverse().map((blog) => (
                    <div
                      key={blog.id}
                      className={cn(
                        "group block px-3 py-2 rounded-lg transition-all cursor-pointer",
                        selectedArticle?.id === blog.id ? "bg-theme-blue/10" : "hover:bg-muted"
                      )}
                      onClick={() => handleArticleSelect(blog)}
                    >
                      <h4 className="font-medium text-foreground group-hover:text-theme-blue transition-colors mb-1 line-clamp-2">
                        {blog.title}
                      </h4>
                      <div className="flex flex-col text-xs text-muted-foreground space-y-1">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(blog.updateTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }
    return null;
  };

  const renderMainContent = () => {
    if (activeView === 'article-edit' && selectedArticle) {
      return (
        <ArticleEditor
          key={selectedArticle.id}
          blogId={selectedArticle.id}
          onSave={handleArticleSaved}
          onDelete={handleArticleDelete}
        />
      );
    }
    
    if (activeView === 'article-create') {
      return (
        <ArticleEditor
          key="article-create"
          onCreated={handleArticleCreated}
        />
      );
    }
    
    switch (activeView) {
      case 'users':
        return <UserManagement />;
      case 'profile':
        return <ProfileManagement />;
      case 'files':
        return <FileManagement />;
      default:
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">选择文章开始编辑</h3>
              <p className="text-sm">从左侧列表选择一篇文章进行编辑，或点击"新建"创建文章</p>
            </div>
          </div>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">请先登录</h2>
          <p className="text-slate-600 mb-4">您需要登录才能查看个人管理面板</p>
          <Button onClick={() => navigate('/login')}>
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-65px)] relative">
      {/* 移动端背景遮罩 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={handleSidebarClose}
        />
      )}
      {/* 移动端汉堡菜单 */}
      {isMobile && !isSidebarOpen && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-2 left-2 z-50 h-10 w-10"
          onClick={() => setIsSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-6 w-6" />
        </Button>
      )}

      {/* 左侧边栏 */}
      <div className={cn(
        isMobile 
          ? 'fixed top-0 left-0 bottom-0 z-50 w-[280px] sm:w-[320px] transform transition-transform duration-300 ease-in-out' 
          : 'w-80 flex-shrink-0 relative',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        !isMobile ? 'block' : ''
      )}>
        <div className="h-full flex flex-col bg-background border-r border-border">
          {/* 内容区域 */}
          <div className="flex-1 min-h-0">
            {renderSidebarContent()}
          </div>

          {/* 底部设置区域 */}
          <div className="p-2">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center"
                onClick={() => {
                  setActiveView('files');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center"
                onClick={() => {
                  setActiveView('profile');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <Settings className="w-4 h-4" />
              </Button>
              {user.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => {
                    setActiveView('users');
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                >
                  <Users className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col relative">
        {/* 主内容区 */}
        <div className="flex-1 relative">
          {renderMainContent()}
        </div>
      </div>

      {/* 弹窗 */}
      {/* <Dialog open={isFileListOpen} onOpenChange={setIsFileListOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>文件管理</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh]">
            
          </div>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
