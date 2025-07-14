import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '@/hooks/useAgents';
import { useAIProviders } from '@/hooks/useAIProviders';
import { toast } from '@/hooks/use-toast';
import { AgentInfo, AgentCreate, ExtendedAgentMessage } from '@/types/agent';
import { AgentInfoEditor } from '@/components/chat/AgentInfoEditor';  

/**
 * 用于在任意页面创建新的Agent
 */
interface CreateAgentDialogProps {
  trigger: React.ReactNode;
  onAgentCreated?: (agentId: string) => void;
}

export function CreateAgentDialog({ trigger, onAgentCreated }: CreateAgentDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { createAgent, generateAgentId } = useAgents();
  const { providers } = useAIProviders();
  const navigate = useNavigate();

  const handleAgentInfoSave = async (info: AgentInfo) => {
    if (!info.name.trim()) {
      toast({
        title: '创建失败',
        description: 'Agent名称不能为空',
        variant: 'destructive'
      });
      return;
    }

    try {
      // 获取默认供应商和模型
      const defaultProvider = providers.find(p => p.access_level === 3) || providers[0];
      if (!defaultProvider) {
        toast({
          title: '创建失败',
          description: '没有可用的AI供应商',
          variant: 'destructive'
        });
        return;
      }

      const agentId = generateAgentId();
      const createData: AgentCreate = {
        agent_id: agentId,
        provider: defaultProvider.name,
        model: defaultProvider.models?.[0] || '',
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 8192,
        preset_messages: [
          { 
            role: 'system', 
            content: '你是一个友好且有用的AI助手。请用中文回答问题，保持礼貌和专业。',
            template_enabled: false,
            token_count: 24
          } as ExtendedAgentMessage
        ],
        app_preset: {
          name: info.name,
          description: info.description,
          greetings: '你好! 我是你的AI助手，有什么可以帮助你的吗？',
          suggested_questions: ['如何使用这个功能？', '告诉我一些有趣的事情', '帮我制定一个学习计划']
        },
        avatar: info.avatar,
        access_level: info.access_level,
      };

      const success = await createAgent(createData);
      if (success) {
        toast({
          title: '创建成功',
          description: `Agent "${info.name}" 已成功创建`
        });
        setShowDialog(false);
        if (onAgentCreated) {
          onAgentCreated(agentId);
        } else {
          navigate(`/chat/agent/edit/${agentId}`);
        }
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <AgentInfoEditor
      isCreateMode={true}
      show={showDialog}
      onShowChange={setShowDialog}
      onSave={handleAgentInfoSave}
      triggerButton={trigger}
    />
  );
} 