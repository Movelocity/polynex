import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <Card className="w-full max-w-md text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8">
          {/* 404 Illustration */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-4">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              404
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            页面未找到
          </h1>
          <p className="text-slate-600 mb-8">
            抱歉，您访问的页面不存在或已被移动。
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上页
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/search')}
              className="w-full"
              size="lg"
            >
              <Search className="w-4 h-4 mr-2" />
              搜索内容
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-3">您可能想要访问：</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="link" size="sm" onClick={() => navigate('/')}>
                首页
              </Button>
              <Button variant="link" size="sm" onClick={() => navigate('/write')}>
                写文章
              </Button>
              <Button variant="link" size="sm" onClick={() => navigate('/category/技术')}>
                技术文章
              </Button>
              <Button variant="link" size="sm" onClick={() => navigate('/category/生活')}>
                生活分享
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
