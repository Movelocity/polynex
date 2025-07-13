import { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { ExtendedAgentMessage } from '@/types/agent';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
} from 'lucide-react';
import { Textarea } from '@/components/x-ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/x-ui/dropdown-menu';
import { 
  Copy,
  Trash2, 
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBlockProps {
  message: ExtendedAgentMessage;
  index: number;
  isSystemMessage: boolean;
  messageCount: number;
  isSelected: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onUpdateMessage: (index: number, field: keyof ExtendedAgentMessage, value: any) => void;
  onRemoveMessage: (index: number) => void;
  onCopyMessageContent: (content: string) => void;
}

export function MessageBlock({
  message,
  index,
  isSystemMessage,
  messageCount,
  isSelected,
  onFocus,
  onBlur,
  onUpdateMessage,
  onRemoveMessage,
  onCopyMessageContent
}: MessageBlockProps) {
  return (
    <div className={cn(
      "border-2 border-transparent rounded-lg bg-muted overflow-hidden",
      isSelected && "bg-gradient-to-r from-blue-500 to-indigo-500"
    )}>
      {/* Message Block Header */}
      <div>
        <div className="flex items-center justify-between bg-secondary px-1 py-0.5">
          {/* Role Selector with Dropdown */}
          <div className="flex items-center space-x-2">
            {isSystemMessage ? (
              <span className="text-sm font-bold ml-2 text-foreground">System Message</span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3"
                    disabled={isSystemMessage}
                  >
                    {message.role.toUpperCase()}
                    {!isSystemMessage && <ChevronDown className="h-3 w-3 ml-1" />}
                  </Button>
                </DropdownMenuTrigger>
              
                <DropdownMenuContent align="start" className="w-32">
                  <div className="p-1 space-y-1">
                    {['user', 'assistant', 'system'].map((role) => (
                      <Button
                        key={role}
                        variant={message.role === role ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => onUpdateMessage(index, 'role', role)}
                      >
                        {role.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Toolbar and Metadata */}
          <div className="flex items-center space-x-2">
            {/* Action Icons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onCopyMessageContent(message.content)}
                title="复制内容"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              
              {!isSystemMessage && messageCount > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => onRemoveMessage(index)}
                  title="删除消息"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Message Content Area */}
        <div className="space-y-2">
          <Textarea
            placeholder={isSystemMessage ? "输入系统提示词..." : "输入消息内容..."}
            value={message.content}
            onChange={(e) => onUpdateMessage(index, 'content', e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            rows={isSystemMessage ? 16 : 4}
            className={cn(
              isSystemMessage ? 'min-h-[320px]' : 'min-h-[80px]', 
              "border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            )}
          />
        </div>
      </div>
    </div>
  );
} 



interface PromptEditorProps {
  messages: ExtendedAgentMessage[];
  onMessagesChange: (messages: ExtendedAgentMessage[]) => void;
  className?: string;
}

export function PromptEditor({ messages, onMessagesChange, className = '' }: PromptEditorProps) {

  const [selectedIndex, setSelectedIndex] = useState(0);
  // 确保第一个消息始终是系统消息
  useEffect(() => {
    if (messages.length === 0 || messages[0].role !== 'system') {
      const systemMessage: ExtendedAgentMessage = {
        role: 'system',
        content: '你是一个友好且有用的AI助手。',
        template_enabled: false,
        token_count: 0
      };
      const existingMessages = messages.filter(msg => msg.role !== 'system');
      const newMessages = [systemMessage, ...existingMessages];
      onMessagesChange(newMessages);
    }
  }, [messages, onMessagesChange]);

  // 计算消息token数量的简单估算函数
  const estimateTokenCount = (content: string): number => {
    // 简单的token估算：中文字符按1个token，英文单词按0.75个token计算
    const chineseCharCount = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWordCount = (content.match(/[a-zA-Z]+/g) || []).length;
    return Math.ceil(chineseCharCount + englishWordCount * 0.75);
  };

  const updateMessage = (index: number, field: keyof ExtendedAgentMessage, value: any) => {
    const updatedMessages = messages.map((msg, i) => {
      if (i === index) {
        const updatedMsg = { ...msg, [field]: value };
        // 如果更新的是content，自动计算token数量
        if (field === 'content') {
          updatedMsg.token_count = estimateTokenCount(value);
        }
        return updatedMsg;
      }
      return msg;
    });
    onMessagesChange(updatedMessages);
  };

  const addMessage = () => {
    const newMessage: ExtendedAgentMessage = { 
      role: 'user', 
      content: '',
      template_enabled: false,
      token_count: 0
    };
    onMessagesChange([...messages, newMessage]);
  };

  const removeMessage = (index: number) => {
    // 禁止删除第一个消息（系统消息）
    if (index === 0) {
      toast({
        title: '无法删除',
        description: '系统消息不能删除',
        variant: 'destructive'
      });
      return;
    }
    
    const updatedMessages = messages.filter((_, i) => i !== index);
    onMessagesChange(updatedMessages);
  };

  const copyMessageContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: '复制成功',
        description: '消息内容已复制到剪贴板'
      });
    } catch (error) {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {messages.map((message, index) => {
        const isSystemMessage = index === 0; // 第一个消息是系统消息
        return (
          <MessageBlock
            key={index}
            message={message}
            index={index}
            isSystemMessage={isSystemMessage}
            messageCount={messages.length}
            isSelected={selectedIndex === index}
            onFocus={() => setSelectedIndex(index)}
            onBlur={() => setSelectedIndex(0)}
            onUpdateMessage={updateMessage}
            onRemoveMessage={removeMessage}
            onCopyMessageContent={copyMessageContent}
          />
        );
      })}
      
      {/* Add Message Button */}
      <Button
        variant="outline"
        onClick={addMessage}
        className="w-full h-8 border-dashed border-2 hover:border-solid"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Message
      </Button>
    </div>
  );
} 