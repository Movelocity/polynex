import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { MarkdownPreview } from '@/components/common/markdown-preview';
import { ConversationHistorySidebar } from '@/components/chat/ConversationHistorySidebar';
import { MessageEditDialog } from '@/components/chat/MessageEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation } from '@/hooks/useConversation';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { ConversationMessage, ChatRequest } from '@/types';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Edit,
  Sidebar,
  X
} from 'lucide-react';
import cn from 'classnames';

// 对话头部组件
interface ConversationHeaderProps {
  selectedAgent: any;
  onBack: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({ selectedAgent, onBack, isSidebarOpen, setIsSidebarOpen }) => (
  <div className="bg-background border-b border-border">
    <div className="px-4 py-4">
      <div className="flex items-center space-x-4">
        {/* 侧边栏切换按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          
        >
          <Sidebar className="h-4 w-4" />
        </Button>
        {selectedAgent && (
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-theme-blue" />
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-foreground">{selectedAgent.app_preset.name}</span>
              <span className="text-sm text-muted-foreground">
                {selectedAgent.provider} • {selectedAgent.model}
              </span>
            </div>
            <Badge variant={selectedAgent.is_public ? "default" : "secondary"}>
              {selectedAgent.is_public ? 'public' : 'private'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  </div>
);

// 消息操作栏组件
interface MessageActionsProps {
  message: ConversationMessage;
  index: number;
  onCopy: (content: string, index: number) => void;
  onEdit: (message: ConversationMessage, index: number) => void;
  copiedIndex: number | null;
  isUser: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({ 
  message, 
  index, 
  onCopy, 
  onEdit,
  copiedIndex,
  isUser 
}) => (
  <div className={cn(
    'flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
    isUser ? 'justify-end' : 'justify-start'
  )}>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs hover:bg-muted"
      onClick={() => onEdit(message, index)}
    >
      <Edit className="h-3 w-3" />
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs hover:bg-muted"
      onClick={() => onCopy(message.content, index)}
    >
      {copiedIndex === index ? (
        <>
          <Check className="h-3 w-3" />
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
        </>
      )}
    </Button>
  </div>
);

// 消息气泡组件
interface MessageBubbleProps {
  message: ConversationMessage;
  index: number;
  agentName?: string;
  onCopy: (content: string, index: number) => void;
  onEdit: (message: ConversationMessage, index: number) => void;
  copiedIndex: number | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  index, 
  agentName, 
  onCopy, 
  onEdit,
  copiedIndex 
}) => (
  <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
    <div className={cn(
      'flex space-x-3 max-w-[80%]',
      message.role === 'user' && 'flex-row-reverse space-x-reverse'
    )}>
      {/* 头像 */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        message.role === 'user' ? 'bg-theme-blue' : 'bg-gray-600'
      )}>
        {message.role === 'user' ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </div>
      
      {/* 消息内容 */}
      <div className={cn(
        'flex flex-col group',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}>
        {/* 名字和时间 */}
        <div className={cn('mb-1', message.role === 'user' ? 'text-right' : 'text-left')}>
          <span className="text-xs text-muted-foreground font-medium">
            {message.role === 'user' ? '你' : agentName || 'Assistant'}
          </span>
          {message.timestamp && (
            <span className="text-xs text-muted-foreground ml-2">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* 消息气泡 */}
        <div className={cn(
          'rounded-lg px-3 py-2',
          message.role === 'user' 
            ? 'bg-theme-blue text-white' 
            : 'bg-muted/50 text-foreground border border-border'
        )}>
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <MarkdownPreview content={message.content} />
            </div>
          ) : (
            <p className="whitespace-pre-wrap m-0">{message.content}</p>
          )}
        </div>
        
        {/* 操作栏 */}
        <MessageActions
          message={message}
          index={index}
          onCopy={onCopy}
          onEdit={onEdit}
          copiedIndex={copiedIndex}
          isUser={message.role === 'user'}
        />
      </div>
    </div>
  </div>
);

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

// 建议问题组件
interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ questions, onQuestionClick }) => (
  <div className="flex items-center space-x-3">
    <div className="flex items-center space-x-2 flex-shrink-0">
      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-theme-blue to-theme-indigo flex items-center justify-center">
        <span className="text-white text-xs">💡</span>
      </div>
      <p className="text-sm font-medium text-foreground">试试这样问</p>
    </div>
    <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      {questions.map((question: string, index: number) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onQuestionClick(question)}
          className="
            text-xs h-8 px-3 rounded-md border border-border/60 
            bg-background hover:bg-theme-blue/5 hover:border-theme-blue/30 
            text-muted-foreground hover:text-theme-blue transition-colors
            flex-shrink-0 whitespace-nowrap
          "
        >
          {question}
        </Button>
      ))}
    </div>
  </div>
);

// 消息输入组件
interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  isLoading: boolean;
  isStreaming?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  isLoading,
  isStreaming
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // 最小高度 60px，最大高度 200px
      const newHeight = Math.min(Math.max(scrollHeight, 60), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 也可以发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
      return;
    }
    
    // Enter 发送，Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      return;
    }
    
    // 调用原有的 onKeyPress
    onKeyPress(e);
  };

  const charCount = value.length;
  const maxChars = 2000; // 设置最大字符数
  const isNearLimit = charCount > maxChars * 0.8;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="flex-shrink-0">
      <div className={cn(
        'relative bg-card border border-border rounded-2xl shadow-lg transition-all duration-200',
        isFocused ? 'ring-2 ring-theme-blue/70 shadow-xl' : 'hover:shadow-xl',
        disabled && 'opacity-50'
      )}>
        {/* 输入区域容器 */}
        <div className="flex items-end px-4 py-2 space-x-3">
          {/* 文本输入区域 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入消息..."
              disabled={disabled || isOverLimit}
              maxLength={maxChars}
              className={cn(
                'w-full min-h-[60px] max-h-[200px] resize-none bg-transparent border-none',
                'text-base leading-6 placeholder:text-muted-foreground focus:outline-none focus:ring-0',
                disabled && 'cursor-not-allowed',
                isOverLimit ? 'text-destructive' : 'text-foreground'
              )}
              style={{ 
                fontSize: '16px', // 防止移动端缩放
                lineHeight: '1.5'
              }}
            />
            
            {/* 字符计数 */}
            {charCount > 0 && (
              <div className={cn(
                'absolute -bottom-1 right-0 text-xs transition-colors',
                isOverLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : 'text-muted-foreground'
              )}>
                {charCount}/{maxChars}
              </div>
            )}
          </div>
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* 快捷键提示 */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd>
              <span>发送</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift+Enter</kbd>
              <span>换行</span>
            </span>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center space-x-2">
            {(isLoading || isStreaming) && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-theme-blue rounded-full animate-pulse"></div>
                <span>{isStreaming ? "正在接收回复..." : "正在发送..."}</span>
              </div>
            )}
            {/* 发送按钮 */}
            <div className="flex-shrink-0">
              <Button 
                variant="attractive"
                onClick={onSend}
                disabled={disabled || !value.trim() || isOverLimit}
                size="icon"
                className="rounded-xl"
              >
                {(isLoading || isStreaming) ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 " />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const { endRef } = useAutoScroll([messages, currentAIResponse]);



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
          <div className="h-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 消息列表 */}
            <div className="h-full py-4 pb-32 mb-32">
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
            <MessageInput
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