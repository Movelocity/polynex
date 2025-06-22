import { User, ClientUser } from '@/types';
import { ApiClient, ApiError } from './ApiClient';

/**
 * 管理员API服务 - 提供用户管理功能
 */
export class AdminApiService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 获取所有用户列表（管理员专用）
   */
  async getAllUsers(): Promise<ClientUser[]> {
    return await this.apiClient.get<ClientUser[]>('/admin/users');
  }

  /**
   * 更新用户角色（管理员专用）
   */
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      await this.apiClient.put(`/admin/users/${userId}/role`, { role });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 删除用户（管理员专用）
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/admin/users/${userId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 重置用户密码（管理员专用）
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      await this.apiClient.put(`/admin/users/${userId}/password`, { password: newPassword });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取用户统计信息（管理员专用）
   */
  async getUserStats(): Promise<{
    total: number;
    admins: number;
    users: number;
  }> {
    return await this.apiClient.get('/admin/users/stats');
  }

  /**
   * 更新用户信息（管理员专用）
   */
  async updateUserInfo(userId: string, updates: {
    username?: string;
    email?: string;
    role?: 'admin' | 'user';
  }): Promise<boolean> {
    try {
      await this.apiClient.put(`/admin/users/${userId}`, updates);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }
} 