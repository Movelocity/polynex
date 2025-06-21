import { Category } from '@/types';
import { ICategoryService } from '../interfaces/ICategoryService';
import { CategoryStorage, generateId } from '@/utils/storage';

/**
 * 基于localStorage的分类服务实现
 * 包装现有的CategoryStorage类，提供异步接口
 */
export class CategoryStorageService implements ICategoryService {
  async getCategories(): Promise<Category[]> {
    return CategoryStorage.getCategories();
  }

  async saveCategories(categories: Category[]): Promise<void> {
    CategoryStorage.saveCategories(categories);
  }

  async updateCategoryCounts(): Promise<void> {
    CategoryStorage.updateCategoryCounts();
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return CategoryStorage.getCategoryByName(name);
  }

  async addCategory(category: Category): Promise<void> {
    const categories = CategoryStorage.getCategories();
    categories.push(category);
    CategoryStorage.saveCategories(categories);
  }

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<boolean> {
    const categories = CategoryStorage.getCategories();
    const index = categories.findIndex(c => c.id === categoryId);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      CategoryStorage.saveCategories(categories);
      return true;
    }
    return false;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const categories = CategoryStorage.getCategories();
    const filteredCategories = categories.filter(c => c.id !== categoryId);
    if (filteredCategories.length !== categories.length) {
      CategoryStorage.saveCategories(filteredCategories);
      return true;
    }
    return false;
  }
} 