import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { useConversationSSE } from '@/hooks/useSSE';
import { conversationService } from '@/services';
import { ConversationMessage } from '@/types';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ConversationImproved() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // 获取token（假设从localStorage或其他地方获取）
  const token = localStorage.getItem('token');
  const { agents, getAgent } = useAgents();
  
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [currentAIResponse, setCurrentAIResponse] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentId = searchParams.get('agent');

  // 使用改进的SSE钩子
  const {
    state: sseState,
    messages: sseMessages,
    connect: connectSSE,
    disconnect: disconnectSSE,
    clearMessages: clearSSEMessages,
  } = useConversationSSE(conversationId, token);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAIResponse]);

  // 加载指定的Agent
  useEffect(() => {
    if (agentId && user) {
      loadAgent(agentId);
    }
  }, [agentId, user]);

  // 处理SSE消息
  useEffect(() => {
    const latestMessage = sseMessages[sseMessages.length - 1];
    if (!latestMessage) return;

    console.log('Processing SSE message:', latestMessage);

    switch (latestMessage.type) {
      case 'start':
        setCurrentAIResponse('');
        break;
        
      case 'content':
        setCurrentAIResponse(prev => prev + latestMessage.data.content);
        break;
        
      case 'done':
        // 完成响应，将完整消息添加到消息列表
        const fullResponse = latestMessage.data.full_response || currentAIResponse;
        if (fullResponse) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullResponse,
            timestamp: latestMessage.data.timestamp || new Date().toISOString(),
            tokens: latestMessage.data.token_count
          }]);
        }
        setCurrentAIResponse('');
        disconnectSSE();
        break;
        
      case 'error':
        toast({
          title: "AI响应错误",
          description: latestMessage.data.error,
          variant: "destructive",
        });
        setCurrentAIResponse('');
        disconnectSSE();
        break;
        
      case 'heartbeat':
        // 心跳消息，用于保持连接
        console.log('SSE heartbeat received');
        break;
    }
  }, [sseMessages, currentAIResponse, disconnectSSE]);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || sseState.isConnecting) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');

    try {
      // 如果还没有对话ID，先创建对话
      let currentConversationId = conversationId;
      if (!currentConversationId) {
                 const conversation = await conversationService.createConversation({
           agent_id: selectedAgent.agent_id,
           title: `与 ${selectedAgent.app_preset.name} 的对话`,
           message: messageContent,
         });
        currentConversationId = conversation.id;
        setConversationId(currentConversationId);
      }

      // 添加用户消息到界面
      const userMessage: ConversationMessage = {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // 清空之前的SSE消息
      clearSSEMessages();

      // 发送流式请求
      const response = await fetch(`/api/conversations/${currentConversationId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageContent,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 连接SSE流接收响应
      connectSSE();

    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "发送消息失败",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  // 连接状态指示器
  const renderConnectionStatus = () => {
    if (sseState.isConnecting) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm">连接中...</span>
        </div>
      );
    }
    
    if (sseState.isConnected) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <Wifi className="h-4 w-4" />
          <span className="text-sm">已连接</span>
        </div>
      );
    }
    
    if (sseState.error) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">连接错误</span>
        </div>
      );
    }
    
    return null;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            请登录后使用此功能。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingAgent) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载Agent中...</p>
        </div>
      </div>
    );
  }

  if (!selectedAgent && agentId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Agent加载失败或不存在
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tools/agent-management')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回Agent管理
            </Button>
            {selectedAgent && (
              <div className="flex items-center space-x-3">
                <Bot className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold">{selectedAgent.app_preset.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedAgent.provider} • {selectedAgent.model}
                  </p>
                </div>
                <Badge variant={selectedAgent.is_public ? "default" : "secondary"}>
                  {selectedAgent.is_public ? '公开' : '私有'}
                </Badge>
              </div>
            )}
          </div>
          
          {/* 连接状态 */}
          {renderConnectionStatus()}
        </div>
        
        {selectedAgent?.app_preset?.description && (
          <p className="text-muted-foreground">{selectedAgent.app_preset.description}</p>
        )}

        {/* SSE连接错误警告 */}
        {sseState.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              连接错误: {sseState.error}
              {sseState.retryCount > 0 && ` (重试 ${sseState.retryCount} 次)`}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* 对话区域 */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>对话</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && selectedAgent && !selectedAgent.app_preset?.greetings && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>开始与 {selectedAgent.app_preset.name} 对话吧</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="flex justify-between items-center mt-1">
                      {message.timestamp && (
                        <p className={`text-xs ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                                             {(message as any).tokens && (
                         <p className={`text-xs ${
                           message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                         }`}>
                           {(message as any).tokens} tokens
                         </p>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 当前AI响应 */}
            {currentAIResponse && (
              <div className="flex justify-start">
                <div className="flex space-x-2 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <p className="whitespace-pre-wrap">{currentAIResponse}</p>
                    <div className="flex space-x-1 mt-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 建议问题 */}
          {selectedAgent?.app_preset?.suggested_questions && messages.length <= 1 && !currentAIResponse && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">建议问题：</p>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.app_preset.suggested_questions.map((question: string, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs"
                    disabled={sseState.isConnecting || !!currentAIResponse}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 输入区域 */}
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              disabled={sseState.isConnecting || !!currentAIResponse || !selectedAgent}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={sseState.isConnecting || !!currentAIResponse || !inputMessage.trim() || !selectedAgent}
              size="icon"
            >
              {sseState.isConnecting || currentAIResponse ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 