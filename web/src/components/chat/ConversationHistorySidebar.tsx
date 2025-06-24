import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { Separator } from '@/components/x-ui/separator';
import { conversationService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { Conversation } from '@/types';
import { 
  MessageCircle, 
  Trash2, 
  Clock, 
  MessageSquare,
  Bot,
  ChevronRight,
  Plus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import cn from 'classnames';

interface ConversationHistorySidebarProps {
  currentConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  className?: string;
}

export const ConversationHistorySidebar: React.FC<ConversationHistorySidebarProps> = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className
}) => {
  const { user } = useAuth();
  const { agents } = useAgents();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载对话列表
  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await conversationService.getConversations({ limit: 50 });
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "错误",
        description: "加载对话历史失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // 删除对话
  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      await conversationService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      toast({
        title: "成功",
        description: "对话删除成功",
      });
    } catch (error) {
      toast({
        title: "错误",
        description: "删除对话失败",
        variant: "destructive",
      });
    }
  };

  // 获取Agent名称
  const getAgentName = (agentId: string | null) => {
    if (!agentId) return '未知助手';
    const agent = agents.find(a => a.agent_id === agentId);
    return agent?.name || '未知助手';
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

  return (
    <div className={cn("flex flex-col h-full bg-background border-r border-border", className)}>
      {/* 头部 */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-semibold text-foreground">对话历史</span>
            <span className="text-xs text-muted-foreground">
              共 {conversations.length} 个对话
            </span>
          </div>

          {onNewConversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-theme-blue"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无对话历史</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative rounded-lg p-3 cursor-pointer transition-all hover:bg-muted/50",
                    currentConversationId === conversation.id ? "bg-theme-blue/10 border border-theme-blue/30" : "hover:bg-muted"
                  )}
                  onClick={() => onConversationSelect?.(conversation.id)}
                >
                  {/* 主要内容 */}
                  <div className="flex items-start space-x-3">
                    {/* 图标 */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-lg bg-theme-blue/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-theme-blue" />
                      </div>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题 */}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-foreground truncate pr-2">
                          {conversation.title || '未命名对话'}
                        </h3>
                        {currentConversationId === conversation.id && (
                          <ChevronRight className="h-3 w-3 text-theme-blue flex-shrink-0" />
                        )}
                      </div>

                      {/* Agent 和消息数量 */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="flex items-center space-x-2">
                          <span className="truncate">
                            {getAgentName(conversation.agent_id)}
                          </span>
                          <span className="flex items-center space-x-1 flex-shrink-0">
                            <MessageSquare className="h-3 w-3" />
                            <span>{conversation.messages?.length || 0}</span>
                          </span>
                        </span>
                        {/* 时间 */}
                        <div className="flex items-center text-xs text-muted-foreground">
                          {/* <Clock className="h-3 w-3 mr-1" /> */}
                          <span>{formatTime(conversation.update_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 删除按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}; 