import React from 'react';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/x-ui/dropdown-menu';
import { AgentAvatar } from '@/components/chat/AgentAvatar';
import { 
  Bot, 
  Sidebar,
  ChevronDown,
  Users,
  Lock
} from 'lucide-react';
import { AgentSummary } from '@/types';

// 对话头部组件
interface ConversationHeaderProps {
  selectedAgent: any;
  onBack: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  availableAgents?: AgentSummary[];
  onAgentSwitch?: (agentId: string) => void;
  isLoadingAgents?: boolean;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({ 
  selectedAgent, 
  onBack, 
  isSidebarOpen, 
  setIsSidebarOpen,
  availableAgents = [],
  onAgentSwitch,
  isLoadingAgents = false
}) => (
  <div className="bg-background border-b border-border">
    <div className="px-4 py-2">
      <div className="flex items-center space-x-4">
        {/* 侧边栏切换按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Sidebar className="h-4 w-4" />
        </Button>
        
        {selectedAgent && (
          <div className="flex items-center space-x-3 flex-1">
            {/* Agent切换下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 h-auto p-2 hover:bg-muted/50 max-w-md"
                  disabled={isLoadingAgents}
                >
                  {/* <AgentAvatar 
                    avatar={selectedAgent.avatar} 
                    name={selectedAgent.app_preset.name}
                    variant="square"
                    size="md" 
                  /> */}
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="flex items-center min-w-0 gap-2">
                      <span className="text-lg font-bold text-foreground truncate">
                        {selectedAgent.app_preset.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedAgent.model}
                      </span>
                    </div>
                    {/* <Badge variant={selectedAgent.is_public ? "default" : "secondary"} className="flex-shrink-0">
                      {selectedAgent.is_public ? 'public' : 'private'}
                    </Badge> */}
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                {availableAgents.length > 0 ? (
                  <>
                    {availableAgents.map((agent) => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() => onAgentSwitch?.(agent.id)}
                        className={`flex items-center space-x-3 p-3 cursor-pointer ${
                          selectedAgent.id === agent.id ? 'bg-muted' : ''
                        }`}
                      >
                        <AgentAvatar 
                          avatar={agent.avatar} 
                          name={agent.name} 
                          size="md" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium truncate">{agent.name}</span>
                            <Badge 
                              variant={agent.is_public ? "default" : "secondary"} 
                              className="text-xs flex-shrink-0"
                            >
                              {agent.is_public ? (
                                <><Users className="h-3 w-3 mr-1" />public</>
                              ) : (
                                <><Lock className="h-3 w-3 mr-1" />private</>
                              )}
                            </Badge>
                            {agent.is_default && (
                              <Badge variant="outline" className="text-xs">
                                默认
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {agent.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {agent.provider} • {agent.model}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <DropdownMenuItem disabled className="text-center text-muted-foreground">
                    {isLoadingAgents ? '加载中...' : '没有可用的Agent'}
                  </DropdownMenuItem>
                )}
                
                {availableAgents.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => window.open('/chat/agents', '_blank')}
                      className="text-center text-muted-foreground"
                    >
                      管理Agent...
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  </div>
);