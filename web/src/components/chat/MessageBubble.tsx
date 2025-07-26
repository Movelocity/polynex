import React, { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { MarkdownPreview } from '@/components/common/MarkdownPreview';
import { ConversationMessage } from '@/types';
import { 
  Bot, 
  User, 
  Copy,
  Check,
  Edit,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import cn from 'classnames';
import { AvatarConfig } from '@/types/agent';
import { AgentAvatar } from './AgentAvatar';
import { useIsMobile } from '@/hooks/use-mobile';

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
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  </div>
);

// 消息气泡组件
interface MessageBubbleProps {
  message: ConversationMessage;
  index: number;
  agentName?: string;
  avatar?: AvatarConfig;
  onCopy: (content: string, index: number) => void;
  onEdit: (message: ConversationMessage, index: number) => void;
  isReasoning?: boolean;
  defaultReasoningOpen?: boolean;
  copiedIndex: number | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  index, 
  agentName, 
  avatar,
  onCopy, 
  onEdit,
  isReasoning=false,
  defaultReasoningOpen=false,
  copiedIndex 
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(defaultReasoningOpen);
  const isMobile = useIsMobile();
  function fixLatexComments(content: string) {
    return content.replace(/%(?![^\n]*\n)/g, '%\n');
  }
  return (
    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'flex space-x-2 w-full',
        message.role === 'user' && 'flex-row-reverse space-x-reverse'
      )}>
        {/* 头像 */}
        {message.role === 'user' ? (
          <div className={cn(
            'rounded-full flex items-center justify-center flex-shrink-0',
            message.role === 'user' ? 'bg-theme-blue' : 'bg-gray-600',
            isMobile ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            <User className="h-5 w-5 text-white" />
          </div>
        ):(
          <AgentAvatar avatar={avatar} name={agentName} size={isMobile ? 'sm' : 'md'} />
        )}
        
        {/* 消息内容 */}
        <div className={cn(
          'flex flex-col group justify-start min-w-0 flex-1',
          message.role === 'user' ? 'items-end' : 'items-start'
        )}>
          {/* 名字和时间 */}
          <div className={cn(
            'mb-1 text-xs text-muted-foreground flex gap-2', 
            message.role === 'user' ? 'text-right' : 'text-left'
          )}>
            <span>
              {message.role === 'user' ? '你' : agentName || 'Assistant'}
            </span>
            {message.timestamp && (
              <span>
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {/* 消息气泡 */}
          <div className={cn(
            'rounded-lg px-3 py-2 overflow-hidden max-w-[94%]',
            message.role === 'user' 
              ? 'bg-[#d6e2ff] dark:bg-[#1f2329] text-[#1f2329] dark:text-[#fffc]' 
              : 'bg-muted/50 text-foreground border border-border'
          )}>
            {message.role === 'assistant' && message.reasoning_content && (
              <div className="flex flex-col items-center w-full text-sm text-muted-foreground">
                <div className="flex items-center justify-between w-full cursor-pointer" onClick={() => setIsReasoningOpen(!isReasoningOpen)}>
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    {isReasoning? '思考中...' : '思考过程'}
                  </span>
                  {isReasoningOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className={cn(
                  'mt-2 px-2 overflow-hidden transition-all duration-300 w-full',
                  isReasoningOpen ? 'max-h-[1000px]' : 'max-h-0'
                )}>
                  <span className="whitespace-pre-wrap break-words">
                  {fixLatexComments(message.reasoning_content.trim())}
                  </span>
                </div>
              </div>
            )}
            {message.role === 'assistant' ? (
              <div className="prose prose-sm w-full overflow-hidden">
                <MarkdownPreview content={message.content} hardBreak={true} className="text-sm sm:text-base" />
              </div>
            ) : (
              <p className="whitespace-pre-wrap m-0 break-words text-sm sm:text-base">{message.content}</p>
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
  )
}