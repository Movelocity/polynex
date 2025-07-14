
// ===== AI代理相关类型 =====

import { PaginationParams } from ".";

// 消息类型
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 扩展AgentMessage类型以支持模板功能
export interface ExtendedAgentMessage extends AgentMessage {
  template_enabled?: boolean;
  token_count?: number;
}

// 头像配置
export interface AvatarConfig {
  emoji?: string;
  bg_color?: string;
  variant: 'emoji' | 'link';
  link?: string;
}

// 应用预设配置
export interface AppPreset {
  name: string;
  description: string;
  greetings?: string;
  send_greetings_to_ai?: boolean;
  suggested_questions?: string[];
  creation_date?: string;
  [key: string]: any;
}

// AI代理摘要信息
export interface AgentSummary {
  // id: string;
  agent_id: string;
  creator_id: string;
  provider: string;
  model: string;
  name: string;
  description: string;
  avatar: AvatarConfig;
  access_level: number;
  create_time: string;
  update_time: string;
}

// AI代理详细信息
export interface AgentDetail {
  id: string;
  agent_id: string;
  creator_id: string;
  provider: string;
  model: string;
  top_p?: number;
  temperature?: number;
  max_tokens?: number;
  preset_messages: AgentMessage[];
  app_preset: AppPreset;
  avatar: AvatarConfig;
  access_level: number;
  create_time: string;
  update_time: string;
}

// AI代理创建类型
export interface AgentCreate {
  agent_id: string;
  provider: string;
  model: string;
  top_p?: number;
  temperature?: number;
  max_tokens?: number;
  preset_messages?: AgentMessage[];
  app_preset: AppPreset;
  avatar: AvatarConfig;
  access_level?: number;
}

// AI代理更新类型
export interface AgentUpdate {
  provider?: string;
  model?: string;
  top_p?: number;
  temperature?: number;
  max_tokens?: number;
  preset_messages?: AgentMessage[];
  app_preset?: AppPreset;
  avatar?: AvatarConfig;
  access_level?: number;
}

export type Agent = {
  agent_id: string;
  app_preset: AppPreset;
  avatar: AvatarConfig;
  provider: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  preset_messages: ExtendedAgentMessage[];
  access_level: number;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
}

export type AgentInfo = {
  name: string;
  description: string;
  avatar: AvatarConfig;
  access_level: number;
} 

// Agent 查询参数
export interface AgentQueryParams extends PaginationParams {
  include_public?: boolean;
}
