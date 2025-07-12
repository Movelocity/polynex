import { ApiClient, ApiError } from './ApiClient';
import { IAgentService } from '../interfaces/IAgentService';
import {
  AgentSummary,
  AgentDetail,
  AgentCreate,
  AgentUpdate,
  AgentQueryParams
} from '@/types';

/**
 * AI代理API服务实现
 * 实现IAgentService接口，提供AI代理管理功能
 */
export class AgentApiService implements IAgentService {
  constructor(private apiClient: ApiClient) {}

  /**
   * 创建新的AI代理
   * 需要用户权限
   * @param agentData 代理配置数据
   */
  async createAgent(agentData: AgentCreate): Promise<AgentSummary> {
    try {
      return await this.apiClient.post<AgentSummary>('/agents/create', agentData);
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户的AI代理列表
   * 需要用户权限
   * @param params 查询参数（分页、是否包含公开代理等）
   */
  async getAgents(params?: AgentQueryParams): Promise<AgentSummary[]> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params?.limit !== undefined) {
        queryParams.limit = params.limit.toString();
      }
      if (params?.offset !== undefined) {
        queryParams.offset = params.offset.toString();
      }

      return await this.apiClient.get<AgentSummary[]>('/agents/list', queryParams);
    } catch (error) {
      console.error('Failed to get agents:', error);
      throw error;
    }
  }

  /**
   * 获取公开的AI代理列表
   * 无需认证
   * @param params 查询参数（分页等）
   */
  async getPublicAgents(params?: { limit?: number; offset?: number }): Promise<AgentSummary[]> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params?.limit !== undefined) {
        queryParams.limit = params.limit.toString();
      }
      if (params?.offset !== undefined) {
        queryParams.offset = params.offset.toString();
      }

      return await this.apiClient.get<AgentSummary[]>('/agents/public', queryParams);
    } catch (error) {
      console.error('Failed to get public agents:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取指定AI代理的详细信息
   * 需要用户权限（只能获取自己的代理或公开代理）
   * @param agentId 代理ID
   */
  async getAgent(agentId: string): Promise<AgentDetail> {
    try {
      return await this.apiClient.get<AgentDetail>(`/agents/details/${agentId}`);
    } catch (error) {
      console.error(`Failed to get agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * 更新AI代理配置
   * 需要用户权限（只能更新自己创建的代理）
   * @param agentId 代理ID
   * @param updateData 更新数据
   */
  async updateAgent(agentId: string, updateData: AgentUpdate): Promise<AgentDetail> {
    try {
      return await this.apiClient.put<AgentDetail>(`/agents/update/${agentId}`, updateData);
    } catch (error) {
      console.error(`Failed to update agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * 删除AI代理
   * 需要用户权限（只能删除自己创建的代理）
   * @param agentId 代理ID
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/agents/delete/${agentId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete agent ${agentId}:`, error);
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }
} 