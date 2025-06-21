import { User } from '@/types';
import { IUserService } from '../interfaces/IUserService';
import { ApiClient, ApiError } from './ApiClient';

/**
 * 基于HTTP API的用户服务实现
 */
export class UserApiService implements IUserService {
  private apiClient: ApiClient;

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
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.apiClient.get<User>('/users/current');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  }

  async setCurrentUser(user: User | null): Promise<void> {
    if (user) {
      // 这个方法在API版本中通常不需要，因为当前用户信息由认证token确定
      // 但为了接口一致性，我们保留它
      console.warn('setCurrentUser in API mode: user context is managed by authentication token');
    } else {
      // 登出
      this.apiClient.setToken(null);
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

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.apiClient.post<{ user: User; token: string }>('/auth/login', {
        email,
        password
      });

      // 保存认证token
      this.apiClient.setToken(response.token);

      return {
        success: true,
        user: response.user
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: '登录失败'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/auth/logout');
    } catch (error) {
      // 即使服务器端登出失败，也要清除本地token
      console.error('Server logout failed:', error);
    } finally {
      this.apiClient.setToken(null);
    }
  }

  async register(userData: Omit<User, 'id' | 'registerTime'>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.apiClient.post<{ user: User; token?: string }>('/auth/register', userData);

      // 如果注册成功后自动登录，保存token
      if (response.token) {
        this.apiClient.setToken(response.token);
      }

      return {
        success: true,
        user: response.user
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: '注册失败'
      };
    }
  }
} 