import { Blog } from '@/types';
import { IBlogService } from '../interfaces/IBlogService';
import { ApiClient, ApiError } from './ApiClient';

/**
 * 基于HTTP API的博客服务实现
 */
export class BlogApiService implements IBlogService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async getBlogs(): Promise<Blog[]> {
    return await this.apiClient.get<Blog[]>('/blogs');
  }

  async saveBlogs(blogs: Blog[]): Promise<void> {
    await this.apiClient.post('/blogs/batch', { blogs });
  }

  async addBlog(blog: Blog): Promise<void> {
    await this.apiClient.post('/blogs', blog);
  }

  async updateBlog(blogId: string, updates: Partial<Blog>): Promise<boolean> {
    try {
      await this.apiClient.put(`/blogs/${blogId}`, updates);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async deleteBlog(blogId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/blogs/${blogId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getBlogById(blogId: string): Promise<Blog | undefined> {
    try {
      return await this.apiClient.get<Blog>(`/blogs/${blogId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async getBlogsByAuthor(authorId: string): Promise<Blog[]> {
    return await this.apiClient.get<Blog[]>(`/blogs/author/${authorId}`);
  }

  async getBlogsByCategory(category: string): Promise<Blog[]> {
    return await this.apiClient.get<Blog[]>(`/blogs/category/${encodeURIComponent(category)}`);
  }

  async getPublishedBlogs(): Promise<Blog[]> {
    return await this.apiClient.get<Blog[]>('/blogs/published');
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    return await this.apiClient.get<Blog[]>('/blogs/search', { q: query });
  }

  async incrementViews(blogId: string): Promise<void> {
    await this.apiClient.post(`/blogs/${blogId}/views`);
  }
} 