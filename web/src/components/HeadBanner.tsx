import React from 'react';
import { Link} from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/x-ui/dropdown-menu';
import { Input } from '@/components/x-ui/input';
// import { Switch } from '@/components/x-ui/switch';
import { 
  User, 
  LogOut, 
  Search, 
  Settings,
  Home,
  Menu,
  X,
  FileText,
  Wrench,
  Sun,
  Moon
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user/UserAvatar';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import cn from 'classnames';

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
  const { isDark, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  // fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700 transition-transform duration-300 translate-y-0
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("flex justify-between items-center h-16", isMobile && "pl-8")}>
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group mr-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-theme-blue to-theme-purple bg-clip-text text-transparent">
              POLYNEX
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link 
              to="/" 
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                isActivePath('/') 
                  ? 'bg-theme-blue/10 text-theme-blue' 
                  : 'text-foreground hover:text-theme-blue hover:bg-theme-blue/5'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>首页</span>
            </Link>
            
            <Link 
              to="/tools" 
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/tools') 
                  ? 'bg-theme-blue/10 text-theme-blue' 
                  : 'text-foreground hover:text-theme-blue hover:bg-theme-blue/5'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>探索</span>
            </Link>
            
            {isAuthenticated && (
              <Link 
                to="/dashboard" 
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  isActivePath('/dashboard') 
                    ? 'bg-theme-blue/10 text-theme-blue' 
                    : 'text-foreground hover:text-theme-blue hover:bg-theme-blue/5'
                }`}
              >
                <User className="w-4 h-4" />
                <span>管理</span>
              </Link>
            )}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-4">

            {/* Theme Toggle */}
            <div className="items-center space-x-2 cursor-pointer" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </div>

            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="搜索公开博客..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-muted border-border focus:bg-background text-foreground"
                />
              </form>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {/* User Menu or Auth Buttons */}
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
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
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
                <Button onClick={() => navigate('/login')}>
                  登录
                </Button>
                <Button variant="outline" onClick={() => navigate('/register')}>
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">

            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                <span>首页</span>
              </Link>
              
              <Link 
                to="/articles" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FileText className="w-4 h-4" />
                <span>文章</span>
              </Link>
              
              <Link 
                to="/tools" 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Wrench className="w-4 h-4" />
                <span>探索</span>
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>管理</span>
                  </Link>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    登录
                  </Button>
                  <Button 
                    variant="outline" 
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