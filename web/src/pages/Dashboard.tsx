import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent } from '@/components/x-ui/card';
import { useTitle } from '@/hooks/usePageTitle';
import { 
  User,
  File,
  Newspaper,
  Users,
} from 'lucide-react';
import { BlogManagement } from '@/components/dashboard/BlogManagement';
import { FileManagement } from '@/components/dashboard/FileManagement';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { ProfileManagement } from '@/components/dashboard/ProfileManagement';

type ActiveView = 'blogs' | 'files' | 'users' | 'profile';

export function Dashboard() {
  // 设置页面标题
  useTitle('管理中心');
  
  const [activeView, setActiveView] = useState<ActiveView>('blogs');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // This effect can remain if there are other user-dependent actions in the future.
  }, [user, authLoading]);

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

  const renderContent = () => {
    switch (activeView) {
      case 'blogs':
        return <BlogManagement user={user} />;
      case 'files':
        return <FileManagement />;
      case 'users':
        return <UserManagement />;
      case 'profile':
        return <ProfileManagement />;
      default:
        return <BlogManagement user={user} />;
    }
  };

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
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setActiveView('blogs')}
                  className="justify-start"
                  variant={activeView === 'blogs' ? 'default' : 'outline'}
                >
                  <Newspaper className="w-4 h-4 mr-2" />
                  文章管理
                </Button>
                <Button 
                  onClick={() => setActiveView('files')}
                  className="justify-start"
                  variant={activeView === 'files' ? 'default' : 'outline'}
                >
                  <File className="w-4 h-4 mr-2" />
                  文件管理
                </Button>
                <Button
                  onClick={() => setActiveView('profile')}
                  className="justify-start"
                  variant={activeView === 'profile' ? 'default' : 'outline'}
                >
                  <User className="w-4 h-4 mr-2" />
                  账户设置
                </Button>
                {/* Admin Section - Only visible to admins */}
                {user.role === 'admin' && (
                  <Button 
                    onClick={() => setActiveView('users')}
                    className="justify-start"
                    variant={activeView === 'users' ? 'default' : 'outline'}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    用户管理
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Main Content */}
        <div className="col-span-1 lg:col-span-4">
          {renderContent()}
        </div>
        
      </div>
    </div>
  );
}
