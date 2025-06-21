import { Category } from '@/types';

/**
 * 分类服务接口
 * 定义分类相关的所有服务方法
 */
export interface ICategoryService {
  /**
   * 获取所有分类
   */
  getCategories(): Promise<Category[]>;

  /**
   * 保存分类列表（批量操作）
   */
  saveCategories(categories: Category[]): Promise<void>;

  /**
   * 更新分类计数
   */
  updateCategoryCounts(): Promise<void>;

  /**
   * 根据名称获取分类
   */
  getCategoryByName(name: string): Promise<Category | undefined>;

  /**
   * 添加新分类
   */
  addCategory(category: Category): Promise<void>;

  /**
   * 更新分类信息
   */
  updateCategory(categoryId: string, updates: Partial<Category>): Promise<boolean>;

  /**
   * 删除分类
   */
  deleteCategory(categoryId: string): Promise<boolean>;
} 