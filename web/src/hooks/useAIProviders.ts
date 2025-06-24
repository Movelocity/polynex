import { useState, useEffect, useCallback } from 'react';
import { 
  AIProviderConfig, 
  AIProviderConfigCreate, 
  AIProviderConfigUpdate,
  TestProviderRequest,
  TestProviderResponse 
} from '@/types';
import { aiProviderService } from '@/services';
import { useToast } from '@/hooks/use-toast';

/**
 * AI供应商管理Hook
 * 提供AI供应商的CRUD操作和状态管理
 */
export const useAIProviders = () => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * 加载所有供应商
   */
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiProviderService.getAllProviders();
      setProviders(data);
    } catch (err: any) {
      const errorMessage = err.message || '加载AI供应商失败';
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
   * 创建新供应商
   */
  const createProvider = useCallback(async (providerData: AIProviderConfigCreate): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const newProvider = await aiProviderService.createProvider(providerData);
      setProviders(prev => [...prev, newProvider]);
      toast({
        title: '创建成功',
        description: `AI供应商 "${newProvider.name}" 创建成功`
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '创建AI供应商失败';
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
   * 更新供应商
   */
  const updateProvider = useCallback(async (
    providerId: string, 
    updateData: AIProviderConfigUpdate
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const updatedProvider = await aiProviderService.updateProvider(providerId, updateData);
      setProviders(prev => prev.map(p => p.id === providerId ? updatedProvider : p));
      toast({
        title: '更新成功',
        description: `AI供应商 "${updatedProvider.name}" 更新成功`
      });
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '更新AI供应商失败';
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
   * 删除供应商
   */
  const deleteProvider = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const success = await aiProviderService.deleteProvider(providerId);
      if (success) {
        setProviders(prev => prev.filter(p => p.id !== providerId));
        toast({
          title: '删除成功',
          description: 'AI供应商删除成功'
        });
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMessage = err.message || '删除AI供应商失败';
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
   * 测试供应商
   */
  const testProvider = useCallback(async (
    providerId: string, 
    testRequest: TestProviderRequest
  ): Promise<TestProviderResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiProviderService.testProvider(providerId, testRequest);
      if (result.success) {
        toast({
          title: '测试成功',
          description: '供应商连接正常'
        });
      } else {
        toast({
          title: '测试失败',
          description: result.message,
          variant: 'destructive'
        });
      }
      return result;
    } catch (err: any) {
      const errorMessage = err.message || '测试AI供应商失败';
      setError(errorMessage);
      toast({
        title: '测试失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * 获取指定供应商
   */
  const getProvider = useCallback(async (providerId: string): Promise<AIProviderConfig | null> => {
    try {
      setLoading(true);
      setError(null);
      const provider = await aiProviderService.getProvider(providerId);
      return provider;
    } catch (err: any) {
      const errorMessage = err.message || '获取AI供应商失败';
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
   * 设置默认供应商
   */
  const setDefaultProvider = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      // 先将其他供应商设为非默认
      const updates = providers.map(async (provider) => {
        if (provider.id === providerId) {
          return updateProvider(providerId, { is_default: true });
        } else if (provider.is_default) {
          return updateProvider(provider.id, { is_default: false });
        }
        return Promise.resolve(true);
      });
      
      await Promise.all(updates);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '设置默认供应商失败';
      setError(errorMessage);
      toast({
        title: '设置失败',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [providers, updateProvider, toast]);

  /**
   * 刷新供应商列表
   */
  const refresh = useCallback(() => {
    loadProviders();
  }, [loadProviders]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    // 状态
    providers,
    loading,
    error,
    
    // 操作方法
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    getProvider,
    setDefaultProvider,
    refresh,
    
    // 便捷方法
    activeProviders: providers.filter(p => p.is_active),
    defaultProvider: providers.find(p => p.is_default && p.is_active),
    hasDefaultProvider: providers.some(p => p.is_default && p.is_active)
  };
}; 