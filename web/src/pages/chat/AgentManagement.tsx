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
  isAgentOwner
} from '@/utils/agentUtils';
import { Plus, Edit,  Star, AlertCircle, Users, Lock, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AgentAvatar } from '@/components/chat/AgentAvatar'

export function AgentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    agents,
    loading,
    error,
    myAgents,
    publicAgents,
    defaultAgent,
    hasDefaultAgent,
    deleteAgent,
    refresh
  } = useAgents();

  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleDeleteAgent = async () => {
    if (!deletingAgent) return;

    const success = await deleteAgent(deletingAgent);
    if (success) {
      setDeletingAgent(null);
    }
  };

  const handleCreateAgent = () => {
    navigate('/chat/agent/create');
  };

  const handleEditAgent = (agentId: string) => {
    navigate(`/chat/agent/edit/${agentId}`);
  };

  const handleStartConversation = (agent: any) => {
    navigate(`/chat/conversation?agent=${agent.agent_id}`);
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
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Agent管理</h1>
          </div>
          {/* 统计信息 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">我的Agent</span>
              <span className="font-bold">{myAgents.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">公开Agent</span>
              <span className="font-bold">{publicAgents.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">默认Agent</span>
              <div className="text-sm">
                {hasDefaultAgent ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">已配置</Badge>
                ) : (
                  <Badge variant="destructive" className="hover:bg-red-200">未配置</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent列表 */}
      <div className="space-y-4">
        <div className="flex flex-row gap-4 flex-wrap">
          <Card className="w-[300px]">
            <CardContent className="flex flex-col gap-4 py-4">
              {/* <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" /> */}
              <h3 className="text-lg font-medium text-foreground mb-2">创建应用</h3>
              <Button onClick={handleCreateAgent} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                创建 Agent
              </Button>
              <Button onClick={()=>{}} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                导入 Agent
              </Button>
            </CardContent>
          </Card>

          {agents.map((agent) => (
            <Card key={agent.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  <AgentAvatar 
                    avatar={agent.avatar} 
                    name={formatAgentDisplayName(agent)}
                    size="md"
                    variant="rounded-square"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span className="truncate">{formatAgentDisplayName(agent)}</span>
                      {agent.id === defaultAgent?.id && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <span>{agent.provider}</span>
                      <span>•</span>
                      <span>{agent.model}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {agent.description || '暂无描述'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={agent.is_public ? "default" : "secondary"} className="text-xs">
                      {agent.is_public ? (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          公开
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3 mr-1" />
                          私有
                        </>
                      )}
                    </Badge>
                    {agent.is_default && (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-xs">
                        默认
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartConversation(agent)}
                      className="text-xs px-2"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      对话
                    </Button>
                    {canEditAgent(agent, user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAgent(agent.agent_id)}
                        className="text-xs px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {/* 到详情页面删除 */}
                    {/* {isAgentOwner(agent, user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingAgent(agent.agent_id)}
                        className="text-red-600 hover:text-red-700 text-xs px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )} */}
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