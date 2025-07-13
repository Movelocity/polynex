import { useState, useEffect, useCallback } from 'react';
import { 
  AgentSummary, 
  AgentDetail, 
  AgentCreate, 
  AgentUpdate,
  AgentQueryParams 
} from '@/types';
import { agentService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * AI代理管理Hook
 * 提供AI代理的CRUD操作和状态管理
 */
export const useAgents = () => {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  /**
   * 加载代理列表
   */
  const loadAgents = useCallback(async (params?: AgentQueryParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentService.getAgents(params);
      setAgents(data);
    } catch (err: any) {
      const errorMessage = err.message || '加载AI代理失败';
      setError(errorMessage);
      toast({
        title: '加载失败',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 加载公开代理列表
   */
  const loadPublicAgents = useCallback(async (params?: { limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentService.getPublicAgents(params);
      setAgents(data);
    } catch (err: any) {
      const errorMessage = err.message || '加载公开代理失败';
      setError(errorMessage);
      toast({
        title: '加载失败',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 创建新代理
   */
  const createAgent = useCallback(async (agentData: AgentCreate): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const newAgent = await agentService.createAgent(agentData);
      setAgents(prev => [newAgent, ...prev]); // 新创建的在前面
      toast({
        title: '创建成功',
        description: `AI代理 "${newAgent.name}" 创建成功`
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '创建AI代理失败';
      setError(errorMessage);
      toast({
        title: '创建失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 更新代理
   */
  const updateAgent = useCallback(async (
    agentId: string, 
    updateData: AgentUpdate
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const updatedAgent = await agentService.updateAgent(agentId, updateData);
      
      // 更新列表中的代理信息
      setAgents(prev => prev.map(agent => {
        if (agent.id === agentId) {
          return {
            ...agent,
            name: updatedAgent.app_preset.name,
            description: updatedAgent.app_preset.description,
            provider: updatedAgent.provider,
            model: updatedAgent.model,
            update_time: updatedAgent.update_time
          };
        }
        return agent;
      }));
      
      toast({
        title: '更新成功',
        description: `AI代理 "${updatedAgent.app_preset.name}" 更新成功`
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '更新AI代理失败';
      setError(errorMessage);
      toast({
        title: '更新失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 删除代理
   */
  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const success = await agentService.deleteAgent(agentId);
      if (success) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        toast({
          title: '删除成功',
          description: 'AI代理删除成功'
        });
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMessage = err.message || '删除AI代理失败';
      setError(errorMessage);
      toast({
        title: '删除失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 获取指定代理详情
   */
  const getAgent = useCallback(async (agentId: string): Promise<AgentDetail | null> => {
    try {
      setLoading(true);
      setError(null);
      const agent = await agentService.getAgent(agentId);
      return agent;
    } catch (err: any) {
      const errorMessage = err.message || '获取AI代理失败';
      setError(errorMessage);
      toast({
        title: '获取失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);


  /**
   * 刷新代理列表
   */
  const refresh = useCallback((params?: AgentQueryParams) => {
    loadAgents(params);
  }, [loadAgents]);

  /**
   * 检查用户是否拥有指定代理
   */
  const isOwner = useCallback((agent: AgentSummary): boolean => {
    return user?.id === agent.creator_id;
  }, [user]);

  /**
   * 检查用户是否可以编辑指定代理
   */
  const canEdit = useCallback((agent: AgentSummary): boolean => {
    return isOwner(agent);
  }, [isOwner]);

  /**
   * 检查用户是否可以删除指定代理
   */
  const canDelete = useCallback((agent: AgentSummary): boolean => {
    return isOwner(agent);
  }, [isOwner]);

  // 组件挂载时加载数据（如果用户已登录）
  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user, loadAgents]);

  return {
    // 状态
    agents,
    loading,
    error,
    
    // 操作方法
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    refresh,
    loadPublicAgents,
    
    // 权限检查
    isOwner,
    canEdit,
    canDelete,
    
    // 便捷属性
    // myAgents: agents.filter(agent => user?.id === agent.user_id),
    // publicAgents: agents.filter(agent => agent.is_public),
    // defaultAgent: agents.find(agent => agent.is_default && user?.id === agent.user_id),
    // hasDefaultAgent: agents.some(agent => agent.is_default && user?.id === agent.user_id)
  };
}; 