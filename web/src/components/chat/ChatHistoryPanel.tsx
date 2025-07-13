import React, { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { ScrollArea } from '@/components/x-ui/scroll-area';
import { useAgents } from '@/hooks/useAgents';
import { Conversation, AgentSummary, AgentDetail, AvatarConfig } from '@/types';
import { ChatSearchDialog } from './ChatSearchDialog';
import { 
  MessageCircle, 
  Trash2, 
  MessageSquare,
  ChevronRight,
  Plus,
  Search,
  Users,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/x-ui/tabs"
import { fileService } from '@/services';
import { cn } from '@/lib/utils';
import { AgentAvatar } from './AgentAvatar';
import { CreateAgentDialog } from '@/components/chat';

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  currentConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onNewConversation?: () => void;
  className?: string;
  // For agent switching
  availableAgents: AgentSummary[];
  selectedAgent: AgentDetail | null;
  onAgentSwitch: (agentId: string) => void;
  isLoadingAgents: boolean;
}

const AgentAvatarDisplay = ({ avatar }: { avatar: AvatarConfig }) => {
  const displayLink = avatar?.variant === 'link' ? fileService.resolveFileUrl(avatar.link) : '';
  if (avatar.variant === 'link' && displayLink) {
    return <img src={displayLink} alt="avatar" className="w-8 h-8 rounded-full" />;
  }
  if (avatar.variant === 'emoji' && avatar.emoji) {
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
        style={{ backgroundColor: avatar.bg_color || '#ccc' }}
      >
        {avatar.emoji}
      </div>
    );
  }
  // Fallback
  return <div className="w-8 h-8 rounded-full bg-gray-300" />;
};

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onNewConversation,
  className,
  availableAgents,
  selectedAgent,
  onAgentSwitch,
  isLoadingAgents,
}) => {
  const { agents } = useAgents();
  // const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // 添加快捷键支持 (Ctrl+F 打开搜索)
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.ctrlKey && event.key === 'f') {
  //       event.preventDefault();
  //       setSearchDialogOpen(true);
  //     }
  //   };

  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []);

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

  const [activeTab, setActiveTab] = useState('agents');

  return (
    <div className={cn("flex flex-col bg-background border-r border-border", className)}>
      <Tabs className="flex flex-col h-full" value={activeTab} onValueChange={setActiveTab}>
        <div className="p-2 pb-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agents">
              <Users className="h-4 w-4 mr-2"/>
              Agents
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2"/>
              历史
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="agents" className="flex-grow min-h-0">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {availableAgents.length} 个助手
            </span>
            <CreateAgentDialog 
              trigger={
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="创建新助手">
                  <Plus className="h-4 w-4" />
                </Button>
              }
              onAgentCreated={(agentId) => onAgentSwitch(agentId)}
            />
          </div>
          <ScrollArea className="h-full">
            <div className="px-2">
              {isLoadingAgents ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">正在加载助手...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        "group relative rounded-lg p-3 cursor-pointer hover:bg-muted/50 flex items-center space-x-3",
                        selectedAgent?.id === agent.id ? "bg-theme-blue/10 border border-theme-blue/30" : "hover:bg-muted"
                      )}
                      onClick={() => onAgentSwitch(agent.id)}
                    >
                      {/* <AgentAvatarDisplay avatar={agent.avatar} /> */}
                      <AgentAvatar avatar={agent.avatar} name={agent.name} size="md" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{agent.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                      </div>
                      {selectedAgent?.id === agent.id && (
                        <ChevronRight className="h-3 w-3 text-theme-blue flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="history" className="flex-grow flex flex-col min-h-0">
          {/* 头部 */}
          <div className="flex-shrink-0 p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline space-x-2">
                <span className="text-sm text-muted-foreground">
                  共 {conversations.length} 个对话
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* 搜索按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchDialogOpen(true)}
                  className="h-8 w-8 p-0"
                  title="搜索对话历史"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* 新建对话按钮 */}
                {onNewConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNewConversation}
                    className="h-8 w-8 p-0"
                    title="新建对话"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 pt-0">
              {conversations.length === 0 ? (
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
                        "group relative rounded-lg p-3 cursor-pointer hover:bg-muted/50",
                        currentConversationId === conversation.id ? "bg-theme-blue/10 border border-theme-blue/30" : "hover:bg-muted"
                      )}
                      onClick={() => onConversationSelect?.(conversation.id)}
                    >
                      {/* 主要内容 */}
                      <div className="flex items-start space-x-3">

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          {/* 标题 */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground truncate pr-2 max-w-[240px]" title={conversation.title || '未命名对话'}>
                              {conversation.title || '未命名对话'}
                            </span>
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
                                <span>{conversation.message_count || 0}</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onConversationDelete?.(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      {/* 搜索对话框 */}
      <ChatSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onConversationSelect={onConversationSelect}
      />
    </div>
  );
}; 