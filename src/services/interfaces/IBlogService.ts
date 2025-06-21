import { Blog } from '@/types';

/**
 * 博客服务接口
 * 定义博客相关的所有服务方法
 */
export interface IBlogService {
  /**
   * 获取所有博客
   */
  getBlogs(): Promise<Blog[]>;

  /**
   * 保存博客列表（批量操作）
   */
  saveBlogs(blogs: Blog[]): Promise<void>;

  /**
   * 添加新博客
   */
  addBlog(blog: Blog): Promise<Blog>;

  /**
   * 更新博客
   */
  updateBlog(blogId: string, updates: Partial<Blog>): Promise<boolean>;

  /**
   * 删除博客
   */
  deleteBlog(blogId: string): Promise<boolean>;

  /**
   * 根据ID获取博客
   */
  getBlogById(blogId: string): Promise<Blog | undefined>;

  /**
   * 获取指定作者的博客
   */
  getBlogsByAuthor(authorId: string): Promise<Blog[]>;

  /**
   * 获取指定分类的博客
   */
  getBlogsByCategory(category: string): Promise<Blog[]>;

  /**
   * 获取已发布的博客
   */
  getPublishedBlogs(): Promise<Blog[]>;

  /**
   * 搜索博客
   */
  searchBlogs(query: string): Promise<Blog[]>;

  /**
   * 增加博客浏览量
   */
  incrementViews(blogId: string): Promise<void>;
} 