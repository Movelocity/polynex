import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '@/types';
import { UserStorage, generateId } from '@/utils/storage';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<boolean>;
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

  // 初始化时检查本地存储的登录状态
  useEffect(() => {
    const currentUser = UserStorage.getCurrentUser();
    if (currentUser) {
      setAuthState({
        isAuthenticated: true,
        user: currentUser,
      });
    }
  }, []);

  // 登录函数
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const user = UserStorage.findUserByEmail(email);
      
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      if (user.password !== password) {
        return { success: false, message: '密码错误' };
      }

      // 登录成功
      const authUser = { ...user };
      delete (authUser as any).password; // 移除密码字段

      setAuthState({
        isAuthenticated: true,
        user: authUser as User,
      });

      UserStorage.setCurrentUser(authUser as User);
      
      return { success: true, message: '登录成功' };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  };

  // 注册函数
  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 检查用户名是否已存在
      if (UserStorage.findUserByUsername(username)) {
        return { success: false, message: '用户名已存在' };
      }

      // 检查邮箱是否已存在
      if (UserStorage.findUserByEmail(email)) {
        return { success: false, message: '邮箱已被注册' };
      }

      // 创建新用户
      const newUser: User = {
        id: generateId(),
        username,
        email,
        password,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        registerTime: new Date().toISOString(),
      };

      UserStorage.addUser(newUser);

      // 自动登录
      const authUser = { ...newUser };
      delete (authUser as any).password;

      setAuthState({
        isAuthenticated: true,
        user: authUser as User,
      });

      UserStorage.setCurrentUser(authUser as User);

      return { success: true, message: '注册成功' };
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  };

  // 登出函数
  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
    });
    UserStorage.setCurrentUser(null);
  };

  // 更新用户信息
  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!authState.user) return false;

    try {
      const success = UserStorage.updateUser(authState.user.id, updates);
      if (success) {
        const updatedUser = { ...authState.user, ...updates };
        setAuthState({
          isAuthenticated: true,
          user: updatedUser,
        });
        UserStorage.setCurrentUser(updatedUser);
      }
      return success;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
