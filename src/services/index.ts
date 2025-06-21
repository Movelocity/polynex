// 导出接口类型
export * from './interfaces/IUserService';
export * from './interfaces/IBlogService';
export * from './interfaces/ICategoryService';

// 导出API实现和客户端
export * from './api/UserApiService';
export * from './api/BlogApiService';
export * from './api/CategoryApiService';
export * from './api/FileApiService';
export * from './api/ApiClient';

// 直接导出API服务实例
import { UserApiService } from './api/UserApiService';
import { BlogApiService } from './api/BlogApiService';
import { CategoryApiService } from './api/CategoryApiService';
import { FileApiService } from './api/FileApiService';
import { apiClient } from './api/ApiClient';

/**
 * 用户服务实例
 */
export const userService = new UserApiService(apiClient);

/**
 * 博客服务实例
 */
export const blogService = new BlogApiService(apiClient);

/**
 * 分类服务实例
 */
export const categoryService = new CategoryApiService(apiClient);

/**
 * 文件服务实例
 */
export const fileService = new FileApiService(apiClient);

/**
 * API客户端实例
 */
export { apiClient }; 