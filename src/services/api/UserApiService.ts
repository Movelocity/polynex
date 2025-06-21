import { User, ClientUser, LoginRequest, RegisterRequest, AuthResponse } from '@/types';
import { IUserService } from '../interfaces/IUserService';
import { ApiClient, ApiError } from './ApiClient';

/**
 * 基于HTTP API的用户服务实现
 */
export class UserApiService implements IUserService {
  private apiClient: ApiClient;
  private readonly USER_STORAGE_KEY = 'current_user';

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async getUsers(): Promise<User[]> {
    return await this.apiClient.get<User[]>('/users');
  }

  async saveUsers(users: User[]): Promise<void> {
    await this.apiClient.post('/users/batch', { users });
  }

  async addUser(user: User): Promise<void> {
    await this.apiClient.post('/users', user);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      await this.apiClient.put(`/users/${userId}`, updates);
      
      // 如果更新的是当前用户，同步更新localStorage
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedUser: ClientUser = { ...currentUser, ...updates };
        this.setCurrentUser(updatedUser);
      }
      
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取当前登录用户（从localStorage）
   */
  getCurrentUser(): ClientUser | null {
    try {
      const userStr = localStorage.getItem(this.USER_STORAGE_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to get current user from localStorage:', error);
      return null;
    }
  }

  /**
   * 设置当前登录用户（到localStorage）
   */
  setCurrentUser(user: ClientUser | null): void {
    try {
      if (user) {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.USER_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to set current user in localStorage:', error);
    }
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    try {
      return await this.apiClient.get<User>(`/users/by-email/${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    try {
      return await this.apiClient.get<User>(`/users/by-username/${encodeURIComponent(username)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.loginWithRequest({ email, password });
  }

  async loginWithRequest(request: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<{ user: ClientUser; token: string }>('/auth/login', request);

      // 保存认证token和用户信息
      this.apiClient.setToken(response.token);
      this.setCurrentUser(response.user);

      return {
        success: true,
        message: '登录成功',
        token: response.token,
        user: response.user
      };
    } catch (error) {
      let message = '登录失败';
      if (error instanceof ApiError) {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // 尝试通知服务器登出
      await this.apiClient.post('/auth/logout');
    } catch (error) {
      // 即使服务器端登出失败，也要清除本地数据
      console.error('Server logout failed:', error);
    } finally {
      // 清除本地认证信息
      this.apiClient.setToken(null);
      this.setCurrentUser(null);
    }
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return this.registerWithRequest({ username, email, password });
  }

  async registerWithRequest(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<{ user: ClientUser; token: string }>('/auth/register', request);

      // 保存认证token和用户信息
      this.apiClient.setToken(response.token);
      this.setCurrentUser(response.user);

      return {
        success: true,
        message: '注册成功',
        token: response.token,
        user: response.user
      };
    } catch (error) {
      let message = '注册失败';
      if (error instanceof ApiError) {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    }
  }

  async validateToken(): Promise<{ valid: boolean; user?: ClientUser }> {
    try {
      const user = await this.apiClient.get<ClientUser>('/auth/validate');
      
      // 更新本地用户信息
      this.setCurrentUser(user);
      
      return {
        valid: true,
        user
      };
    } catch (error) {
      // token无效，清除本地数据
      this.apiClient.setToken(null);
      this.setCurrentUser(null);
      
      return {
        valid: false
      };
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.apiClient.put('/auth/password', {
        currentPassword,
        newPassword
      });

      return {
        success: true,
        message: '密码更新成功'
      };
    } catch (error) {
      let message = '密码更新失败';
      if (error instanceof ApiError) {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    }
  }

  async uploadAvatar(file: File | Blob): Promise<{ success: boolean; message: string; user?: ClientUser; avatarUrl?: string }> {
    try {
      // 创建FormData对象
      const formData = new FormData();
      // FormData可以接受Blob或File
      formData.append('file', file, 'avatar.jpg');

      // 使用fetch直接发送，因为ApiClient可能不支持FormData
      const baseURL = (this.apiClient as any).baseURL || 'http://localhost:8765/api';
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseURL}/users/avatar/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new ApiError(response.status, errorData.message || 'Upload failed');
      }

      const result = await response.json();

      // 更新本地用户信息
      if (result.user) {
        this.setCurrentUser(result.user);
      }

      return {
        success: true,
        message: result.message || '头像上传成功',
        user: result.user,
        avatarUrl: result.avatar_url
      };
    } catch (error) {
      let message = '头像上传失败';
      if (error instanceof ApiError) {
        message = error.message;
      }
      return {
        success: false,
        message
      };
    }
  }
}