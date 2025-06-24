import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { conversationService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, ConversationStatus } from '@/types';
import { MessageCircle, Plus, Trash2, Edit, AlertCircle, Clock, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ConversationManagement() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载对话失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('确定要删除这个对话吗？')) {
      try {
        await conversationService.deleteConversation(conversationId);
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        toast({
          title: "成功",
          description: "对话删除成功",
        });
      } catch (err) {
        toast({
          title: "错误",
          description: "删除对话失败",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
           case ConversationStatus.DELETED:
       return 'bg-red-100 text-red-800';
      case ConversationStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.ACTIVE:
        return '进行中';
           case ConversationStatus.DELETED:
       return '已删除';
      case ConversationStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
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

     const activeConversations = conversations.filter(c => c.status === ConversationStatus.ACTIVE);
   const archivedConversations = conversations.filter(c => c.status === ConversationStatus.ARCHIVED);
   const deletedConversations = conversations.filter(c => c.status === ConversationStatus.DELETED);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">对话管理</h1>
        <p className="text-muted-foreground">管理您的AI对话历史</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总对话</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeConversations.length}</div>
          </CardContent>
        </Card>
                 <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium">已归档</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-blue-600">{archivedConversations.length}</div>
           </CardContent>
         </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">操作</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => console.log('TODO: 实现新建对话功能')}>
              <Plus className="h-4 w-4 mr-2" />
              新建对话
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 对话列表 */}
      <div className="space-y-4">
        {loading && conversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">暂无对话</h3>
              <p className="text-muted-foreground">点击上方"新建对话"按钮开始第一个AI对话</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conversation) => (
            <Card key={conversation.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{conversation.title || '未命名对话'}</span>
                      </CardTitle>
                      <CardDescription>
                        {conversation.agent_id ? `代理ID: ${conversation.agent_id}` : '无关联代理'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(conversation.status)}>
                      {getStatusText(conversation.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      创建时间
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(conversation.create_time).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      更新时间
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(conversation.update_time).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      消息数量
                    </div>
                    <div className="text-sm font-medium">
                      {conversation.messages?.length || 0} 条
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log('TODO: 打开对话')}
                    >
                      打开对话
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log('TODO: 继续对话')}
                      disabled={conversation.status !== ConversationStatus.ACTIVE}
                    >
                      继续对话
                    </Button>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log('TODO: 实现编辑标题功能')}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConversation(conversation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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