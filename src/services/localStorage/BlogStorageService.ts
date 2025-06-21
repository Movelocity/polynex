import { Blog } from '@/types';
import { IBlogService } from '../interfaces/IBlogService';
import { BlogStorage } from '@/utils/storage';

/**
 * 基于localStorage的博客服务实现
 * 包装现有的BlogStorage类，提供异步接口
 */
export class BlogStorageService implements IBlogService {
  async getBlogs(): Promise<Blog[]> {
    return BlogStorage.getBlogs();
  }

  async saveBlogs(blogs: Blog[]): Promise<void> {
    BlogStorage.saveBlogs(blogs);
  }

  async addBlog(blog: Blog): Promise<void> {
    BlogStorage.addBlog(blog);
  }

  async updateBlog(blogId: string, updates: Partial<Blog>): Promise<boolean> {
    return BlogStorage.updateBlog(blogId, updates);
  }

  async deleteBlog(blogId: string): Promise<boolean> {
    return BlogStorage.deleteBlog(blogId);
  }

  async getBlogById(blogId: string): Promise<Blog | undefined> {
    return BlogStorage.getBlogById(blogId);
  }

  async getBlogsByAuthor(authorId: string): Promise<Blog[]> {
    return BlogStorage.getBlogsByAuthor(authorId);
  }

  async getBlogsByCategory(category: string): Promise<Blog[]> {
    return BlogStorage.getBlogsByCategory(category);
  }

  async getPublishedBlogs(): Promise<Blog[]> {
    return BlogStorage.getPublishedBlogs();
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    return BlogStorage.searchBlogs(query);
  }

  async incrementViews(blogId: string): Promise<void> {
    BlogStorage.incrementViews(blogId);
  }
} 