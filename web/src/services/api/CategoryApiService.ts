import { Category } from '@/types';
import { ICategoryService } from '../interfaces/ICategoryService';
import { ApiClient, ApiError } from './ApiClient';

/**
 * 基于HTTP API的分类服务实现
 */
export class CategoryApiService implements ICategoryService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async getCategories(): Promise<Category[]> {
    return await this.apiClient.get<Category[]>('/categories');
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.apiClient.post('/categories/batch', { categories });
  }

  async updateCategoryCounts(): Promise<void> {
    await this.apiClient.put('/categories/counts');
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    try {
      return await this.apiClient.get<Category>(`/categories/${encodeURIComponent(name)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async addCategory(category: Category): Promise<void> {
    await this.apiClient.post('/categories', category);
  }

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<boolean> {
    try {
      await this.apiClient.put(`/categories/${categoryId}`, updates);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/categories/${categoryId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }
} 