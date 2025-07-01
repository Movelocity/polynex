import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Textarea } from '@/components/x-ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/x-ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Slider } from '@/components/x-ui/slider';
import { Switch } from '@/components/x-ui/switch';
import { AgentAvatarEditor } from '@/components/chat/AgentAvatarEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AgentCreate, AgentUpdate, AgentMessage, AppPreset, AvatarConfig } from '@/types';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Settings,
  Settings2,
  Palette, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Bot,
  ArrowLeft,
  Globe,
  Star,
  Lightbulb
} from 'lucide-react';
import { AgentAvatar } from '@/components/chat/AgentAvatar'

export function AgentEditor() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createAgent, updateAgent, getAgent } = useAgents();
  const { activeProviders } = useAIProviders();

  const isEditMode = !!agentId && agentId !== 'create';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单数据状态
  const [formData, setFormData] = useState<{
    agent_id: string;
    app_preset: AppPreset;
    avatar: AvatarConfig;
    provider: string;
    model: string;
    temperature: number;
    top_p: number;
    max_tokens: number;
    preset_messages: AgentMessage[];
    is_public: boolean;
    is_default: boolean;
  }>({
    agent_id: '',
    app_preset: {
      name: '',
      description: '',
      greetings: '你好! 我是你的AI助手，有什么可以帮助你的吗？',
      suggested_questions: ['如何使用这个功能？', '告诉我一些有趣的事情', '帮我制定一个学习计划']
    },
    avatar: {
      variant: 'emoji',
      emoji: '🤖',
      bg_color: 'bg-blue-500'
    },
    provider: '',
    model: '',
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 2048,
    preset_messages: [
      { role: 'system', content: '你是一个友好且有用的AI助手。请用中文回答问题，保持礼貌和专业。' }
    ],
    is_public: false,
    is_default: false
  });

  // 模态框状态
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [showAppConfig, setShowAppConfig] = useState(false);
  const [showAvatarConfig, setShowAvatarConfig] = useState(false);
  // const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const generateAgentId = useCallback(() => {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const loadAgentData = useCallback(async () => {
    if (!agentId) return;
    
    setLoading(true);
    try {
      const agent = await getAgent(agentId);
      if (agent) {
        setFormData({
          agent_id: agent.id,
          app_preset: agent.app_preset,
          avatar: agent.avatar,
          provider: agent.provider,
          model: agent.model,
          temperature: agent.temperature || 0.7,
          top_p: agent.top_p || 1.0,
          max_tokens: agent.max_tokens || 2048,
          preset_messages: agent.preset_messages || [
            { role: 'system', content: '你是一个友好且有用的AI助手。' }
          ],
          is_public: agent.is_public,
          is_default: agent.is_default
        });
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载Agent数据',
        variant: 'destructive'
      });
      navigate('/chat/agents');
    } finally {
      setLoading(false);
    }
  }, [agentId, getAgent, navigate, toast]);

  // 加载代理数据
  useEffect(() => {
    if (isEditMode) {
      loadAgentData();
    }
  }, [isEditMode, loadAgentData]);

  // 初始化创建模式的默认值
  useEffect(() => {
    if (!isEditMode && activeProviders.length > 0 && !formData.provider) {
      const defaultProvider = activeProviders.find(p => p.is_default) || activeProviders[0];
      setFormData(prev => ({
        ...prev,
        provider: defaultProvider.name,
        model: defaultProvider.default_model || (defaultProvider.models?.[0] || ''),
        agent_id: generateAgentId()
      }));
    }
  }, [isEditMode, activeProviders.length, formData.provider, generateAgentId]);

  const handleSave = async () => {
    if (!formData.app_preset.name.trim()) {
      toast({
        title: '保存失败',
        description: 'Agent名称不能为空',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.provider || !formData.model) {
      toast({
        title: '保存失败', 
        description: '请选择模型供应商和模型',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const updateData: AgentUpdate = {
          provider: formData.provider,
          model: formData.model,
          temperature: formData.temperature,
          top_p: formData.top_p,
          max_tokens: formData.max_tokens,
          preset_messages: formData.preset_messages,
          app_preset: formData.app_preset,
          avatar: formData.avatar,
          is_public: formData.is_public,
          is_default: formData.is_default
        };
        const success = await updateAgent(agentId!, updateData);
        if (success) {
          toast({
            title: '更新成功',
            description: `Agent "${formData.app_preset.name}" 已成功更新`
          });
          // navigate('/chat/agents');
        }
      } else {
        const createData: AgentCreate = {
          agent_id: formData.agent_id,
          provider: formData.provider,
          model: formData.model,
          temperature: formData.temperature,
          top_p: formData.top_p,
          max_tokens: formData.max_tokens,
          preset_messages: formData.preset_messages,
          app_preset: formData.app_preset,
          avatar: formData.avatar,
          is_public: formData.is_public,
          is_default: formData.is_default
        };
        const success = await createAgent(createData);
        if (success) {
          toast({
            title: '创建成功',
            description: `Agent "${formData.app_preset.name}" 已成功创建`
          });
          navigate(`/chat/agents/edit/${formData.agent_id}`);
        }
      }
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/chat/agents');
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAppPreset = (field: string, value: any) => {
    console.log('updateAppPreset', field, value);
    setFormData(prev => ({
      ...prev,
      app_preset: {
        ...prev.app_preset,
        [field]: value
      }
    }));
  };

  const updatePresetMessage = (index: number, field: 'role' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      preset_messages: prev.preset_messages.map((msg, i) => 
        i === index ? { ...msg, [field]: value } : msg
      )
    }));
  };

  const addPresetMessage = () => {
    setFormData(prev => ({
      ...prev,
      preset_messages: [...prev.preset_messages, { role: 'system', content: '' }]
    }));
  };

  const removePresetMessage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preset_messages: prev.preset_messages.filter((_, i) => i !== index)
    }));
  };

  const addSuggestedQuestion = () => {
    const questions = formData.app_preset.suggested_questions || [];
    updateAppPreset('suggested_questions', [...questions, '']);
  };

  const updateSuggestedQuestion = (index: number, value: string) => {
    const questions = formData.app_preset.suggested_questions || [];
    const newQuestions = questions.map((q, i) => i === index ? value : q);
    updateAppPreset('suggested_questions', newQuestions);
  };

  const removeSuggestedQuestion = (index: number) => {
    const questions = formData.app_preset.suggested_questions || [];
    updateAppPreset('suggested_questions', questions.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Button onClick={() => navigate('/login')}>前往登录</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const selectedProvider = activeProviders.find(p => p.name === formData.provider);
  const availableModels = selectedProvider?.models || [];

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <div className="pt-2 px-4 flex items-center justify-between text-foreground">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div className="flex items-center space-x-3">
            <AgentAvatar
              avatar={formData.avatar}
              name={formData.app_preset.name || 'New Agent'}
              variant="square"
              size="md"
              onClick={() => setShowAvatarConfig(true)}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {formData.app_preset.name || '未命名 Agent'}
              </span>
              <span className="text-muted-foreground">
                {formData.app_preset.description || ''}
              </span>
            </div>
            {/* 应用配置 */}
            <Dialog open={showAppConfig} onOpenChange={setShowAppConfig}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowAppConfig(true)}>
                  <Settings2 className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md text-foreground">
                <DialogHeader>
                  <DialogTitle>应用配置</DialogTitle>
                  <DialogDescription>
                    配置Agent的基本信息和外观
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Agent名称 *</Label>
                    <div className="flex items-center gap-2">
                      <AgentAvatar
                        avatar={formData.avatar}
                        name={formData.app_preset.name || 'New Agent'}
                        variant="square"
                        size="md"
                        onClick={() => {setShowAvatarConfig(true);}}
                      />
                      <Input
                        className="flex-1"
                        placeholder="输入Agent名称..."
                        value={formData.app_preset.name}
                        onChange={(e) => updateAppPreset('name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>描述</Label>
                    <Textarea
                      placeholder="描述这个Agent的功能..."
                      value={formData.app_preset.description}
                      onChange={(e) => updateAppPreset('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        公开Agent
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        允许其他用户使用此Agent
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(checked) => updateFormData('is_public', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        设为默认
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        将此Agent设为默认使用
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => updateFormData('is_default', checked)}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* 头像配置 */}
            <Dialog open={showAvatarConfig} onOpenChange={setShowAvatarConfig}>
              <DialogContent className="sm:max-w-md text-foreground" aria-describedby="">
                <DialogTitle className="text-lg font-semibold">头像配置</DialogTitle>
                <AgentAvatarEditor
                  avatar={formData.avatar}
                  name={formData.app_preset.name || 'Agent'}
                  onChange={(avatar) => {
                    updateFormData('avatar', avatar);
                    setShowAvatarConfig(false);
                  }}
                  onCancel={() => setShowAvatarConfig(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* <Dialog open={showModelConfig} onOpenChange={setShowModelConfig}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                模型配置
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md text-foreground">
              <DialogHeader>
                <DialogTitle>模型配置</DialogTitle>
                <DialogDescription>
                  配置AI模型和参数
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>供应商 *</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => {
                      updateFormData('provider', value);
                      // 重置模型选择
                      const provider = activeProviders.find(p => p.name === value);
                      if (provider && provider.models && provider.models.length > 0) {
                        updateFormData('model', provider.default_model || provider.models[0]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map(provider => (
                        <SelectItem key={provider.id} value={provider.name}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>模型 *</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => updateFormData('model', value)}
                    disabled={!formData.provider}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>温度 (Temperature): {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([value]) => updateFormData('temperature', value)}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制回答的创造性，值越高回答越有创造性
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Top P: {formData.top_p}</Label>
                  <Slider
                    value={[formData.top_p]}
                    onValueChange={([value]) => updateFormData('top_p', value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制词汇选择的多样性
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>最大Token数: {formData.max_tokens}</Label>
                  <Slider
                    value={[formData.max_tokens]}
                    onValueChange={([value]) => updateFormData('max_tokens', value)}
                    max={8192}
                    min={256}
                    step={256}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    限制单次回答的最大长度
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                模型配置
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px]" align="end">
              <div className="p-2 space-y-4">
                <div className="space-y-2">
                  <Label>供应商 *</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => {
                      updateFormData('provider', value);
                      // 重置模型选择
                      const provider = activeProviders.find(p => p.name === value);
                      if (provider && provider.models && provider.models.length > 0) {
                        updateFormData('model', provider.default_model || provider.models[0]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map(provider => (
                        <SelectItem key={provider.id} value={provider.name}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>模型 *</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => updateFormData('model', value)}
                    disabled={!formData.provider}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>温度 (Temperature): {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([value]) => updateFormData('temperature', value)}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制回答的创造性，值越高回答越有创造性
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Top P: {formData.top_p}</Label>
                  <Slider
                    value={[formData.top_p]}
                    onValueChange={([value]) => updateFormData('top_p', value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制词汇选择的多样性
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>最大Token数: {formData.max_tokens}</Label>
                  <Slider
                    value={[formData.max_tokens]}
                    onValueChange={([value]) => updateFormData('max_tokens', value)}
                    max={8192}
                    min={256}
                    step={256}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    限制单次回答的最大长度
                  </p>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {isEditMode ? '更新' : '创建'}
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 右侧主编辑区域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col md:flex-row gap-4 max-w-screen-2xl mx-auto">
            {/* 提示词编辑 */}
            <Card className="w-full md:w-1/2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  系统提示词
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.preset_messages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>消息 {index + 1}</Label>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={message.role}
                          onValueChange={(value) => updatePresetMessage(index, 'role', value as any)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="assistant">Assistant</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.preset_messages.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePresetMessage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      placeholder="输入提示词内容..."
                      value={message.content}
                      onChange={(e) => updatePresetMessage(index, 'content', e.target.value)}
                      rows={4}
                      className="min-h-[100px]"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addPresetMessage}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加消息
                </Button>
              </CardContent>
            </Card>

            {/* 交互配置 */}
            <Card className="w-full md:w-1/2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  交互配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>欢迎消息</Label>
                  <Textarea
                    placeholder="Agent的欢迎消息..."
                    value={formData.app_preset.greetings || ''}
                    onChange={(e) => updateAppPreset('greetings', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    建议问题
                  </Label>
                  {(formData.app_preset.suggested_questions || []).map((question, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        placeholder="输入建议问题..."
                        value={question}
                        onChange={(e) => updateSuggestedQuestion(index, e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSuggestedQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addSuggestedQuestion}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加建议问题
                  </Button>
                </div>

                
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 