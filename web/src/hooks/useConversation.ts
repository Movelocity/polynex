import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { conversationService } from '@/services';
import { ConversationMessage, Conversation as ConversationType } from '@/types';
import { toast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/utils';

// Hash参数工具函数
const getHashParams = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params;
};

const setHashParams = (params: Record<string, string>) => {
  const hashParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      hashParams.set(key, value);
    }
  });
  window.location.hash = hashParams.toString();
};

// 导出hash操作函数供外部使用
export { setHashParams };

export interface UseConversationReturn {
  // 状态
  selectedAgent: any;
  conversationId: string | null;
  messages: ConversationMessage[];
  inputMessage: string;
  isLoadingAgent: boolean;
  copiedIndex: number | null;
  isSidebarOpen: boolean;
  editingMessage: ConversationMessage | null;
  editingMessageIndex: number;
  currentAIResponse: string;
  currentAIReasoning: string;
  isReasoning: boolean;
  isStreaming: boolean;
  agentId: string | null;
  conversations: ConversationType[];
  sessionId: string | null;
  
  // 方法
  setInputMessage: (message: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setEditingMessage: (message: ConversationMessage | null) => void;
  setEditingMessageIndex: (index: number) => void;
  loadAgent: (agentId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  copyMessage: (content: string, index: number) => Promise<void>;
  handleEditMessage: (message: ConversationMessage, index: number) => void;
  handleSaveEditedMessage: (messageIndex: number, newContent: string) => Promise<void>;
  handleConversationSelect: (selectedConversationId: string) => Promise<void>;
  handleNewConversation: () => void;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSuggestedQuestion: (question: string) => void;
  setAgentHash: (agentId: string) => void;
  checkActiveSession: (sessionId: string) => Promise<boolean>;
  abortActiveStream: (sessionId: string) => Promise<boolean>;
  
  // 计算属性
  hasOnlyWelcome: boolean;
  shouldShowSuggestedQuestions: boolean;
}

export function useConversation(): UseConversationReturn {
  const { user } = useAuth();
  const { getAgent } = useAgents();
  // 状态定义
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  // conversationId 用来存储会话历史，sessionId 用来标识流式对话响应
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingMessage, setEditingMessage] = useState<ConversationMessage | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number>(-1);
  const [currentAIResponse, setCurrentAIResponse] = useState('');
  const [currentAIReasoning, setCurrentAIReasoning] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  
  const currentAIResponseRef = useRef('');
  const currentAIReasoningRef = useRef('');

  const creatingConversation = useRef(false);

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  // 加载对话列表
  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const data = await conversationService.getConversations({ limit: 50 });
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error({title: "加载对话历史失败"});
    }
  };

  // 删除对话
  const deleteConversation = async (conv_id: string) => {
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      await conversationService.deleteConversation(conv_id);
      if(conv_id === conversationId) {
        handleNewConversation();
      }
      setConversations(prev => prev.filter(c => c.id !== conv_id));
      toast.success({title: "对话删除成功"});
    } catch (error) {
      toast.error({title: "删除对话失败"});
    }
  };

  // 检查会话是否有活跃任务
  const checkActiveSession = async (sessionId: string): Promise<boolean> => {
    try {
      return await conversationService.isActiveSession(sessionId);
    } catch (error) {
      console.error('Failed to check session activity:', error);
      return false;
    }
  };

  // 中止流式任务
  const abortActiveStream = async (sessionId: string): Promise<boolean> => {
    try {
      const success = await conversationService.abortStream(sessionId);
      if (success) {
        toast.success({title: "已成功中止AI生成"});
        setIsStreaming(false);
      } else {
        toast.error({title: "中止AI生成失败"});
      }
      return success;
    } catch (error) {
      console.error('Failed to abort stream:', error);
      toast.error({title: "中止AI生成失败"});
      return false;
    }
  };

  // 从hash中读取agent参数
  useEffect(() => {
    const updateAgentFromHash = () => {
      const hashParams = getHashParams();
      const hashAgentId = hashParams.get('agent');
      setAgentId(hashAgentId);
    };

    // 初始化时读取hash
    updateAgentFromHash();

    // 监听hash变化
    const handleHashChange = () => {
      updateAgentFromHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 同步当前AI响应到ref
  useEffect(() => {
    currentAIResponseRef.current = currentAIResponse;
  }, [currentAIResponse]);

  // 同步当前推理内容到ref
  useEffect(() => {
    currentAIReasoningRef.current = currentAIReasoning;
  }, [currentAIReasoning]);

  // 加载指定的Agent
  useEffect(() => {
    if (agentId && user) {
      loadAgent(agentId);
    }
  }, [agentId, user]);

  // 加载Agent的函数, new_chat 默认为true
  const loadAgent = async (agentId: string, new_chat?: boolean) => {
    try {
      setIsLoadingAgent(true);
      const agent = await getAgent(agentId);
      if (agent) {
        setSelectedAgent(agent);
        // 显示欢迎语
        if (agent.app_preset?.greetings && new_chat !== false) {
          setMessages([{
            role: 'assistant',
            content: agent.app_preset.greetings,
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        toast.error({title: "找不到指定的Agent"});
      }
    } catch (error) {
      toast.error({title: "加载Agent失败"});
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // 复制消息内容
  const copyMessage = async (content: string, index: number) => {
    if (!copyToClipboard(content)) {
      toast.error({title: "无法复制消息内容"});
      return;
    }

    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success({title: "消息内容已复制到剪贴板"});
  };

  // 编辑消息
  const handleEditMessage = (message: ConversationMessage, index: number) => {
    setEditingMessage(message);
    setEditingMessageIndex(index);
  };

  // 保存编辑的消息
  const handleSaveEditedMessage = async (messageIndex: number, newContent: string) => {
    if (!conversationId) {
      throw new Error('没有活动的对话');
    }

    // 更新本地消息
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent,
      reasoning_content: updatedMessages[messageIndex].reasoning_content || ''
    };
    
    try {
      // 同步到后端
      await conversationService.updateConversationContext(conversationId, updatedMessages);
      setMessages(updatedMessages);
    } catch (error) {
      throw new Error('更新消息失败');
    }
  };

  // 对话选择处理
  const handleConversationSelect = async (selectConvId: string) => {
    try {
      const conversation = await conversationService.getConversation(selectConvId);
      setConversationId(selectConvId);
      setSessionId(conversation.session_id);
      setMessages(conversation.messages || []);
      
      // 如果对话有关联的agent，加载agent信息
      if (conversation.agent_id && conversation.agent_id !== selectedAgent?.id) {
        await loadAgent(conversation.agent_id, false);
      }
      console.log("select conversation ", selectConvId)
    } catch (error) {
      toast({
        title: "错误",
        description: "加载对话失败",
        variant: "destructive",
      });
    }
  };

  // 新建对话
  const handleNewConversation = () => {
    setConversationId(null);
    setSessionId(null);
    setMessages([]);
    if (selectedAgent?.app_preset?.greetings) {
      setMessages([{
        role: 'assistant',
        content: selectedAgent.app_preset.greetings,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isStreaming) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    
    // 立即显示用户消息
    const userMessage: ConversationMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    setCurrentAIResponse('');
    setCurrentAIReasoning('');

    if (!conversationId) {
      creatingConversation.current = true;  // 标记正在创建对话，结束后刷新对话列表
    }
  
    try {
      await conversationService.chat(
        {
          conversationId: conversationId,
          agentId: selectedAgent.id,
          message: messageContent,
          stream: true,
        },
        (data) => {
          console.log('Stream data:', data);
          
          switch (data.type) {
            case 'start':
              setCurrentAIResponse('');
              setCurrentAIReasoning('');
              break;
              
            case 'content':
              if (data.data.reasoning_content) {
                setIsReasoning(true);
                setCurrentAIReasoning(prev => prev + data.data.reasoning_content);
              }else {
                setIsReasoning(false);
                setCurrentAIResponse(prev => prev + data.data.content);
              }
              break;

            case 'conversation_created':
              setConversationId(data.data.conversation_id);
              break;
              
            case 'done':
              // 完成响应，将完整消息添加到消息列表
              const fullResponse = data.data.full_response || currentAIResponseRef.current;
              if (fullResponse) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: fullResponse,
                  reasoning_content: currentAIReasoningRef.current,
                  timestamp: data.data.timestamp || new Date().toISOString()
                }]);
              }
              setCurrentAIResponse('');
              setCurrentAIReasoning('');
              setIsStreaming(false);
              break;
              
            case 'error':
              toast({
                title: "AI响应错误",
                description: data.data.error,
                variant: "destructive",
              });
              setCurrentAIResponse('');
              setCurrentAIReasoning('');
              setIsStreaming(false);
              break;
              
            case 'heartbeat':
              console.log('SSE heartbeat received');
              break;
          }
        },
        (error) => {
          toast({
            title: "发送失败",
            description: error,
            variant: "destructive",
          });
          setCurrentAIResponse('');
          setCurrentAIReasoning('');
          setIsStreaming(false);
        },
        () => {
          setIsStreaming(false);
        }
      );

    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "发送消息失败",
        variant: "destructive",
      });
      
      // 发送失败，移除预先添加的用户消息
      setMessages(prev => prev.slice(0, -1));
      setCurrentAIResponse('');
      setCurrentAIReasoning('');
      setIsStreaming(false);
    } finally {
      if (creatingConversation.current) {
        creatingConversation.current = false;
        loadConversations();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  // 计算属性
  const hasOnlyWelcome = messages.length === 1 && 
                        messages[0]?.role === 'assistant' && 
                        selectedAgent?.app_preset?.greetings === messages[0]?.content;

  const shouldShowSuggestedQuestions = selectedAgent?.app_preset?.suggested_questions && 
                                      (messages.length === 0 || hasOnlyWelcome);

  const setAgentHash = (agentId: string) => {
    setHashParams({ agent: agentId });
  };

  return {
    // 状态
    selectedAgent,
    conversationId,
    messages,
    inputMessage,
    isLoadingAgent,
    copiedIndex,
    isSidebarOpen,
    editingMessage,
    editingMessageIndex,
    currentAIResponse,
    currentAIReasoning,
    isReasoning,
    isStreaming,
    agentId,
    conversations,
    sessionId,
    
    // 方法
    setInputMessage,
    setIsSidebarOpen,
    setEditingMessage,
    setEditingMessageIndex,
    loadAgent,
    loadConversations,
    deleteConversation,
    copyMessage,
    handleEditMessage,
    handleSaveEditedMessage,
    handleConversationSelect,
    handleNewConversation,
    handleSendMessage,
    handleKeyPress,
    handleSuggestedQuestion,
    setAgentHash,
    checkActiveSession,
    abortActiveStream,
    
    // 计算属性
    hasOnlyWelcome,
    shouldShowSuggestedQuestions,
  };
} 