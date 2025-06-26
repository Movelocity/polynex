import { useState, useCallback } from 'react';
import { conversationService } from '@/services';
import { SearchRequest, SearchResponse, ConversationSearchResult } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface UseChatSearchReturn {
  // 状态
  searchResults: ConversationSearchResult[];
  totalCount: number;
  currentQuery: string;
  isSearching: boolean;
  hasSearched: boolean;
  
  // 方法
  searchConversations: (query: string, limit?: number, offset?: number) => Promise<void>;
  clearResults: () => void;
  resetSearch: () => void;
}

/**
 * 对话搜索自定义Hook
 * 提供搜索用户对话的功能
 */
export function useChatSearch(): UseChatSearchReturn {
  const [searchResults, setSearchResults] = useState<ConversationSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * 搜索对话
   * @param query 搜索关键词
   * @param limit 返回结果数量限制，默认20
   * @param offset 结果偏移量，默认0
   */
  const searchConversations = useCallback(async (
    query: string, 
    limit: number = 20, 
    offset: number = 0
  ) => {
    if (!query.trim()) {
      toast({
        title: "搜索提示",
        description: "请输入搜索关键词",
        variant: "default",
      });
      return;
    }

    // 如果是新的搜索查询，重置结果
    if (query !== currentQuery || offset === 0) {
      setSearchResults([]);
    }

    setIsSearching(true);
    setCurrentQuery(query);

    try {
      const request: SearchRequest = {
        query: query.trim(),
        limit,
        offset
      };

      const response: SearchResponse = await conversationService.searchConversations(request);
      
      // 如果是分页加载，追加结果；否则替换结果
      if (offset > 0) {
        setSearchResults(prev => [...prev, ...response.results]);
      } else {
        setSearchResults(response.results);
      }
      
      setTotalCount(response.total_count);
      setHasSearched(true);

      // 显示搜索结果提示
      if (response.results.length === 0 && offset === 0) {
        toast({
          title: "搜索结果",
          description: `没有找到包含"${query}"的对话`,
          variant: "default",
        });
      } else if (offset === 0) {
        toast({
          title: "搜索完成",
          description: `找到 ${response.total_count} 个匹配的对话`,
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error('Search error:', error);
      
      // 处理不同类型的错误
      let errorMessage = "搜索失败，请稍后重试";
      
      if (error?.response?.status === 400) {
        errorMessage = "搜索关键词格式不正确";
      } else if (error?.response?.status === 401) {
        errorMessage = "您需要先登录才能搜索";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "搜索失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [currentQuery]);

  /**
   * 清空搜索结果（保留搜索状态）
   */
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setTotalCount(0);
  }, []);

  /**
   * 重置搜索状态（清空所有状态）
   */
  const resetSearch = useCallback(() => {
    setSearchResults([]);
    setTotalCount(0);
    setCurrentQuery('');
    setHasSearched(false);
    setIsSearching(false);
  }, []);

  return {
    // 状态
    searchResults,
    totalCount,
    currentQuery,
    isSearching,
    hasSearched,
    
    // 方法
    searchConversations,
    clearResults,
    resetSearch,
  };
} 