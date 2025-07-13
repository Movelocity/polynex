import { AppPreset, AvatarConfig } from '@/types';
import { ExtendedAgentMessage } from '@/components/chat/PromptEditor';

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