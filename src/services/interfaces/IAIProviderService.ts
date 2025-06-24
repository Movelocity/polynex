import {
  AIProviderConfig,
  AIProviderConfigCreate,
  AIProviderConfigUpdate,
  TestProviderRequest,
  TestProviderResponse
} from '@/types';

/**
 * AI供应商服务接口
 * 定义AI供应商配置管理的所有服务方法
 */
export interface IAIProviderService {
  /**
   * 获取所有AI供应商配置
   * 需要用户权限
   */
  getAllProviders(): Promise<AIProviderConfig[]>;

  /**
   * 根据ID获取指定AI供应商配置
   * 需要用户权限
   * @param providerId 供应商ID
   */
  getProvider(providerId: string): Promise<AIProviderConfig>;

  /**
   * 创建新的AI供应商配置
   * 需要管理员权限
   * @param providerData 供应商配置数据
   */
  createProvider(providerData: AIProviderConfigCreate): Promise<AIProviderConfig>;

  /**
   * 更新AI供应商配置
   * 需要管理员权限
   * @param providerId 供应商ID
   * @param updateData 更新数据
   */
  updateProvider(providerId: string, updateData: AIProviderConfigUpdate): Promise<AIProviderConfig>;

  /**
   * 删除AI供应商配置
   * 需要管理员权限
   * @param providerId 供应商ID
   */
  deleteProvider(providerId: string): Promise<boolean>;

  /**
   * 测试AI供应商配置
   * 需要用户权限
   * @param providerId 供应商ID
   * @param testRequest 测试请求数据
   */
  testProvider(providerId: string, testRequest: TestProviderRequest): Promise<TestProviderResponse>;
} 