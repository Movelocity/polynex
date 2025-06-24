import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/x-ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Textarea } from '@/components/x-ui/textarea';
import { Slider } from '@/components/x-ui/slider';
import { useAgents } from '@/hooks/useAgents';
import { useAIProviders } from '@/hooks/useAIProviders';
import { useAuth } from '@/contexts/AuthContext';
import { 
  formatAgentDisplayName,
  getAgentStatusText,
  getAgentVisibilityText,
  canEditAgent,
  isAgentOwner
} from '@/utils/agentUtils';
import { AgentCreate, AgentUpdate, AgentMessage, AppPreset } from '@/types';
import { Plus, Edit, Trash2, Star, Bot, AlertCircle, Users, Lock, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// UUID generation utility
const generateUUID = (): string => {
  return 'agent-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

interface AgentFormData {
  name: string;
  description: string;
  provider: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  greetings: string;
  suggested_questions: string;
  preset_messages: AgentMessage[];
  is_public: boolean;
  is_default: boolean;
}

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
    createAgent,
    updateAgent,
    deleteAgent,
    refresh
  } = useAgents();

  const { providers, activeProviders } = useAIProviders();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    provider: '',
    model: '',
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 2048,
    greetings: '',
    suggested_questions: '',
    preset_messages: [],
    is_public: false,
    is_default: false
  });
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      provider: '',
      model: '',
      temperature: 0.7,
      top_p: 1.0,
      max_tokens: 2048,
      greetings: '',
      suggested_questions: '',
      preset_messages: [],
      is_public: false,
      is_default: false
    });
    setSystemPrompt('');
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('名称不能为空');
    if (!formData.provider) errors.push('请选择供应商');
    if (!formData.model.trim()) errors.push('请选择模型');
    if (formData.temperature < 0 || formData.temperature > 2) errors.push('温度值必须在0-2之间');
    if (formData.top_p < 0 || formData.top_p > 1) errors.push('Top-p值必须在0-1之间');
    if (formData.max_tokens < 1) errors.push('最大令牌数必须大于0');
    return errors;
  };

  const handleCreateAgent = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "表单验证失败",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const preset_messages: AgentMessage[] = [];
    if (systemPrompt.trim()) {
      preset_messages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }

    const suggested_questions_array = formData.suggested_questions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q);

    const app_preset: AppPreset = {
      name: formData.name,
      description: formData.description,
      greetings: formData.greetings || undefined,
      suggested_questions: suggested_questions_array.length > 0 ? suggested_questions_array : undefined,
      creation_date: new Date().toISOString()
    };

    const agentData: AgentCreate = {
      agent_id: generateUUID(),
      provider: formData.provider,
      model: formData.model,
      temperature: formData.temperature,
      top_p: formData.top_p,
      max_tokens: formData.max_tokens,
      preset_messages,
      app_preset,
      is_public: formData.is_public,
      is_default: formData.is_default
    };

    const success = await createAgent(agentData);
    if (success) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent) return;

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "表单验证失败",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const preset_messages: AgentMessage[] = [];
    if (systemPrompt.trim()) {
      preset_messages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }

    const suggested_questions_array = formData.suggested_questions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q);

    const app_preset: AppPreset = {
      name: formData.name,
      description: formData.description,
      greetings: formData.greetings || undefined,
      suggested_questions: suggested_questions_array.length > 0 ? suggested_questions_array : undefined
    };

    const updateData: AgentUpdate = {
      provider: formData.provider,
      model: formData.model,
      temperature: formData.temperature,
      top_p: formData.top_p,
      max_tokens: formData.max_tokens,
      preset_messages,
      app_preset,
      is_public: formData.is_public,
      is_default: formData.is_default
    };

    const success = await updateAgent(editingAgent, updateData);
    if (success) {
      setEditingAgent(null);
      resetForm();
    }
  };

  const handleDeleteAgent = async () => {
    if (!deletingAgent) return;

    const success = await deleteAgent(deletingAgent);
    if (success) {
      setDeletingAgent(null);
    }
  };

  const startEdit = async (agent: any) => {
    // Load agent details if needed
    const systemMessage = agent.preset_messages?.find((msg: AgentMessage) => msg.role === 'system');
    
    setFormData({
      name: agent.name || '',
      description: agent.description || '',
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature || 0.7,
      top_p: agent.top_p || 1.0,
      max_tokens: agent.max_tokens || 2048,
      greetings: agent.app_preset?.greetings || '',
      suggested_questions: agent.app_preset?.suggested_questions?.join('\n') || '',
      preset_messages: agent.preset_messages || [],
      is_public: agent.is_public,
      is_default: agent.is_default
    });
    setSystemPrompt(systemMessage?.content || '');
    setEditingAgent(agent.agent_id);
  };

  const handleStartConversation = (agent: any) => {
    navigate(`/tools/conversation?agent=${agent.agent_id}`);
  };

  const getSelectedProvider = () => {
    return activeProviders.find(p => p.provider === formData.provider);
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
            <CardTitle className="text-sm font-medium">我的Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myAgents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">公开Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{publicAgents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">默认Agent</CardTitle>
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建AI Agent</DialogTitle>
                  <DialogDescription>
                    配置新的AI Agent，包括模型参数和行为设置
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">名称 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="例如：智能助手"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider">供应商 *</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value, model: '' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择供应商" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.provider}>
                              {provider.name} ({provider.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="描述这个Agent的功能和用途"
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">模型 *</Label>
                      <Select
                        value={formData.model}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                        disabled={!formData.provider}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectedProvider()?.models.map(model => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_tokens">最大令牌数</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 2048 }))}
                        min="1"
                        max="8192"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>温度: {formData.temperature}</Label>
                      <Slider
                        value={[formData.temperature]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, temperature: value[0] }))}
                        max={2}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Top-p: {formData.top_p}</Label>
                      <Slider
                        value={[formData.top_p]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, top_p: value[0] }))}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system_prompt">系统提示词</Label>
                    <Textarea
                      id="system_prompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="定义Agent的角色和行为..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="greetings">欢迎语</Label>
                    <Input
                      id="greetings"
                      value={formData.greetings}
                      onChange={(e) => setFormData(prev => ({ ...prev, greetings: e.target.value }))}
                      placeholder="Agent开始对话时的欢迎语"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suggested_questions">建议问题</Label>
                    <Textarea
                      id="suggested_questions"
                      value={formData.suggested_questions}
                      onChange={(e) => setFormData(prev => ({ ...prev, suggested_questions: e.target.value }))}
                      placeholder="每行一个建议问题，用户可以快速选择"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_public"
                        checked={formData.is_public}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                      />
                      <Label htmlFor="is_public">公开Agent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                      />
                      <Label htmlFor="is_default">设为默认</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      resetForm();
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={handleCreateAgent} disabled={loading}>
                    {loading ? '创建中...' : '创建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              <h3 className="text-lg font-medium text-foreground mb-2">暂无AI Agent</h3>
              <p className="text-muted-foreground">点击上方"新增Agent"按钮来创建第一个AI Agent</p>
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
                      onClick={() => handleStartConversation(agent)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      开始对话
                    </Button>
                  </div>

                  <div className="flex space-x-2">
                    {canEditAgent(agent, user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(agent)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {isAgentOwner(agent, user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingAgent(agent.agent_id)}
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

      {/* 编辑对话框 */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑AI Agent</DialogTitle>
            <DialogDescription>
              修改AI Agent的配置和行为设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">名称 *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：智能助手"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_provider">供应商 *</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value, model: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProviders.map(provider => (
                      <SelectItem key={provider.id} value={provider.provider}>
                        {provider.name} ({provider.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">描述</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述这个Agent的功能和用途"
                className="min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_model">模型 *</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  disabled={!formData.provider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSelectedProvider()?.models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_max_tokens">最大令牌数</Label>
                <Input
                  id="edit_max_tokens"
                  type="number"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 2048 }))}
                  min="1"
                  max="8192"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>温度: {formData.temperature}</Label>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, temperature: value[0] }))}
                  max={2}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Top-p: {formData.top_p}</Label>
                <Slider
                  value={[formData.top_p]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, top_p: value[0] }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_system_prompt">系统提示词</Label>
              <Textarea
                id="edit_system_prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="定义Agent的角色和行为..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_greetings">欢迎语</Label>
              <Input
                id="edit_greetings"
                value={formData.greetings}
                onChange={(e) => setFormData(prev => ({ ...prev, greetings: e.target.value }))}
                placeholder="Agent开始对话时的欢迎语"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_suggested_questions">建议问题</Label>
              <Textarea
                id="edit_suggested_questions"
                value={formData.suggested_questions}
                onChange={(e) => setFormData(prev => ({ ...prev, suggested_questions: e.target.value }))}
                placeholder="每行一个建议问题，用户可以快速选择"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                />
                <Label htmlFor="edit_is_public">公开Agent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                />
                <Label htmlFor="edit_is_default">设为默认</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingAgent(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button onClick={handleUpdateAgent} disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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