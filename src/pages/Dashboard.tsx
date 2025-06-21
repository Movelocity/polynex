import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogStorage } from '@/utils/storage';
import { Blog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BlogCard } from '@/components/ui/BlogCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  PenTool, 
  FileText, 
  BarChart3,
  Search,
} from 'lucide-react';

export function Dashboard() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  const blogsPerPage = 6;

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // 搜索时重置到第一页
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      loadUserBlogs();
    }
  }, [user]);

  const loadUserBlogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userBlogs = BlogStorage.getBlogsByAuthor(user.id);
      setBlogs(userBlogs.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()));
    } catch (error) {
      console.error('加载博客失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    try {
      const success = BlogStorage.deleteBlog(blogId);
      if (success) {
        setBlogs(prev => prev.filter(blog => blog.id !== blogId));
      }
    } catch (error) {
      console.error('删除博客失败:', error);
    }
  };

  const handleToggleStatus = async (blogId: string, newStatus: 'published' | 'draft') => {
    try {
      const success = BlogStorage.updateBlog(blogId, { status: newStatus });
      if (success) {
        setBlogs(prev => prev.map(blog => 
          blog.id === blogId ? { ...blog, status: newStatus } : blog
        ));
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleEdit = (blogId: string) => {
    navigate(`/edit/${blogId}`);
  };
  
  const [deleteConfirmBlog, setDeleteConfirmBlog] = useState<Blog | null>(null);

  // 筛选博客 - 同时支持标签筛选和搜索
  const filteredBlogs = blogs.filter(blog => {
    // 首先按标签筛选
    let matchesTab = true;
    switch (activeTab) {
      case 'published':
        matchesTab = blog.status === 'published';
        break;
      case 'draft':
        matchesTab = blog.status === 'draft';
        break;
      default:
        matchesTab = true;
    }

    // 然后按搜索词筛选
    let matchesSearch = true;
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      matchesSearch = 
        blog.title.toLowerCase().includes(query) ||
        blog.summary.toLowerCase().includes(query) ||
        blog.category.toLowerCase().includes(query) ||
        blog.tags.some(tag => tag.toLowerCase().includes(query));
    }

    return matchesTab && matchesSearch;
  });

  // 分页
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const currentBlogs = filteredBlogs.slice(startIndex, startIndex + blogsPerPage);

  // 当切换标签时重置页码
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  // 统计数据
  const stats = {
    total: blogs.length,
    published: blogs.filter(b => b.status === 'published').length,
    draft: blogs.filter(b => b.status === 'draft').length,
    totalViews: blogs.reduce((sum, blog) => sum + blog.views, 0),
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-4 mb-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xl">
            {user.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">欢迎回来，{user.username}</h1>
          <p className="text-slate-600">管理您的博客内容</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Blog Management */}
        <Card className="col-span-1 lg:col-span-3 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center font-bold text-xl">
                  <BarChart3 className="w-6 h-6 mr-2" />
                  我的文章
                </CardTitle>
                <CardDescription>
                  管理您发布的所有文章
                </CardDescription>
              </div>

              {/* 搜索框 */}
              <div className="relative flex-1 ml-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="搜索文章标题、摘要、分类或标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  全部 ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="published">
                  已发布 ({stats.published})
                </TabsTrigger>
                <TabsTrigger value="draft">
                  草稿 ({stats.draft})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-6">
                {currentBlogs.length > 0 ? (
                  <>
                    <div className="space-y-4 mb-8">
                      {currentBlogs.map((blog) => (
                        <BlogCard
                          key={blog.id}
                          blog={blog}
                          layout="list"
                          showActions={true}
                          showStatus={true}
                          showUpdateTime={true}
                          summaryLines={2}
                          maxTags={5}
                          onEdit={handleEdit}
                          onToggleStatus={handleToggleStatus}
                          onDelete={(blogId) => setDeleteConfirmBlog(blog)}
                        />
                      ))}
                    </div>

                    {/* 分页 */}
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
                    
                    {/* Delete Confirmation Dialog */}
                    <AlertDialog 
                      open={deleteConfirmBlog !== null} 
                      onOpenChange={(open) => !open && setDeleteConfirmBlog(null)}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            您确定要删除文章《{deleteConfirmBlog?.title}》吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              if (deleteConfirmBlog) {
                                handleDeleteBlog(deleteConfirmBlog.id);
                                setDeleteConfirmBlog(null);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-medium text-slate-600 mb-2">
                      {debouncedSearchQuery.trim() 
                        ? `没有找到包含"${debouncedSearchQuery}"的文章`
                        : activeTab === 'published' 
                          ? '还没有已发布的文章'
                          : activeTab === 'draft' 
                            ? '还没有草稿'
                            : '还没有文章'
                      }
                    </h3>
                    <p className="text-slate-500 mb-6">
                      {debouncedSearchQuery.trim()
                        ? '尝试使用其他关键词搜索'
                        : activeTab === 'published' 
                          ? '您还没有发布任何文章，写一篇文章分享您的想法吧！'
                          : activeTab === 'draft' 
                            ? '您还没有保存任何草稿，开始创作吧！'
                            : '开始创作您的第一篇文章，分享您的故事'
                      }
                    </p>
                    {!debouncedSearchQuery.trim() && (
                      <Button 
                        onClick={() => navigate('/write')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <PenTool className="w-4 h-4 mr-2" />
                        写文章
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        {/* side */}
        <div className="col-span-1 space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center font-bold text-xl">
                <BarChart3 className="w-5 h-5 mr-2" />
                站点统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">文章总数</span>
                <span className="font-semibold text-blue-600">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">已发布</span>
                <span className="font-semibold text-green-600">{stats.published}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">草稿</span>
                <span className="font-semibold text-green-600">{stats.draft}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">总阅读量</span>
                <span className="font-semibold text-purple-600">{stats.totalViews}</span>
              </div>
              {debouncedSearchQuery.trim() && (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-slate-600">搜索结果</span>
                  <span className="font-semibold text-orange-600">{filteredBlogs.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
