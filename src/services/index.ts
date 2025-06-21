// 导出所有接口
export * from './interfaces/IUserService';
export * from './interfaces/IBlogService';
export * from './interfaces/ICategoryService';

// 导出服务实现
export * from './localStorage/UserStorageService';
export * from './localStorage/BlogStorageService';
export * from './localStorage/CategoryStorageService';

export * from './api/UserApiService';
export * from './api/BlogApiService';
export * from './api/CategoryApiService';
export * from './api/ApiClient';

// 导出服务工厂
export * from './ServiceFactory';

// 导出便捷访问方法
import { ServiceFactory } from './ServiceFactory';

const serviceFactory = ServiceFactory.getInstance();

/**
 * 获取用户服务实例
 */
export const userService = serviceFactory.getUserService();

/**
 * 获取博客服务实例
 */
export const blogService = serviceFactory.getBlogService();

/**
 * 获取分类服务实例
 */
export const categoryService = serviceFactory.getCategoryService();

/**
 * 获取服务工厂实例
 */
export const getServiceFactory = () => serviceFactory; 