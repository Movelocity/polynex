import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
  role: string;
  content: string;
  reasoning_content?: string;
}

/**
 * 智能自动滚动到底部的hook，支持用户主动滚动时打断自动滚动
 * 主要在最后一条消息更新时触发滚动
 * @param messages 消息数组
 * @param currentAIResponse 当前AI响应内容（流式）
 * @param currentAIReasoning 当前AI推理内容（流式）
 * @param threshold 距离底部多少像素时认为用户在底部附近，默认100px
 */
export function useAutoScroll(
  messages: Message[] = [], 
  currentAIResponse: string = '', 
  currentAIReasoning: string = '',
  threshold: number = 100
) {
  const endRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastScrollTimeRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 跟踪最后一条消息的状态
  const lastMessageRef = useRef<string>('');
  const lastAIResponseRef = useRef<string>('');
  const lastAIReasoningRef = useRef<string>('');
  const messageCountRef = useRef<number>(0);
  const isScrollingToNewMessageRef = useRef<boolean>(false);

  // 查找实际的滚动容器
  const findScrollContainer = useCallback(() => {
    // 查找滚动容器，可能是 ScrollArea 的 Viewport 或其他滚动容器
    let scrollContainer = endRef.current?.parentElement;
    
    // 如果找到的是 ScrollArea 的内容区域，需要找到实际的滚动容器
    while (scrollContainer && !scrollContainer.classList.contains('overflow-auto') && 
           scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
      scrollContainer = scrollContainer.parentElement;
    }
    
    // 特殊处理 Radix ScrollArea - 查找带有 data-radix-scroll-area-viewport 的元素
    if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
      const viewport = endRef.current?.closest('[data-radix-scroll-area-viewport]');
      if (viewport) {
        scrollContainer = viewport as HTMLElement;
      }
    }
    
    return scrollContainer;
  }, []);

  // 检查是否在底部附近
  const checkIfAtBottom = useCallback(() => {
    const scrollContainer = findScrollContainer();
    if (!scrollContainer) return false;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold, findScrollContainer]);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth', force: boolean = false) => {
    console.log("scrollToBottom - isUserScrolling:", isUserScrolling, "force:", force);
    
    // 如果是强制滚动或者用户没有在滚动且在底部附近，则执行滚动
    if (force || (!isUserScrolling && isAtBottom)) {
      isScrollingToNewMessageRef.current = true;
      endRef.current?.scrollIntoView({ behavior: behavior });
      
      // 短暂标记为程序性滚动，避免触发用户滚动检测
      setTimeout(() => {
        isScrollingToNewMessageRef.current = false;
      }, 100);
    }
  }, [isUserScrolling, isAtBottom]);

  // 强制滚动到底部（忽略用户滚动状态）
  const forceScrollToBottom = useCallback(() => {
    scrollToBottom('instant', true);
    setIsUserScrolling(false);
    setIsAtBottom(true);
  }, [scrollToBottom]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    // 如果是程序性滚动，忽略此次滚动事件
    if (isScrollingToNewMessageRef.current) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;
    
    // 如果滚动间隔很短，认为是用户主动滚动
    if (timeSinceLastScroll < 1000) {
      setIsUserScrolling(true);
      
      // 清除之前的定时器
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      
      // 1000ms后重置用户滚动状态（增加时间以避免误判）
      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    }
    
    lastScrollTimeRef.current = now;
    
    // 检查是否在底部
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    
    // 如果用户滚动到底部附近，恢复自动滚动
    if (atBottom) {
      setIsUserScrolling(false);
    }
  }, [checkIfAtBottom]);

  // 监听滚动事件
  useEffect(() => {
    const scrollContainer = findScrollContainer();
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [handleScroll, findScrollContainer]);

  // 智能滚动：检测新消息或消息更新
  useEffect(() => {
    const hasNewMessage = messages.length > messageCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = lastMessage ? `${lastMessage.content}${lastMessage.reasoning_content || ''}` : '';
    const hasMessageContentChanged = lastMessageContent !== lastMessageRef.current;
    
    // 检测AI流式响应的变化
    const hasAIResponseChanged = currentAIResponse !== lastAIResponseRef.current;
    const hasAIReasoningChanged = currentAIReasoning !== lastAIReasoningRef.current;
    
    console.log('Auto scroll check:', {
      hasNewMessage,
      hasMessageContentChanged,
      hasAIResponseChanged,
      hasAIReasoningChanged,
      isUserScrolling,
      isAtBottom,
      messageCount: messages.length,
      lastMessageContent: lastMessageContent.slice(0, 50) + '...'
    });
    
    // 如果有新消息、消息内容变化、或AI响应变化，且用户没有主动滚动，则自动滚动
    if ((hasNewMessage || hasMessageContentChanged || hasAIResponseChanged || hasAIReasoningChanged) && 
        (!isUserScrolling || isAtBottom)) {
      
      // 对于新消息，使用smooth滚动；对于内容更新，使用instant滚动
      const behavior = hasNewMessage ? 'smooth' : 'instant';
      scrollToBottom(behavior);
    }
    
    // 更新引用值
    messageCountRef.current = messages.length;
    lastMessageRef.current = lastMessageContent;
    lastAIResponseRef.current = currentAIResponse;
    lastAIReasoningRef.current = currentAIReasoning;
  }, [messages, currentAIResponse, currentAIReasoning, isUserScrolling, isAtBottom, scrollToBottom]);

  // 初始化时滚动到底部
  useEffect(() => {
    if (messages.length === 0) {
      scrollToBottom('instant', true);
    }
  }, [messages.length, scrollToBottom]);

  return { 
    endRef, 
    scrollToBottom: forceScrollToBottom,
    isUserScrolling,
    isAtBottom 
  };
} 