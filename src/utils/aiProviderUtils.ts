import { AIProviderType, AIProviderConfig } from '@/types';

/**
 * AI供应商相关工具函数
 */

/**
 * 获取供应商类型的显示名称
 * @param type 供应商类型
 */
export const getProviderTypeDisplayName = (type: AIProviderType): string => {
  const typeMap = {
    [AIProviderType.OPENAI]: 'OpenAI',
    [AIProviderType.ANTHROPIC]: 'Anthropic (Claude)',
    [AIProviderType.GOOGLE]: 'Google (Gemini)',
    [AIProviderType.OLLAMA]: 'Ollama',
    [AIProviderType.CUSTOM]: '自定义'
  };
  return typeMap[type] || '未知';
};

/**
 * 获取供应商类型的图标类名
 * @param type 供应商类型
 */
export const getProviderTypeIcon = (type: AIProviderType): string => {
  const iconMap = {
    [AIProviderType.OPENAI]: 'robot',
    [AIProviderType.ANTHROPIC]: 'brain',
    [AIProviderType.GOOGLE]: 'search',
    [AIProviderType.OLLAMA]: 'server',
    [AIProviderType.CUSTOM]: 'settings'
  };
  return iconMap[type] || 'help-circle';
};

/**
 * 获取供应商状态的显示文本
 * @param isActive 是否激活
 */
export const getProviderStatusText = (isActive: boolean): string => {
  return isActive ? '已激活' : '已禁用';
};

/**
 * 获取供应商状态的颜色类名
 * @param isActive 是否激活
 */
export const getProviderStatusColor = (isActive: boolean): string => {
  return isActive ? 'text-green-600' : 'text-red-600';
};

/**
 * 格式化供应商显示名称
 * @param provider 供应商配置
 */
export const formatProviderDisplayName = (provider: AIProviderConfig): string => {
  return `${provider.name} (${getProviderTypeDisplayName(provider.provider_type)})`;
};

/**
 * 验证供应商配置是否完整
 * @param provider 供应商配置
 */
export const validateProviderConfig = (provider: Partial<AIProviderConfig>): string[] => {
  const errors: string[] = [];

  if (!provider.name?.trim()) {
    errors.push('供应商名称不能为空');
  }

  if (!provider.provider?.trim()) {
    errors.push('供应商标识不能为空');
  }

  if (!provider.provider_type) {
    errors.push('请选择供应商类型');
  }

  if (!provider.base_url?.trim()) {
    errors.push('API基础URL不能为空');
  } else {
    try {
      new URL(provider.base_url);
    } catch {
      errors.push('API基础URL格式不正确');
    }
  }

  if (!provider.models || provider.models.length === 0) {
    errors.push('至少需要配置一个模型');
  }

  if (provider.default_temperature !== undefined) {
    if (provider.default_temperature < 0 || provider.default_temperature > 2) {
      errors.push('温度参数应在0-2之间');
    }
  }

  if (provider.default_max_tokens !== undefined) {
    if (provider.default_max_tokens < 1 || provider.default_max_tokens > 100000) {
      errors.push('最大tokens应在1-100000之间');
    }
  }

  return errors;
};

/**
 * 检查是否有默认供应商
 * @param providers 供应商列表
 */
export const hasDefaultProvider = (providers: AIProviderConfig[]): boolean => {
  return providers.some(provider => provider.is_default && provider.is_active);
};

/**
 * 获取默认供应商
 * @param providers 供应商列表
 */
export const getDefaultProvider = (providers: AIProviderConfig[]): AIProviderConfig | undefined => {
  return providers.find(provider => provider.is_default && provider.is_active);
};

/**
 * 按优先级排序供应商
 * @param providers 供应商列表
 */
export const sortProvidersByPriority = (providers: AIProviderConfig[]): AIProviderConfig[] => {
  return [...providers].sort((a, b) => {
    // 优先级高的在前
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    // 优先级相同时，默认供应商在前
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1;
    }
    // 激活状态的在前
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    // 最后按名称排序
    return a.name.localeCompare(b.name);
  });
};

/**
 * 过滤激活的供应商
 * @param providers 供应商列表
 */
export const getActiveProviders = (providers: AIProviderConfig[]): AIProviderConfig[] => {
  return providers.filter(provider => provider.is_active);
};

/**
 * 生成供应商配置的摘要信息
 * @param provider 供应商配置
 */
export const getProviderSummary = (provider: AIProviderConfig): string => {
  const parts = [
    getProviderTypeDisplayName(provider.provider_type),
    `${provider.models.length} 个模型`,
    provider.is_active ? '已激活' : '已禁用'
  ];
  
  if (provider.is_default) {
    parts.push('默认');
  }

  return parts.join(' • ');
}; 