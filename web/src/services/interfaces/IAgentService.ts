import {
  AgentSummary,
  AgentDetail,
  AgentCreate,
  AgentUpdate,
  AgentQueryParams
} from '@/types';

/**
 * AI代理服务接口
 * 定义AI代理管理的所有服务方法
 */
export interface IAgentService {
  /**
   * 创建新的AI代理
   * 需要用户权限
   * @param agentData 代理配置数据
   */
  createAgent(agentData: AgentCreate): Promise<AgentSummary>;

  /**
   * 获取当前用户的AI代理列表
   * 需要用户权限
   * @param params 查询参数（分页、是否包含公开代理等）
   */
  getAgents(params?: AgentQueryParams): Promise<AgentSummary[]>;

  /**
   * 获取公开的AI代理列表
   * 无需认证
   * @param params 查询参数（分页等）
   */
  getPublicAgents(params?: { limit?: number; offset?: number }): Promise<AgentSummary[]>;

  /**
   * 根据ID获取指定AI代理的详细信息
   * 需要用户权限（只能获取自己的代理或公开代理）
   * @param agentId 代理ID
   */
  getAgent(agentId: string): Promise<AgentDetail>;

  /**
   * 更新AI代理配置
   * 需要用户权限（只能更新自己创建的代理）
   * @param agentId 代理ID
   * @param updateData 更新数据
   */
  updateAgent(agentId: string, updateData: AgentUpdate): Promise<AgentDetail>;

  /**
   * 删除AI代理
   * 需要用户权限（只能删除自己创建的代理）
   * @param agentId 代理ID
   */
  deleteAgent(agentId: string): Promise<boolean>;
} 