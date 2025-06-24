import React from 'react';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { 
  Bot, 
  Sidebar,
} from 'lucide-react';


// 对话头部组件
interface ConversationHeaderProps {
  selectedAgent: any;
  onBack: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({ selectedAgent, onBack, isSidebarOpen, setIsSidebarOpen }) => (
  <div className="bg-background border-b border-border">
    <div className="px-4 py-4">
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
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-theme-blue" />
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-foreground">{selectedAgent.app_preset.name}</span>
              <span className="text-sm text-muted-foreground">
                {selectedAgent.provider} • {selectedAgent.model}
              </span>
            </div>
            <Badge variant={selectedAgent.is_public ? "default" : "secondary"}>
              {selectedAgent.is_public ? 'public' : 'private'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  </div>
);