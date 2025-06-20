import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlogStorage } from '@/utils/storage';
import { Blog } from '@/types';
import { formatDate } from '@/utils/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BlogCard } from '@/components/ui/BlogCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  PenTool, 
  FileText, 
  TrendingUp,
  BarChart3,
  Clock,
  BookOpen
} from 'lucide-react';

export function Dashboard() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // 筛选博客
  const filteredBlogs = blogs.filter(blog => {
    switch (activeTab) {
      case 'published':
        return blog.status === 'published';
      case 'draft':
        return blog.status === 'draft';
      default:
        return true;
    }
  });

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
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* side */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
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
          {/* Stats */}
          <div className="hidden lg:flex flex-col gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">总文章</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">已发布</p>
                    <p className="text-3xl font-bold text-green-700">{stats.published}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-sm font-medium">草稿</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.draft}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">总阅读量</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.totalViews}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Blog Management */}
        <Card className="col-span-4 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              我的文章
            </CardTitle>
            <CardDescription>
              管理您发布的所有文章
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                {filteredBlogs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBlogs.map((blog) => (
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
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-medium text-slate-600 mb-2">
                      {activeTab === 'published' && '还没有已发布的文章'}
                      {activeTab === 'draft' && '还没有草稿'}
                      {activeTab === 'all' && '还没有文章'}
                    </h3>
                    <p className="text-slate-500 mb-6">
                      {activeTab === 'published' && '您还没有发布任何文章，写一篇文章分享您的想法吧！'}
                      {activeTab === 'draft' && '您还没有保存任何草稿，开始创作吧！'}
                      {activeTab === 'all' && '开始创作您的第一篇文章，分享您的故事'}
                    </p>
                    <Button 
                      onClick={() => navigate('/write')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <PenTool className="w-4 h-4 mr-2" />
                      写文章
                    </Button>
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
