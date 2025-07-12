import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/x-ui/dialog';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { Badge } from '@/components/x-ui/badge';
import { Separator } from '@/components/x-ui/separator';
import { useChatSearch } from '@/hooks/useChatSearch';
import { ConversationSearchResult } from '@/types';
import {
  Search,
  MessageCircle,
  Clock,
  ChevronRight,
  Loader2,
  X,
  MoreHorizontal
} from 'lucide-react';

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationSelect?: (conversationId: string) => void;
}

export const ChatSearchDialog: React.FC<ChatSearchDialogProps> = ({
  open,
  onOpenChange,
  onConversationSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const {
    searchResults,
    totalCount,
    currentQuery,
    isSearching,
    hasSearched,
    searchConversations,
    clearResults,
    resetSearch,
  } = useChatSearch();

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 执行搜索
  useEffect(() => {
    if (debouncedQuery.trim() && open) {
      searchConversations(debouncedQuery);
    } else if (!debouncedQuery.trim()) {
      clearResults();
    }
  }, [debouncedQuery, open, searchConversations, clearResults]);

  // 加载更多
  const handleLoadMore = () => {
    if (currentQuery && searchResults.length < totalCount) {
      searchConversations(currentQuery, 20, searchResults.length);
    }
  };

  // 选择对话
  const handleSelectConversation = (conversation: ConversationSearchResult) => {
    onConversationSelect?.(conversation.id);
    onOpenChange(false);
  };

  // 清空搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    clearResults();
  };

  // 关闭对话框时重置
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      resetSearch();
    }
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return time.toLocaleDateString();
  };

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center space-x-2 text-foreground">
            <Search className="h-5 w-5" />
            <span className="font-bold text-lg">搜索对话历史</span>
            {/* 搜索统计 */}
            {hasSearched && (
              <div className="flex-shrink-0 text-sm text-muted-foreground">
                {totalCount > 0 ? (
                  <span>找到 {totalCount} 个匹配的对话</span>
                ) : (
                  <span>没有找到匹配的对话</span>
                )}
              </div>
            )}
          </div>
          
        </DialogHeader>

        {/* 搜索输入框 */}
        <div className="flex-shrink-0 relative">
          <Input
            placeholder="搜索对话标题和内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-20 text-foreground"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="flex-1 h-96 min-h-96 max-h-96 overflow-auto">
          {!hasSearched && !isSearching ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">输入关键词搜索对话历史</p>
              </div>
            </div>
          ) : searchResults.length === 0 && hasSearched && !isSearching ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <div className="text-center"> 
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">没有找到匹配的对话</p>
                <p className="text-xs mt-1">尝试使用不同的关键词</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 p-1 max-w-[600px]">
                {searchResults.map((conversation, index) => (
                  <div
                    key={`${conversation.id}-${index}`}
                    className="group p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    {/* 头部 */}
                    <div className="flex items-start justify-between mb-2 break-words flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate pr-2 break-words">
                          {highlightText(conversation.title || '未命名对话', currentQuery)}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {conversation.match_count} 处匹配
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>

                    {/* 上下文预览 */}
                    <div className="text-xs text-muted-foreground mb-2 line-clamp-2 break-words">
                      {highlightText(conversation.context, currentQuery)}
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>更新于 {formatTime(conversation.update_time)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>会话ID:</span>
                        <code className="text-xs bg-muted px-1 rounded">
                          {conversation.session_id.slice(0, 8)}...
                        </code>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 加载更多按钮 */}
                {/* {searchResults.length > 0 && searchResults.length < totalCount && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isSearching}
                      className="h-8 text-xs"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        <>
                          <MoreHorizontal className="h-3 w-3 mr-1" />
                          加载更多 ({searchResults.length}/{totalCount})
                        </>
                      )}
                    </Button>
                  </div>
                )} */}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 