import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { 
  Send, 
  Loader2,
} from 'lucide-react';
import cn from 'classnames';
import { toast } from '@/hooks/use-toast';

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
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 监听视口高度变化（键盘弹出/收起）
  useEffect(() => {
    if (!isMobile) return;

    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;
      
      // 如果高度差超过150px，认为键盘弹出
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
      } else {
        setKeyboardHeight(0);
      }
    };

    // 优先使用 visualViewport API
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport?.removeEventListener('resize', handleViewportChange);
    } else {
      // 降级到 window resize 事件
      window.addEventListener('resize', handleViewportChange);
      return () => window.removeEventListener('resize', handleViewportChange);
    }
  }, [isMobile]);

  // 移动端键盘弹出时滚动到输入框
  useEffect(() => {
    if (!isMobile || !isFocused) return;

    const scrollToInput = () => {
      if (textareaRef.current) {
        // 延迟执行，确保键盘完全展开
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({
            behavior: 'instant',
            block: 'center'
          });
        }, 300);
      }
    };

    scrollToInput();
  }, [isFocused, isMobile, keyboardHeight]);

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

  const handleFocus = () => {
    setIsFocused(true);
    
    // 移动端额外处理
    if (isMobile) {
      // 确保视口不会被缩放
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // 移动端恢复视口设置
    if (isMobile) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 也可以发送
    // if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    //   e.preventDefault();
    //   toast.success({title: "已成功中止AI生成", description: e.key+":"+e.keyCode});
    //   onSend();
    //   return;
    // }
    
    // Enter 发送，Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if(e.keyCode === 13) {  // mac 无法区分输入法模式下的 Enter, 必须用 keyCode 来判断
        toast.success({title: "发送", description: e.key+":"+e.keyCode});
        onSend();
      }
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
        'relative bg-card border border-border rounded-xl shadow-lg transition-all duration-200',
        isFocused ? 'ring-1 ring-theme-blue/70 shadow-xl' : 'hover:shadow-xl',
        disabled && 'opacity-50'
      )}>
        {/* 输入区域容器 */}
        <div className="flex items-end px-4 py-2 pb-0">
          {/* 文本输入区域 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              name="chat-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="请输入问题"
              disabled={disabled || isOverLimit}
              maxLength={maxChars}
              className={cn(
                'w-full max-h-[200px] resize-none bg-transparent border-none',
                'text-base leading-6 placeholder:text-muted-foreground focus:outline-none focus:ring-0',
                disabled && 'cursor-not-allowed',
                isOverLimit ? 'text-destructive' : 'text-foreground'
              )}
              style={{ 
                fontSize: '14px', // 防止移动端缩放
                lineHeight: '1.5',
                scrollbarWidth: 'none'
              }}
              rows={1}
            />
          </div>
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* 快捷键提示 */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground/80">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl/Cmd</kbd>
              <span>发送</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift+Enter</kbd>
              <span>换行</span>
            </span>

            {/* 字符计数 */}
            {isNearLimit && (
              <div className={cn(
                'text-xs transition-colors',
                isOverLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : 'text-muted-foreground'
              )}>
                {charCount}/{maxChars}
              </div>
            )}
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