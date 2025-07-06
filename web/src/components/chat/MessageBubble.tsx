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
import { AvatarConfig } from '@/types';
import { AgentAvatar } from './AgentAvatar';

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
  copiedIndex: number | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  index, 
  agentName, 
  avatar,
  onCopy, 
  onEdit,
  copiedIndex 
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  return (
    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'flex space-x-3 max-w-[80%]',
        message.role === 'user' && 'flex-row-reverse space-x-reverse'
      )}>
        {/* 头像 */}
        {avatar ? (
          <AgentAvatar avatar={avatar} name={agentName} size="md" />
        ) : (
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
        )}
        
        {/* 消息内容 */}
        <div className={cn(
          'flex flex-col group justify-start',
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
            'rounded-lg px-3 py-2',
            message.role === 'user' 
              ? 'bg-theme-blue text-white' 
              : 'bg-muted/50 text-foreground border border-border'
              // 'bg-[#f0f0f0] dark:bg-[#3a3f3f] text-[#212529] dark:text-[#dfe6e9] border border-border'
          )}>
            {message.role === 'assistant' && message.reasoning_content && (
              <div className="flex flex-col items-center mb-2 w-full">
                <div className="text-xs flex items-center justify-between w-full cursor-pointer" onClick={() => setIsReasoningOpen(!isReasoningOpen)}>
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    思考过程
                  </span>
                  {isReasoningOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className={cn(
                  'mt-2 px-2 overflow-hidden transition-all duration-300',
                  isReasoningOpen ? 'max-h-[1000px]' : 'max-h-0'
                )}>
                  <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {message.reasoning_content.trim()}
                  </span>
                </div>
              </div>
            )}
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
  )
}