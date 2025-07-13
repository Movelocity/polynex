import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { 
  Send, 
  Loader2,
} from 'lucide-react';
import cn from 'classnames';

// 建议问题组件
interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  className?: string;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ questions, onQuestionClick, className }) => (
  <div className={cn("flex items-center gap-1", className)}>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-theme-blue to-theme-indigo flex items-center justify-center">
        <span className="text-white text-xs">💡</span>
      </div>
      <p className="text-sm font-medium text-foreground hidden md:block">试试这样问</p>
    </div>
    <div className="flex flex-1 gap-2 overflow-x-scroll" style={{scrollbarWidth: 'none'}}>
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
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  isLoading: boolean;
  isStreaming?: boolean;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  isLoading,
  isStreaming,
  className
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // 最小高度 30px，最大高度 200px
      const newHeight = Math.min(Math.max(scrollHeight, 30), 200);
      console.log('newHeight', newHeight);
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
  const maxChars = 200000; // 设置最大字符数
  const isNearLimit = charCount > maxChars * 0.8;
  const isOverLimit = charCount > maxChars;

  return (
    <div className={cn("", className)}>
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
              name="chat-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入消息..."
              disabled={disabled || isOverLimit}
              maxLength={maxChars}
              className={cn(
                'w-full max-h-[200px] resize-none bg-transparent border-none',
                'text-base leading-6 placeholder:text-muted-foreground focus:outline-none focus:ring-0',
                disabled && 'cursor-not-allowed',
                isOverLimit ? 'text-destructive' : 'text-foreground'
              )}
              style={{ 
                fontSize: '16px', // 防止移动端缩放
                lineHeight: '1.5',
                scrollbarWidth: 'none'
              }}
              rows={1}
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