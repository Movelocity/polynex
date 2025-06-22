import React from 'react';
import { Link} from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/x-ui/dropdown-menu';
import { Input } from '@/components/x-ui/input';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Search, 
  PenTool, 
  Settings,
  Home,
  Menu,
  X,
  FileText,
  Wrench
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user/UserAvatar';

interface HeadBannerProps {
  isAuthenticated: boolean;
  user: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  handleSearch: (e: React.FormEvent) => void;
  handleLogout: () => void;
  isActivePath: (path: string) => boolean;
  navigate: (path: string) => void;
  location: any;
}

export function HeadBanner({
  isAuthenticated,
  user,
  searchQuery,
  setSearchQuery,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleSearch,
  handleLogout,
  isActivePath,
  navigate,
  location
}: HeadBannerProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FastDraft
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link 
              to="/" 
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                isActivePath('/') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>首页</span>
            </Link>
            
            {/* <Link 
              to="/articles" 
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                isActivePath('/articles') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>文章</span>
            </Link> */}
            
            <Link 
              to="/tools" 
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/tools') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>工具</span>
            </Link>
            
            {isAuthenticated && (
              <>
                <Link 
                  to="/write" 
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActivePath('/write') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>写文章</span>
                </Link>
                
                <Link 
                  to="/dashboard" 
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActivePath('/dashboard') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>管理</span>
                </Link>
              </>
            )}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索公开博客..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-slate-50 border-slate-200 focus:bg-white"
              />
            </form>
          </div>

          {/* User Menu or Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div>
                    <UserAvatar 
                      user={user}
                      size="md"
                      clickable
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.username}</p>
                      <p className="w-[200px] truncate text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>我的文章</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/write')}>
                    <PenTool className="mr-2 h-4 w-4" />
                    <span>写博客</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>账户设置</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  登录
                </Button>
                <Button onClick={() => navigate('/register')}>
                  注册
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="搜索博客..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
            </form>

            {/* Mobile Navigation */}
            <nav className="space-y-2">
              <Link 
                to="/" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                <span>首页</span>
              </Link>
              
              <Link 
                to="/articles" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FileText className="w-4 h-4" />
                <span>文章</span>
              </Link>
              
              <Link 
                to="/tools" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Wrench className="w-4 h-4" />
                <span>工具</span>
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/write" 
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <PenTool className="w-4 h-4" />
                    <span>写博客</span>
                  </Link>
                  
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>管理</span>
                  </Link>
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    登录
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      navigate('/register');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    注册
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}