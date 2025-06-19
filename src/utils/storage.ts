import { User, Blog, Category } from '@/types';

// localStorage 键名常量
const STORAGE_KEYS = {
  USERS: 'blog_users',
  BLOGS: 'blog_posts',
  CATEGORIES: 'blog_categories',
  CURRENT_USER: 'current_user',
};

// 通用存储工具函数
class StorageUtil {
  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('存储数据失败:', error);
    }
  }

  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('读取数据失败:', error);
      return defaultValue;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('删除数据失败:', error);
    }
  }
}

// 用户相关存储操作
export class UserStorage {
  static getUsers(): User[] {
    return StorageUtil.getItem(STORAGE_KEYS.USERS, []);
  }

  static saveUsers(users: User[]): void {
    StorageUtil.setItem(STORAGE_KEYS.USERS, users);
  }

  static addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  }

  static updateUser(userId: string, updates: Partial<User>): boolean {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  static getCurrentUser(): User | null {
    return StorageUtil.getItem(STORAGE_KEYS.CURRENT_USER, null);
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      StorageUtil.setItem(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      StorageUtil.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static findUserByEmail(email: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.email === email);
  }

  static findUserByUsername(username: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.username === username);
  }
}

// 博客相关存储操作
export class BlogStorage {
  static getBlogs(): Blog[] {
    return StorageUtil.getItem(STORAGE_KEYS.BLOGS, []);
  }

  static saveBlogs(blogs: Blog[]): void {
    StorageUtil.setItem(STORAGE_KEYS.BLOGS, blogs);
  }

  static addBlog(blog: Blog): void {
    const blogs = this.getBlogs();
    blogs.unshift(blog); // 新博客添加到开头
    this.saveBlogs(blogs);
  }

  static updateBlog(blogId: string, updates: Partial<Blog>): boolean {
    const blogs = this.getBlogs();
    const index = blogs.findIndex(b => b.id === blogId);
    if (index !== -1) {
      blogs[index] = { ...blogs[index], ...updates, updateTime: new Date().toISOString() };
      this.saveBlogs(blogs);
      return true;
    }
    return false;
  }

  static deleteBlog(blogId: string): boolean {
    const blogs = this.getBlogs();
    const filteredBlogs = blogs.filter(b => b.id !== blogId);
    if (filteredBlogs.length !== blogs.length) {
      this.saveBlogs(filteredBlogs);
      return true;
    }
    return false;
  }

  static getBlogById(blogId: string): Blog | undefined {
    const blogs = this.getBlogs();
    return blogs.find(b => b.id === blogId);
  }

  static getBlogsByAuthor(authorId: string): Blog[] {
    const blogs = this.getBlogs();
    return blogs.filter(b => b.authorId === authorId);
  }

  static getBlogsByCategory(category: string): Blog[] {
    const blogs = this.getBlogs();
    return blogs.filter(b => b.category === category && b.status === 'published');
  }

  static getPublishedBlogs(): Blog[] {
    const blogs = this.getBlogs();
    return blogs.filter(b => b.status === 'published').sort((a, b) => 
      new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }

  static searchBlogs(query: string): Blog[] {
    const blogs = this.getPublishedBlogs();
    const searchTerm = query.toLowerCase();
    return blogs.filter(blog => 
      blog.title.toLowerCase().includes(searchTerm) ||
      blog.content.toLowerCase().includes(searchTerm) ||
      blog.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  static incrementViews(blogId: string): void {
    const blogs = this.getBlogs();
    const index = blogs.findIndex(b => b.id === blogId);
    if (index !== -1) {
      blogs[index].views += 1;
      this.saveBlogs(blogs);
    }
  }
}

// 分类相关存储操作
export class CategoryStorage {
  static getCategories(): Category[] {
    const categories = StorageUtil.getItem(STORAGE_KEYS.CATEGORIES, []);
    // 如果没有分类数据，初始化默认分类
    if (categories.length === 0) {
      const defaultCategories: Category[] = [
        { id: '1', name: '技术', description: '技术相关文章', count: 0 },
        { id: '2', name: '生活', description: '生活随笔', count: 0 },
        { id: '3', name: '旅行', description: '旅行见闻', count: 0 },
        { id: '4', name: '美食', description: '美食分享', count: 0 },
        { id: '5', name: '读书', description: '读书笔记', count: 0 },
        { id: '6', name: '随想', description: '随想杂谈', count: 0 },
      ];
      this.saveCategories(defaultCategories);
      return defaultCategories;
    }
    return categories;
  }

  static saveCategories(categories: Category[]): void {
    StorageUtil.setItem(STORAGE_KEYS.CATEGORIES, categories);
  }

  static updateCategoryCounts(): void {
    const categories = this.getCategories();
    const blogs = BlogStorage.getPublishedBlogs();
    
    // 重置计数
    categories.forEach(category => {
      category.count = blogs.filter(blog => blog.category === category.name).length;
    });
    
    this.saveCategories(categories);
  }

  static getCategoryByName(name: string): Category | undefined {
    const categories = this.getCategories();
    return categories.find(c => c.name === name);
  }
}

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 格式化日期
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 生成摘要
export function generateSummary(content: string, maxLength: number = 150): string {
  // 移除markdown语法
  const plainText = content.replace(/[#*_`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return plainText.length > maxLength 
    ? plainText.substring(0, maxLength) + '...'
    : plainText;
}
