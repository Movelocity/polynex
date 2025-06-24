import { useEffect, useRef } from 'react';

/**
 * 自动滚动到底部的hook
 * @param dependencies 依赖数组，当这些值变化时会触发滚动
 */
export function useAutoScroll(dependencies: any[] = []) {
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, dependencies);

  return { endRef, scrollToBottom };
} 