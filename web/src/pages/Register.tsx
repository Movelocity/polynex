import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { useTitle } from '@/hooks/usePageTitle';
import { Loader2, Mail, Lock, User, BookOpen, Eye, EyeOff, Key } from 'lucide-react';
import { userService } from '@/services';
import { RegistrationConfig } from '@/types';

export function Register() {
  // 设置页面标题
  useTitle('注册');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>({
    allow_registration: true,
    require_invite_code: false
  });
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // 获取注册配置
  useEffect(() => {
    const fetchRegistrationConfig = async () => {
      try {
        const config = await userService.getRegistrationConfig();
        setRegistrationConfig(config);
      } catch (error) {
        console.error('获取注册配置失败:', error);
        // 使用默认配置
      } finally {
        setConfigLoading(false);
      }
    };

    fetchRegistrationConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除错误信息
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('请输入用户名');
      return false;
    }
    
    if (formData.username.length < 2) {
      setError('用户名至少需要2个字符');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('请输入邮箱');
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }
    
    if (!formData.password) {
      setError('请输入密码');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    // 验证邀请码
    if (registrationConfig.require_invite_code && !formData.inviteCode.trim()) {
      setError('请输入邀请码');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const inviteCode = registrationConfig.require_invite_code ? formData.inviteCode : undefined;
      const result = await register(formData.username, formData.email, formData.password, inviteCode);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果正在加载配置，显示加载状态
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // 如果不允许注册，显示提示信息
  if (!registrationConfig.allow_registration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">注册暂停</CardTitle>
            <CardDescription>
              当前网站暂时不开放新用户注册
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link to="/login">
              <Button variant="outline">返回登录</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center flex items-center justify-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            加入我们
          </span>          
        </div>

        <Card className="shadow-xl border-0 bg-background backdrop-blur-sm">
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* 邮箱 - 移到第一位，作为主要账户标识 */}
              <div>
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="username email"
                  />
                </div>
              </div>

              {/* 用户名 - 移到第二位，标记为昵称 */}
              <div>
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="nickname"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 确认密码 */}
              <div>
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 邀请码（根据配置显示） */}
              {registrationConfig.require_invite_code && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">邀请码</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="inviteCode"
                      name="inviteCode"
                      type="text"
                      placeholder="请输入邀请码"
                      value={formData.inviteCode}
                      onChange={handleChange}
                      className="pl-10"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                variant="pretty"
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </Button>
              
              <div className="text-center text-sm text-slate-600">
                已有账户？{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  立即登录
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Tips */}
        <Card className="my-6 bg-theme-blue/20 border-theme-blue/50">
          <CardContent className="py-6">
            <div className="text-sm text-theme-blue">
              <ul className="space-y-1 text-theme-blue">
                <li>• 用户名至少2个字符</li>
                <li>• 密码至少6个字符</li>
                <li>• 请使用真实有效的邮箱地址</li>
                {registrationConfig.require_invite_code && (
                  <li>• 需要有效的邀请码才能注册</li>
                )}
                <li>• 注册后即可开始创作您的博客</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
