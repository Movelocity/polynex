import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { 
  formatAgentDisplayName,
  getAgentStatusText,
  getAgentVisibilityText,
  canEditAgent,
  isAgentOwner
} from '@/utils/agentUtils';
import { Plus, Edit, Trash2, Star, Bot, AlertCircle, Users, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function AgentManagement() {
  const { user } = useAuth();
  const {
    agents,
    loading,
    error,
    myAgents,
    publicAgents,
    defaultAgent,
    hasDefaultAgent,
    refresh
  } = useAgents();

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">AI Agent管理</h1>
        <p className="text-muted-foreground">管理和配置AI Agent</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">我的代理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myAgents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">公开代理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{publicAgents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">默认代理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {hasDefaultAgent ? (
                <Badge className="bg-green-100 text-green-800">已配置</Badge>
              ) : (
                <Badge variant="destructive">未配置</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">操作</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => console.log('TODO: 实现创建功能')}>
              <Plus className="h-4 w-4 mr-2" />
              新增代理
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 代理列表 */}
      <div className="space-y-4">
        {loading && agents.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">暂无AI代理</h3>
              <p className="text-muted-foreground">点击上方"新增代理"按钮来创建第一个AI代理</p>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{formatAgentDisplayName(agent)}</span>
                        {agent.id === defaultAgent?.id && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {agent.provider} • {agent.model}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={agent.is_public ? "default" : "secondary"}>
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
                      <Badge className="bg-yellow-100 text-yellow-800">
                        默认
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                                 <div className="mb-4">
                   <p className="text-sm text-muted-foreground">
                     {agent.description || '暂无描述'}
                   </p>
                 </div>
 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                   <div>
                     <div className="text-xs text-muted-foreground">供应商</div>
                     <div className="text-sm font-medium">{agent.provider}</div>
                   </div>
                  <div>
                    <div className="text-xs text-muted-foreground">创建时间</div>
                    <div className="text-sm font-medium">
                      {new Date(agent.create_time).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">状态</div>
                    <div className="text-sm font-medium">
                      {getAgentStatusText(agent.is_public, agent.is_default)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log('TODO: 开始对话')}
                    >
                      开始对话
                    </Button>
                  </div>

                  <div className="flex space-x-2">
                                         {canEditAgent(agent, user.id) && (
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => console.log('TODO: 实现编辑功能')}
                       >
                         <Edit className="h-3 w-3" />
                       </Button>
                     )}
                     {isAgentOwner(agent, user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => console.log('TODO: 实现删除功能')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 