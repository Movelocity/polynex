import { AgentSummary, AgentDetail, AgentCreate, AppPreset } from '@/types';

/**
 * AI代理相关工具函数
 */

/**
 * 格式化代理显示名称
 * @param agent 代理信息
 */
export const formatAgentDisplayName = (agent: AgentSummary | AgentDetail): string => {
  // AgentSummary has name field, AgentDetail has app_preset with name
  if ('name' in agent) {
    return agent.name || '未命名代理';
  }
  return agent.app_preset?.name || '未命名代理';
};

/**
 * 获取代理状态显示文本
 * @param isPublic 是否公开
 * @param isDefault 是否默认
 */
export const getAgentStatusText = (isPublic: boolean, isDefault: boolean): string => {
  const status = [];
  if (isDefault) status.push('默认');
  if (isPublic) status.push('公开');
  else status.push('私有');
  return status.join(' • ');
};

/**
 * 获取代理可见性图标
 * @param isPublic 是否公开
 */
export const getAgentVisibilityIcon = (isPublic: boolean): string => {
  return isPublic ? 'globe' : 'lock';
};

/**
 * 获取代理可见性文本
 * @param isPublic 是否公开
 */
export const getAgentVisibilityText = (isPublic: boolean): string => {
  return isPublic ? '公开可见' : '仅自己可见';
};

/**
 * 验证代理配置
 * @param agent 代理配置
 */
export const validateAgentConfig = (agent: Partial<AgentCreate>): string[] => {
  const errors: string[] = [];

  if (!agent.provider?.trim()) {
    errors.push('请选择AI供应商');
  }

  if (!agent.model?.trim()) {
    errors.push('请选择模型');
  }

  if (!agent.app_preset?.name?.trim()) {
    errors.push('代理名称不能为空');
  }

  if (!agent.app_preset?.description?.trim()) {
    errors.push('代理描述不能为空');
  }

  if (agent.temperature !== undefined) {
    if (agent.temperature < 0 || agent.temperature > 2) {
      errors.push('温度参数应在0-2之间');
    }
  }

  if (agent.top_p !== undefined) {
    if (agent.top_p < 0 || agent.top_p > 1) {
      errors.push('Top-p参数应在0-1之间');
    }
  }

  if (agent.max_tokens !== undefined) {
    if (agent.max_tokens < 1 || agent.max_tokens > 100000) {
      errors.push('最大tokens应在1-100000之间');
    }
  }

  return errors;
};

/**
 * 创建默认应用预设
 * @param name 代理名称
 * @param description 代理描述
 */
export const createDefaultAppPreset = (name: string, description: string): AppPreset => {
  return {
    name: name.trim(),
    description: description.trim(),
    greetings: `你好！我是${name}，${description}`,
    suggested_questions: [
      '你好！',
      '你能帮我做什么？',
      '介绍一下你的功能'
    ],
    creation_date: new Date().toISOString()
  };
};

/**
 * 格式化代理摘要信息
 * @param agent 代理信息
 */
export const getAgentSummary = (agent: AgentSummary | AgentDetail): string => {
  const parts = [
    agent.provider,
    agent.model
  ];

  if (agent.is_default) {
    parts.push('默认');
  }

  if (agent.is_public) {
    parts.push('公开');
  }

  return parts.join(' • ');
};

/**
 * 按创建时间排序代理
 * @param agents 代理列表
 * @param descending 是否降序（默认true，最新的在前）
 */
export const sortAgentsByTime = (agents: AgentSummary[], descending: boolean = true): AgentSummary[] => {
  return [...agents].sort((a, b) => {
    const timeA = new Date(a.create_time).getTime();
    const timeB = new Date(b.create_time).getTime();
    return descending ? timeB - timeA : timeA - timeB;
  });
};

/**
 * 按名称排序代理
 * @param agents 代理列表
 */
export const sortAgentsByName = (agents: AgentSummary[]): AgentSummary[] => {
  return [...agents].sort((a, b) => {
    const nameA = formatAgentDisplayName(a);
    const nameB = formatAgentDisplayName(b);
    return nameA.localeCompare(nameB);
  });
};

/**
 * 过滤代理列表
 * @param agents 代理列表
 * @param filter 过滤条件
 */
export const filterAgents = (
  agents: AgentSummary[],
  filter: {
    search?: string;
    provider?: string;
    isPublic?: boolean;
    isDefault?: boolean;
  }
): AgentSummary[] => {
  return agents.filter(agent => {
    // 搜索过滤
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const agentName = formatAgentDisplayName(agent);
      if (!agentName.toLowerCase().includes(searchLower) &&
          !agent.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // 供应商过滤
    if (filter.provider && agent.provider !== filter.provider) {
      return false;
    }

    // 可见性过滤
    if (filter.isPublic !== undefined && agent.is_public !== filter.isPublic) {
      return false;
    }

    // 默认代理过滤
    if (filter.isDefault !== undefined && agent.is_default !== filter.isDefault) {
      return false;
    }

    return true;
  });
};

/**
 * 检查用户是否拥有代理
 * @param agent 代理信息
 * @param currentUserId 当前用户ID
 */
export const isAgentOwner = (agent: AgentSummary | AgentDetail, currentUserId: string): boolean => {
  return agent.user_id === currentUserId;
};

/**
 * 检查用户是否可以编辑代理
 * @param agent 代理信息
 * @param currentUserId 当前用户ID
 */
export const canEditAgent = (agent: AgentSummary | AgentDetail, currentUserId: string): boolean => {
  return isAgentOwner(agent, currentUserId);
};

/**
 * 检查用户是否可以删除代理
 * @param agent 代理信息
 * @param currentUserId 当前用户ID
 */
export const canDeleteAgent = (agent: AgentSummary | AgentDetail, currentUserId: string): boolean => {
  return isAgentOwner(agent, currentUserId);
};

/**
 * 生成代理的默认系统提示词
 * @param agent 代理详细信息
 */
export const generateSystemPrompt = (agent: AgentDetail): string => {
  const { app_preset } = agent;
  
  let prompt = `你是${app_preset.name}，${app_preset.description}`;
  
  if (app_preset.greetings) {
    prompt += `\n\n当用户第一次与你对话时，请使用以下问候语：${app_preset.greetings}`;
  }

  if (app_preset.suggested_questions && app_preset.suggested_questions.length > 0) {
    prompt += `\n\n你可以建议用户询问以下问题：\n${app_preset.suggested_questions.map(q => `- ${q}`).join('\n')}`;
  }

  return prompt;
}; 