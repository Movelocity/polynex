import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClientUser, AuthState } from '@/types';
import { userService } from '@/services';
import { apiClient } from '@/services/api/ApiClient';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (userOrUpdates: ClientUser | Partial<ClientUser>) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  // 设置API客户端的未授权回调
  useEffect(() => {
    apiClient.setUnauthorizedCallback(() => {
      // token过期或无效，强制登出
      handleLogout();
    });
  }, []);

  // 初始化时检查本地存储的登录状态和token有效性
  useEffect(() => {
    initializeAuth();
    
    // 监听localStorage变化，处理跨标签页认证状态同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'current_user') {
        // 当token或用户信息在其他标签页中被修改时，重新初始化认证状态
        console.log('检测到认证状态变化，重新初始化');
        initializeAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const initializeAuth = async () => {
    setLoading(true);
    try {
      // 检查localStorage中的用户信息
      const currentUser = userService.getCurrentUser();
      const token = apiClient.getToken();

      if (currentUser && token) {
        // 验证token是否仍然有效
        const validation = await userService.validateToken();
        if (validation.valid && validation.user) {
          console.log('token有效，设置认证状态');
          setAuthState({
            isAuthenticated: true,
            user: validation.user,
          });
        } else {
          // token无效，清除本地数据
          console.log('token无效，清除本地数据');
          handleLogout();
        }
      } else {
        // 没有本地认证信息
        console.log('没有本地认证信息');
        setAuthState({
          isAuthenticated: false,
          user: null,
        });
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error);
      // 初始化失败，清除本地数据
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  // 登录函数
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await userService.login(email, password);

      if (response.success && response.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.user,
        });
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  };

  // 注册函数
  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await userService.register(username, email, password);

      if (response.success && response.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.user,
        });
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  // 登出函数
  const logout = () => {
    handleLogout();
  };

  // 内部登出处理函数
  const handleLogout = async () => {
    try {
      await userService.logout();
    } catch (error) {
      console.error('登出API调用失败:', error);
      // 即使API调用失败，也要清除本地状态
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
      });
    }
  };

  // 更新用户信息
  const updateUser = async (userOrUpdates: ClientUser | Partial<ClientUser>): Promise<boolean> => {
    if (!authState.user) return false;

    try {
      // 如果传入的是完整的用户对象（包含id），直接使用
      if ('id' in userOrUpdates && userOrUpdates.id) {
        setAuthState({
          isAuthenticated: true,
          user: userOrUpdates as ClientUser,
        });
        return true;
      }
      
      // 否则作为更新字段处理
      const updates = userOrUpdates as Partial<ClientUser>;
      const success = await userService.updateUser(authState.user.id, updates);
      if (success) {
        const updatedUser = { ...authState.user, ...updates };
        setAuthState({
          isAuthenticated: true,
          user: updatedUser,
        });
      }
      return success;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  };

  // 更新密码
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!authState.user) {
      return { success: false, message: '用户未登录' };
    }

    try {
      const result = await userService.updatePassword(currentPassword, newPassword);
      return result;
    } catch (error) {
      console.error('更新密码失败:', error);
      return { success: false, message: '更新密码失败，请稍后重试' };
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
    updatePassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
