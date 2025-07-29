import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/x-ui/alert-dialog';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { 
  formatAgentDisplayName,
  canEditAgent,
} from '@/utils/agentUtils';
import { Plus, AlertCircle, MessageCircle, FileUp, Settings2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AgentAvatar } from '@/components/chat/AgentAvatar'
import { CreateAgentDialog } from '@/components/chat/CreateAgentDialog';
import { Agent, AgentDetail, AgentSummary } from '@/types/agent';

export function AgentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    agents,
    loading,
    error,
    deleteAgent,
    createAgent,
    refresh,
    generateAgentId,
    getAgent
  } = useAgents();

  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDeleteAgent = async () => {
    if (!deletingAgent) return;

    const success = await deleteAgent(deletingAgent);
    if (success) {
      setDeletingAgent(null);
    }
  };

  const handleAgentCreated = (agentId: string) => {
    refresh();
    navigate(`/chat/agent/edit/${agentId}`);
  };

  const handleEditAgent = (agentId: string) => {
    navigate(`/chat/agent/edit/${agentId}`);
  };

  const handleStartConversation = (agent: AgentSummary) => {
    navigate(`/chat/conversation#agent=${agent.agent_id}`);
  };

  const handleExportAgent = async (agent: AgentSummary) => {
    try {
      const agentDetail = await getAgent(agent.agent_id);
      // Export agent data as JSON
      const exportData = {
        provider: agentDetail.provider,
        model: agentDetail.model,
        top_p: agentDetail.top_p,
        temperature: agentDetail.temperature,
        max_tokens: agentDetail.max_tokens,
        preset_messages: agentDetail.preset_messages,
        app_preset: agentDetail.app_preset,
        avatar: agentDetail.avatar
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `${agentDetail.app_preset.name || 'agent'}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "导出成功",
        description: `Agent "${agentDetail.app_preset.name}" 已成功导出`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出Agent时发生错误",
        variant: "destructive",
      });
    }
  };

  const handleImportAgent = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const agentData = JSON.parse(text) as AgentDetail;
        
        // Validate required fields
        if (!agentData.app_preset.name || !agentData.provider || !agentData.model) {
          toast({
            title: "导入失败",
            description: "JSON文件格式不正确，缺少必要字段",
            variant: "destructive",
          });
          return;
        }
        
        // Create agent using API
        const createData = {
          agent_id: generateAgentId(),
          app_preset: agentData.app_preset,
          avatar: agentData.avatar || {
            variant: 'emoji',
            emoji: '🤖',
            bg_color: 'bg-blue-500'
          },
          provider: agentData.provider,
          model: agentData.model,
          top_p: agentData.top_p || 0.7,
          temperature: agentData.temperature || 0.7,
          max_tokens: agentData.max_tokens || 8000,
          preset_messages: agentData.preset_messages || [],
        };
        
        // Use the createAgent function from useAgents hook
        const success = await createAgent(createData);
        if (success) {
          toast({
            title: "导入成功",
            description: `Agent "${agentData.app_preset.name}" 已成功导入`,
            variant: "default",
          });
        }
      } catch (error) {
        toast({
          title: "导入失败",
          description: "解析JSON文件时发生错误",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            请登录后使用此功能。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Agent管理</h1>
          </div>
          {/** 编辑供应商 */}
          <Button variant="pretty" size="default" onClick={() => {navigate('/chat/ai-provider-management')}}>
            <Settings2 className="h-6 w-6" />
            编辑供应商
          </Button>
        </div>
      </div>

      {/* Agent列表 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="grid-cols-1 shadow-none hover:shadow-md transition-all duration-300">
            <CardContent className="flex flex-col justify-start gap-2 py-4">
              {/* <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" /> */}
              <span className="text-md font-medium text-foreground mb-2">创建Agent</span>
              <CreateAgentDialog 
                trigger={
                  <Button variant="outline" className="flex justify-start">
                    <Plus className="h-4 w-4" />
                    创建 Agent
                  </Button>
                }
                onAgentCreated={handleAgentCreated}
              />
              <Button onClick={handleImportAgent} variant="outline" className="flex justify-start">
                <FileUp className="h-4 w-4" />
                导入 Agent (JSON)
              </Button>
            </CardContent>
          </Card>

          {agents.map((agent) => (
            <Card 
              key={agent.agent_id} 
              className="relative grid-cols-1 cursor-pointer shadow-none hover:shadow-md transition-all duration-300"
              onClick={() => {
                if(!canEditAgent(agent, user.id)) return;
                handleEditAgent(agent.agent_id);
              }}
            >
              <CardHeader className="p-4">
                <div className="flex items-start space-x-3">
                  <AgentAvatar 
                    avatar={agent.avatar} 
                    name={formatAgentDisplayName(agent)}
                    size="md"
                    variant="square"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-md flex items-center space-x-2">
                      <span className="truncate">{formatAgentDisplayName(agent)}</span>
                      {/* {agent.id === defaultAgent?.id && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                      )} */}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <span>{agent.provider}</span>
                      <span>•</span>
                      <span className="truncate">{agent.model}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {agent.description || '暂无描述'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {agent.access_level === 0 ? "admin" : agent.access_level === 1 ? "private" : agent.access_level === 2 ? "all_users" : "public"}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="default"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartConversation(agent);
                      }}
                      className="text-xs px-2"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      对话
                    </Button>
                    <Button
                      size="default"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportAgent(agent);
                      }}
                      className="text-xs px-2"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deletingAgent}
        onOpenChange={() => setDeletingAgent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除Agent</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该Agent和其相关配置，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 