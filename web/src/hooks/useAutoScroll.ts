import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 自动滚动到底部的hook，支持用户主动滚动时打断自动滚动
 * @param dependencies 依赖数组，当这些值变化时会触发滚动
 * @param threshold 距离底部多少像素时认为用户在底部附近，默认100px
 */
export function useAutoScroll(dependencies: any[] = [], threshold: number = 100) {
  const endRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastScrollTimeRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout>();

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
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    console.log("scrollToBottom")
    if (!isUserScrolling) {
      endRef.current?.scrollIntoView({ behavior: behavior });
    }
  }, [isUserScrolling]);

  // 强制滚动到底部（忽略用户滚动状态）
  const forceScrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsUserScrolling(false);
    setIsAtBottom(true);
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;
    
    // 如果滚动间隔很短，认为是用户主动滚动
    if (timeSinceLastScroll < 1000) {
      setIsUserScrolling(true);
      
      // 清除之前的定时器
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      
      // 500ms后重置用户滚动状态
      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 500);
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

  // 当依赖项变化时，如果用户没有主动滚动且在底部附近，则自动滚动
  useEffect(() => {
    if (!isUserScrolling && isAtBottom) {
      scrollToBottom();
    }
  }, [...dependencies, isUserScrolling, isAtBottom]);

  return { 
    endRef, 
    scrollToBottom: forceScrollToBottom,
    isUserScrolling,
    isAtBottom 
  };
} 