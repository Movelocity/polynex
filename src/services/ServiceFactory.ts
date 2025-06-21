import { IUserService } from './interfaces/IUserService';
import { IBlogService } from './interfaces/IBlogService';
import { ICategoryService } from './interfaces/ICategoryService';

import { UserStorageService } from './localStorage/UserStorageService';
import { BlogStorageService } from './localStorage/BlogStorageService';
import { CategoryStorageService } from './localStorage/CategoryStorageService';

import { UserApiService } from './api/UserApiService';
import { BlogApiService } from './api/BlogApiService';
import { CategoryApiService } from './api/CategoryApiService';
import { apiClient } from './api/ApiClient';

/**
 * 存储类型
 */
export type StorageType = 'localStorage' | 'api';

/**
 * 服务工厂类
 * 根据环境变量配置返回相应的服务实现
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private storageType: StorageType;

  private userService: IUserService;
  private blogService: IBlogService;
  private categoryService: ICategoryService;

  private constructor() {
    // 从环境变量读取存储类型，默认为localStorage
    this.storageType = (import.meta.env.VITE_STORAGE_TYPE as StorageType) || 'localStorage';
    
    // 初始化服务实例
    this.initializeServices();
  }

  /**
   * 获取服务工厂实例（单例模式）
   */
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * 初始化服务实例
   */
  private initializeServices(): void {
    console.log(`初始化服务：存储类型 = ${this.storageType}`);

    if (this.storageType === 'api') {
      // 使用API实现
      this.userService = new UserApiService(apiClient);
      this.blogService = new BlogApiService(apiClient);
      this.categoryService = new CategoryApiService(apiClient);
    } else {
      // 使用localStorage实现
      this.userService = new UserStorageService();
      this.blogService = new BlogStorageService();
      this.categoryService = new CategoryStorageService();
    }
  }

  /**
   * 获取用户服务
   */
  public getUserService(): IUserService {
    return this.userService;
  }

  /**
   * 获取博客服务
   */
  public getBlogService(): IBlogService {
    return this.blogService;
  }

  /**
   * 获取分类服务
   */
  public getCategoryService(): ICategoryService {
    return this.categoryService;
  }

  /**
   * 获取当前存储类型
   */
  public getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * 动态切换存储类型（用于测试或特殊需求）
   */
  public switchStorageType(newType: StorageType): void {
    if (this.storageType !== newType) {
      this.storageType = newType;
      this.initializeServices();
      console.log(`已切换存储类型到：${newType}`);
    }
  }
} 