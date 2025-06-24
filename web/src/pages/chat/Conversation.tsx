import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { Button } from '@/components/x-ui/button';
import { MarkdownPreview } from '@/components/common/markdown-preview';
import { ConversationHistorySidebar } from '@/components/chat/ConversationHistorySidebar';
import { MessageEditDialog } from '@/components/chat/MessageEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { 
  Bot, 
  AlertCircle,
  Loader2,
  ArrowDown
} from 'lucide-react';
import { ConversationHeader } from '@/components/chat/ConversationHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput, SuggestedQuestions } from '@/components/chat/ChatInput';

// 加载状态组件
interface LoadingMessageProps {
  agentName?: string;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ agentName }) => (
  <div className="flex justify-start">
    <div className="flex space-x-3 max-w-[80%]">
      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col items-start">
        <div className="mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            {agentName || 'Assistant'}
          </span>
        </div>
        <div className="bg-gray-100 border rounded-lg px-4 py-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 主组件
export function Conversation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 使用自定义hook管理聊天状态和逻辑
  const {
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
    hasOnlyWelcome,
    shouldShowSuggestedQuestions,
  } = useConversation();

  // 使用自动滚动hook
  const { endRef, scrollToBottom, isUserScrolling, isAtBottom } = useAutoScroll([messages, currentAIResponse]);

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
    <div className="flex h-[calc(100vh-65px)]">
      {/* 侧边栏 */}
      {isSidebarOpen && (
        <div className="w-80 flex-shrink-0">
          <ConversationHistorySidebar
            currentConversationId={conversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="flex-shrink-0">
          <div className="flex items-center">
            
            
            <div className="flex-1">
              <ConversationHeader 
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                selectedAgent={selectedAgent}
                onBack={() => navigate('/chat/agent-management')}
              />
            </div>
          </div>
        </div>

        {/* 对话区域 */}
        <ScrollArea className="flex-1">
          <div className="h-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* 回到底部按钮 */}
            {!isAtBottom && (
              <div className="absolute bottom-20 right-4 z-10">
                <Button
                  onClick={scrollToBottom}
                  size="icon"
                  className="rounded-full shadow-lg"
                  title="回到底部"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* 消息列表 */}
            <div className="h-full py-4 pb-16">
              <div className="space-y-4">
                {messages.length === 0 && selectedAgent && !selectedAgent.app_preset?.greetings && (
                  <div className="text-center text-muted-foreground py-16">
                    <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">开始与 {selectedAgent.app_preset.name} 对话吧</p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <MessageBubble
                    key={index}
                    message={message}
                    index={index}
                    agentName={selectedAgent?.app_preset?.name}
                    onCopy={copyMessage}
                    onEdit={handleEditMessage}
                    copiedIndex={copiedIndex}
                  />
                ))}
                
                {/* 显示当前流式AI响应 */}
                {isStreaming && currentAIResponse && (
                  <div className="flex justify-start">
                    <div className="flex space-x-3 max-w-[80%]">
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="mb-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            {selectedAgent?.app_preset?.name || 'Assistant'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            正在输入...
                          </span>
                        </div>
                        <div className="bg-muted/50 text-foreground border border-border rounded-lg px-3 py-2">
                          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <MarkdownPreview content={currentAIResponse} />
                          </div>
                          {/* 打字机效果光标 */}
                          <span className="inline-block w-2 h-4 bg-theme-blue ml-1 animate-pulse"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading && !isStreaming && (
                  <LoadingMessage agentName={selectedAgent?.app_preset?.name} />
                )}
                
                <div ref={endRef} />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 固定在屏幕底部的输入区域 */}
        <div className="flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            {/* 建议问题区域 */}
            {shouldShowSuggestedQuestions && (
              <div className="p-2">
                <SuggestedQuestions
                  questions={selectedAgent.app_preset.suggested_questions}
                  onQuestionClick={handleSuggestedQuestion}
                />
              </div>
            )}

            {/* 输入区域 */}
            <ChatInput
              value={inputMessage}
              onChange={setInputMessage}
              onSend={handleSendMessage}
              onKeyPress={handleKeyPress}
              disabled={isLoading || isStreaming || !selectedAgent}
              isLoading={isLoading || isStreaming}
              isStreaming={isStreaming}
            />
          </div>
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