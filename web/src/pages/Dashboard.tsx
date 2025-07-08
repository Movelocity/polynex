import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { blogService, fileService } from '@/services';
import { Blog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { Input } from '@/components/x-ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/x-ui/alert-dialog';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  PenTool, 
  FileText, 
  BarChart3,
  Search,
  User,
  File,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/x-ui/table';
import { Badge } from '@/components/x-ui/badge';

export function Dashboard() {
  // 设置页面标题
  useTitle('管理中心');
  
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const blogsPerPage = 9;

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // 搜索时重置到第一页
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user && !authLoading) {
      loadUserBlogs();
    }
  }, [user, authLoading]);

  const loadUserBlogs = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const userBlogs = await blogService.getBlogsByAuthor(user.id);
      setBlogs(userBlogs.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()));
    } catch (err) {
      console.error('加载博客失败:', err);
      setError('加载博客失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    try {
      const success = await blogService.deleteBlog(blogId);
      if (success) {
        setBlogs(prev => prev.filter(blog => blog.id !== blogId));
      }
    } catch (error) {
      console.error('删除博客失败:', error);
    }
  };

  const handleToggleStatus = async (blogId: string, newStatus: 'published' | 'draft') => {
    try {
      const success = await blogService.updateBlog(blogId, { status: newStatus });
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

  if (authLoading || loading) {
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadUserBlogs} variant="outline">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* side */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center justify-around">
            {user.avatar && (
              <img 
                src={fileService.resolveFileUrl(user.avatar)} 
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover cursor-pointer"
                onError={(e) => {
                  // 如果头像加载失败，隐藏图片
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="text-xl font-bold text-foreground">欢迎回来，{user.username}</span>
          </div>
          {/* Admin Section - Only visible to admins */}
          {user.role === 'admin' && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => navigate('/settings')}
                    className="justify-start"
                    variant="outline"
                  >
                    <User className="w-4 h-4 mr-2" />
                    账户设置
                  </Button>
                  <Button 
                    onClick={() => navigate('/file-manage')}
                    className="justify-start"
                    variant="outline"
                  >
                    <File className="w-4 h-4 mr-2" />
                    文件管理
                  </Button>
                </div>
                
              </CardContent>
            </Card>
          )}

        </div>
        {/* Blog Management */}
        <Card className="col-span-1 lg:col-span-4">
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
                    <Card className="mb-8">
                      <Table>
                        <TableHeader>
                          <TableRow className="px-4">
                            <TableHead>标题</TableHead>
                            <TableHead>分类</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>标签</TableHead>
                            <TableHead className="text-right">阅读量</TableHead>
                            <TableHead>更新时间</TableHead>
                            <TableHead>操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentBlogs.map((blog) => (
                            <TableRow key={blog.id} className="px-4">
                              <TableCell className="font-medium">
                                <Link to={`/blog/${blog.id}`} className="hover:underline">
                                  {blog.title}
                                </Link>
                              </TableCell>
                              <TableCell>{blog.category}</TableCell>
                              <TableCell>
                                <Badge variant={blog.status === 'published' ? 'default' : 'secondary'}>
                                  {blog.status === 'published' ? '已发布' : '草稿'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {blog.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                  ))}
                                  {blog.tags.length > 3 && <Badge variant="outline">...</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{blog.views}</TableCell>
                              <TableCell>{new Date(blog.updateTime).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button onClick={() => handleEdit(blog.id)} variant="outline" size="sm">编辑</Button>
                                  <Button 
                                    onClick={() => handleToggleStatus(blog.id, blog.status === 'published' ? 'draft' : 'published')} 
                                    variant="outline" 
                                    size="sm"
                                  >
                                    {blog.status === 'published' ? '下架' : '发布'}
                                  </Button>
                                  <Button onClick={() => setDeleteConfirmBlog(blog)} variant="destructive" size="sm">删除</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>

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
                        variant="attractive"
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
        
      </div>
    </div>
  );
}
