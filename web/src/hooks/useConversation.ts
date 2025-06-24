import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { conversationService } from '@/services';
import { ConversationMessage } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface UseConversationReturn {
  // 状态
  selectedAgent: any;
  conversationId: string | null;
  messages: ConversationMessage[];
  inputMessage: string;
  isLoading: boolean;
  isLoadingAgent: boolean;
  copiedIndex: number | null;
  isSidebarOpen: boolean;
  editingMessage: ConversationMessage | null;
  editingMessageIndex: number;
  currentAIResponse: string;
  isStreaming: boolean;
  agentId: string | null;
  
  // 方法
  setInputMessage: (message: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setEditingMessage: (message: ConversationMessage | null) => void;
  setEditingMessageIndex: (index: number) => void;
  loadAgent: (agentId: string) => Promise<void>;
  copyMessage: (content: string, index: number) => Promise<void>;
  handleEditMessage: (message: ConversationMessage, index: number) => void;
  handleSaveEditedMessage: (messageIndex: number, newContent: string) => Promise<void>;
  handleConversationSelect: (selectedConversationId: string) => Promise<void>;
  handleNewConversation: () => void;
  handleSendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSuggestedQuestion: (question: string) => void;
  
  // 计算属性
  hasOnlyWelcome: boolean;
  shouldShowSuggestedQuestions: boolean;
}

export function useConversation(): UseConversationReturn {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { agents, getAgent } = useAgents();
  
  // 状态定义
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingMessage, setEditingMessage] = useState<ConversationMessage | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number>(-1);
  const [currentAIResponse, setCurrentAIResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const currentAIResponseRef = useRef('');
  const agentId = searchParams.get('agent');

  // 同步当前AI响应到ref
  useEffect(() => {
    currentAIResponseRef.current = currentAIResponse;
  }, [currentAIResponse]);

  // 加载指定的Agent
  useEffect(() => {
    if (agentId && user) {
      loadAgent(agentId);
    }
  }, [agentId, user]);

  // 加载Agent的函数
  const loadAgent = async (agentId: string) => {
    try {
      setIsLoadingAgent(true);
      const agent = await getAgent(agentId);
      if (agent) {
        setSelectedAgent(agent);
        // 显示欢迎语
        if (agent.app_preset?.greetings) {
          setMessages([{
            role: 'assistant',
            content: agent.app_preset.greetings,
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        toast({
          title: "错误",
          description: "找不到指定的Agent",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "加载Agent失败",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // 复制消息内容
  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "复制成功",
        description: "消息内容已复制到剪贴板",
      });
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制消息内容",
        variant: "destructive",
      });
    }
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
      content: newContent
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
  const handleConversationSelect = async (selectedConversationId: string) => {
    try {
      setIsLoading(true);
      const conversation = await conversationService.getConversation(selectedConversationId);
      
      setConversationId(selectedConversationId);
      setMessages(conversation.messages || []);
      
      // 如果对话有关联的agent，加载agent信息
      if (conversation.agent_id && conversation.agent_id !== selectedAgent?.agent_id) {
        await loadAgent(conversation.agent_id);
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "加载对话失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 新建对话
  const handleNewConversation = () => {
    setConversationId(null);
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
    if (!inputMessage.trim() || !selectedAgent || isLoading || isStreaming) return;

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

    try {
      // 如果还没有对话ID，使用流式创建对话
      if (!conversationId) {
        let createdConversationId: string | null = null;
        
        await conversationService.createConversationStream(
          {
            agent_id: selectedAgent.agent_id,
            title: messageContent.slice(0, 20),
            message: messageContent,
            stream: true
          },
          (data) => {
            console.log('Stream data:', data);
            
            switch (data.type) {
              case 'conversation_created':
                createdConversationId = data.data.conversation_id;
                setConversationId(createdConversationId);
                break;
                
              case 'start':
                setCurrentAIResponse('');
                break;
                
              case 'content':
                setCurrentAIResponse(prev => prev + data.data.content);
                break;
                
              case 'done':
                // 完成响应，将完整消息添加到消息列表
                const fullResponse = data.data.full_response || currentAIResponseRef.current;
                if (fullResponse) {
                  setMessages(prev => {
                    // 移除欢迎语（如果存在）并只保留用户消息，然后添加AI回复
                    const hasWelcome = prev.length >= 2 && prev[prev.length - 2].role === 'assistant' && 
                                       selectedAgent.app_preset?.greetings === prev[prev.length - 2].content;
                    
                    const messagesToKeep = hasWelcome ? [prev[0], prev[prev.length - 1]] : [prev[prev.length - 1]];
                    
                    return [
                      ...messagesToKeep,
                      {
                        role: 'assistant',
                        content: fullResponse,
                        timestamp: data.data.timestamp || new Date().toISOString()
                      }
                    ];
                  });
                }
                setCurrentAIResponse('');
                setIsStreaming(false);
                break;
                
              case 'error':
                toast({
                  title: "AI响应错误",
                  description: data.data.error,
                  variant: "destructive",
                });
                setCurrentAIResponse('');
                setIsStreaming(false);
                break;
                
              case 'heartbeat':
                // 心跳消息，保持连接
                console.log('SSE heartbeat received');
                break;
            }
          },
          (error) => {
            toast({
              title: "创建对话失败",
              description: error,
              variant: "destructive",
            });
            setCurrentAIResponse('');
            setIsStreaming(false);
            // 移除预先添加的用户消息
            setMessages(prev => prev.slice(0, -1));
          },
          () => {
            setIsStreaming(false);
          }
        );
      } else {
        // 继续现有对话，使用流式聊天
        await conversationService.sendMessageStream(
          conversationId,
          {
            message: messageContent,
            stream: true,
          },
          (data) => {
            console.log('Stream data:', data);
            
            switch (data.type) {
              case 'start':
                setCurrentAIResponse('');
                break;
                
              case 'content':
                setCurrentAIResponse(prev => prev + data.data.content);
                break;
                
              case 'done':
                // 完成响应，将完整消息添加到消息列表
                const fullResponse = data.data.full_response || currentAIResponseRef.current;
                if (fullResponse) {
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: data.data.timestamp || new Date().toISOString()
                  }]);
                }
                setCurrentAIResponse('');
                setIsStreaming(false);
                break;
                
              case 'error':
                toast({
                  title: "AI响应错误",
                  description: data.data.error,
                  variant: "destructive",
                });
                setCurrentAIResponse('');
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
            setIsStreaming(false);
          },
          () => {
            setIsStreaming(false);
          }
        );
      }
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "发送消息失败",
        variant: "destructive",
      });
      
      // 发送失败，移除预先添加的用户消息
      setMessages(prev => prev.slice(0, -1));
      setCurrentAIResponse('');
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isStreaming) {
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

  return {
    // 状态
    selectedAgent,
    conversationId,
    messages,
    inputMessage,
    isLoading,
    isLoadingAgent,
    copiedIndex,
    isSidebarOpen,
    editingMessage,
    editingMessageIndex,
    currentAIResponse,
    isStreaming,
    agentId,
    
    // 方法
    setInputMessage,
    setIsSidebarOpen,
    setEditingMessage,
    setEditingMessageIndex,
    loadAgent,
    copyMessage,
    handleEditMessage,
    handleSaveEditedMessage,
    handleConversationSelect,
    handleNewConversation,
    handleSendMessage,
    handleKeyPress,
    handleSuggestedQuestion,
    
    // 计算属性
    hasOnlyWelcome,
    shouldShowSuggestedQuestions,
  };
} 