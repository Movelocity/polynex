import { useEffect } from 'react';

/**
 * 自定义hook，用于设置页面标题
 * @param title - 页面标题
 * @param baseTitle - 基础标题，默认为 "FastDraft"
 */
export function usePageTitle(title: string, baseTitle: string = 'FastDraft') {
  useEffect(() => {
    // 设置完整的页面标题
    const fullTitle = title ? `${title} - ${baseTitle}` : baseTitle;
    document.title = fullTitle;

    // 清理函数：组件卸载时可以选择重置标题
    return () => {
      // 可选：重置为基础标题，或者保持当前标题
      // document.title = baseTitle;
    };
  }, [title, baseTitle]);
}

/**
 * 简化版本的hook，只需要传入页面标题
 * @param title - 页面标题
 */
export function useTitle(title: string) {
  return usePageTitle(title);
} 