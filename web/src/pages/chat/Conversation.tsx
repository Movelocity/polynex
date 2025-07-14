import { useEffect } from 'react';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { Button } from '@/components/x-ui/button';
import { ChatHistoryPanel, MessageEditDialog } from '@/components/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { useAgents } from '@/hooks/useAgents';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useIsMobile } from '@/hooks/use-mobile';
import cn from 'classnames';

import { 
  PanelLeftOpen,
} from 'lucide-react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput, SuggestedQuestions } from '@/components/chat/ChatInput';
// import { CreateAgentDialog } from '@/components/chat';

// 主组件
export function Conversation() {
  // const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // 使用自定义hook管理聊天状态和逻辑
  const {
    selectedAgent,
    conversationId,
    messages,
    inputMessage,
    isLoading,
    copiedIndex,
    isSidebarOpen,
    editingMessage,
    editingMessageIndex,
    currentAIResponse,
    currentAIReasoning,
    isStreaming,
    agentId,
    setInputMessage,
    setIsSidebarOpen,
    setEditingMessage,
    setEditingMessageIndex,
    copyMessage,
    handleEditMessage,
    handleSaveEditedMessage,
    handleConversationSelect,
    handleNewConversation,
    handleSendMessage,
    handleKeyPress,
    handleSuggestedQuestion,
    loadConversations,
    deleteConversation,
    conversations,
    // hasOnlyWelcome,
    shouldShowSuggestedQuestions,
    setAgentHash,
  } = useConversation();

  // 使用Agent管理hook
  const { agents, loading: isLoadingAgents } = useAgents();

  // 使用自动滚动hook
  const { endRef } = useAutoScroll(
    messages, 
    currentAIResponse, 
    currentAIReasoning,
    isStreaming
  );

  // 自动选择可用的agent（当hash中没有agent参数时）
  useEffect(() => {
    if (!agentId && !isLoadingAgents && agents.length > 0 && !selectedAgent) {
      // 优先选择默认agent，否则选择第一个可用的agent
      const targetAgent = agents.find(agent => agent.access_level > 0) || agents[0];
      if (targetAgent) {
        // 使用hash设置agent参数
        setAgentHash(targetAgent.id);
      }
    }
  }, [agentId, isLoadingAgents, agents, selectedAgent, setAgentHash]);

  // Agent切换处理函数
  const handleAgentSwitch = async (newAgentId: string) => {
    if (newAgentId === selectedAgent?.id) {
      if (isMobile) {
        setIsSidebarOpen(false);
      }
      return; // 如果选择的是当前Agent，不做任何操作
    }

    try {
      // 使用hash设置agent参数
      setAgentHash(newAgentId);
      
      // 重置对话状态
      handleNewConversation();

      if (isMobile) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('切换Agent失败:', error);
    }
  };

  // 处理侧边栏关闭（移动端点击遮罩关闭）
  const handleSidebarClose = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // 处理对话选择（移动端选择后自动关闭侧边栏）
  const handleMobileConversationSelect = (conversationId: string) => {
    handleConversationSelect(conversationId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // 处理新建对话（移动端创建后自动关闭侧边栏）
  const handleMobileNewConversation = () => {
    handleNewConversation();
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // 键盘事件处理（ESC键关闭侧边栏）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  // 防止移动端侧边栏打开时背景滚动
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 清理函数
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isSidebarOpen]);

  useEffect(() => {
    loadConversations();
  }, [user]);

  // 默认打开侧边栏
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMobile, setIsSidebarOpen]);

  return (
    <div className="flex h-[calc(100vh-65px)] relative bg-muted/20">
      {/* 移动端背景遮罩 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={handleSidebarClose}
        />
      )}

      {/* 侧边栏 */}
      <div className={`
        ${isMobile 
          ? 'fixed top-0 left-0 bottom-0 z-50 w-[280px] sm:w-[320px] transform transition-transform duration-300 ease-in-out' 
          : 'w-80 flex-shrink-0 relative'
        }
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${!isMobile ? 'block' : ''}
      `}>
        <ChatHistoryPanel
          conversations={conversations}
          onConversationDelete={deleteConversation}
          currentConversationId={conversationId}
          onConversationSelect={handleMobileConversationSelect}
          onNewConversation={handleMobileNewConversation}
          className="h-full"
          // Agent props
          availableAgents={agents}
          selectedAgent={selectedAgent}
          onAgentSwitch={handleAgentSwitch}
          isLoadingAgents={isLoadingAgents}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col relative">
        {/* 对话区域 */}
        <ScrollArea className="flex-1">
          <div className="h-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* 移动端汉堡菜单 */}
            {isMobile && !isSidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="fixed top-[70px] left-2 z-50"
                onClick={() => setIsSidebarOpen(true)}
              >
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            )}
            
            {/* 消息列表 */}
            <div className="h-full py-8">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  index={index}
                  agentName={selectedAgent?.app_preset?.name}
                  avatar={message.role === 'user' ? undefined : selectedAgent?.avatar}
                  onCopy={copyMessage}
                  onEdit={handleEditMessage}
                  copiedIndex={copiedIndex}
                />
              ))}
              
              {/* 显示当前流式AI响应 */}
              {isStreaming && (currentAIResponse || currentAIReasoning) && (
                <MessageBubble
                  message={{
                    role: 'assistant',
                    content: currentAIResponse,
                    reasoning_content: currentAIReasoning,
                  }}
                  index={messages.length}
                  onCopy={() => {}}
                  onEdit={() => {}}
                  copiedIndex={null}
                  defaultReasoningOpen={true}
                />
              )}
              
              <div ref={endRef} />
            </div>
          </div>
        </ScrollArea>

        {/* <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-background to-transparent"></div> */}

        {/* 建议问题区域 */}
        <div className="w-full flex justify-center mb-2">
          {shouldShowSuggestedQuestions && (
            <SuggestedQuestions
              questions={selectedAgent.app_preset.suggested_questions}
              onQuestionClick={handleSuggestedQuestion}
              className={isMobile ? 'w-screen px-4' : 'w-full mx-2 max-w-3xl'}
            />
          )}
        </div>
        {/* 固定在屏幕底部的输入区域 */}
        <div className={cn(
          "w-full flex justify-center transition-all duration-300",
          isMobile ? "mb-0 pb-safe-area-inset-bottom" : "mb-3"
        )}>
          {/* 输入区域 */}
          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={handleSendMessage}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isStreaming || !selectedAgent}
            isLoading={isLoading || isStreaming}
            isStreaming={isStreaming}
            className="w-full mx-2 max-w-3xl"
          />
        </div>
      </div>

      {/* 消息编辑对话框 */}
      <MessageEditDialog
        isOpen={editingMessage !== null}
        onClose={() => {
          setEditingMessage(null);
          setEditingMessageIndex(-1);
        }}
        message={editingMessage}
        messageIndex={editingMessageIndex}
        onSave={handleSaveEditedMessage}
      />
    </div>
  );
} 