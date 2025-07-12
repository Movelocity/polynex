import { ApiClient, ApiError } from './ApiClient';
import { IAIProviderService } from '../interfaces/IAIProviderService';
import {
  AIProviderConfig,
  AIProviderConfigCreate,
  AIProviderConfigUpdate,
  TestProviderRequest,
  TestProviderResponse
} from '@/types';

/**
 * AI供应商API服务实现
 * 实现IAIProviderService接口，提供AI供应商配置管理功能
 */
export class AIProviderApiService implements IAIProviderService {
  constructor(private apiClient: ApiClient) {}

  /**
   * 获取所有AI供应商配置
   * 需要用户权限
   */
  async getAllProviders(): Promise<AIProviderConfig[]> {
    try {
      return await this.apiClient.get<AIProviderConfig[]>('/ai_providers/all');
    } catch (error) {
      console.error('Failed to get AI providers:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取指定AI供应商配置
   * 需要用户权限
   * @param providerId 供应商ID
   */
  async getProvider(providerId: string): Promise<AIProviderConfig> {
    try {
      return await this.apiClient.get<AIProviderConfig>(`/ai_providers/details/${providerId}`);
    } catch (error) {
      console.error(`Failed to get AI provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * 创建新的AI供应商配置
   * 需要管理员权限
   * @param providerData 供应商配置数据
   */
  async createProvider(providerData: AIProviderConfigCreate): Promise<AIProviderConfig> {
    try {
      return await this.apiClient.post<AIProviderConfig>('/ai_providers/create', providerData);
    } catch (error) {
      console.error('Failed to create AI provider:', error);
      throw error;
    }
  }

  /**
   * 更新AI供应商配置
   * 需要管理员权限
   * @param providerId 供应商ID
   * @param updateData 更新数据
   */
  async updateProvider(providerId: string, updateData: AIProviderConfigUpdate): Promise<AIProviderConfig> {
    try {
      return await this.apiClient.put<AIProviderConfig>(`/ai_providers/update/${providerId}`, updateData);
    } catch (error) {
      console.error(`Failed to update AI provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * 删除AI供应商配置
   * 需要管理员权限
   * @param providerId 供应商ID
   */
  async deleteProvider(providerId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/ai_providers/delete/${providerId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete AI provider ${providerId}:`, error);
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 测试AI供应商配置
   * 需要用户权限
   * @param providerId 供应商ID
   * @param testRequest 测试请求数据
   */
  async testProvider(providerId: string, testRequest: TestProviderRequest): Promise<TestProviderResponse> {
    try {
      return await this.apiClient.post<TestProviderResponse>(`/ai_providers/test/${providerId}`, testRequest);
    } catch (error) {
      console.error(`Failed to test AI provider ${providerId}:`, error);
      throw error;
    }
  }
} 