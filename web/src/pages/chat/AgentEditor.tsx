import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Textarea } from '@/components/x-ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/x-ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Slider } from '@/components/x-ui/slider';
import { PromptEditor } from '@/components/chat/PromptEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { useAIProviders } from '@/hooks/useAIProviders';
import { Agent, AgentUpdate, AgentInfo } from '@/types/agent';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Settings,
  Bot,
  ArrowLeft,
  Lightbulb,
  Plus, 
  Trash2
} from 'lucide-react';
import { AgentAvatar } from '@/components/chat/AgentAvatar'
import { AgentInfoEditor } from '@/components/chat/AgentInfoEditor';
import { Checkbox } from '@/components/x-ui/checkbox';


export function AgentEditor() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateAgent, getAgent, deleteAgent } = useAgents();
  const { providers } = useAIProviders();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单数据状态
  const [formData, setFormData] = useState<Agent>({
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
    max_tokens: 8192,
    preset_messages: [
      { 
        role: 'system', 
        content: '你是一个友好且有用的AI助手。请用中文回答问题，保持礼貌和专业。',
        template_enabled: false,
        token_count: 24
      }
    ],
    access_level: 1
  });

  const [showAgentInfo, setShowAgentInfo] = useState(false);

  const loadAgentData = useCallback(async () => {
    if (!agentId) {
      navigate('/chat/agents');
      return;
    }
    
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
          max_tokens: agent.max_tokens || 12048,
          preset_messages: (agent.preset_messages || [
            { role: 'system', content: '你是一个友好且有用的AI助手。' }
          ]).map(msg => ({
            ...msg,
            template_enabled: (msg as any).template_enabled || false,
            token_count: (msg as any).token_count || 0
          })),
          access_level: agent.access_level || 1
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
  }, [agentId, getAgent, navigate]);

  // 加载代理数据
  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

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
      const updateData: AgentUpdate = {
        provider: formData.provider,
        model: formData.model,
        temperature: formData.temperature,
        top_p: formData.top_p,
        max_tokens: formData.max_tokens,
        preset_messages: formData.preset_messages,
        app_preset: formData.app_preset,
        avatar: formData.avatar,
        access_level: formData.access_level,
      };
      const success = await updateAgent(agentId!, updateData);
      if (success) {
        toast({
          title: '更新成功',
          description: `Agent "${formData.app_preset.name}" 已成功更新`
        });
      }
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAppPreset = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      app_preset: {
        ...prev.app_preset,
        [field]: value
      }
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

  const handleAgentInfoSave = (agentInfo: AgentInfo) => {
    updateAppPreset('name', agentInfo.name);
    updateAppPreset('description', agentInfo.description);
    updateFormData('avatar', agentInfo.avatar);
    updateFormData('access_level', agentInfo.access_level);
  };

  const handleAgentDelete = () => {
    const confirm = window.confirm(`是否删除 Agent (${formData.app_preset.name}) ?`);
    if (confirm) {
      deleteAgent(agentId!);
      navigate('/chat/agents');
    }
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const selectedProvider = providers.find(p => p.name === formData.provider);
  const availableModels = selectedProvider?.models || [];

  return (
    <div className="w-full h-[calc(100vh-65px)] flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <div className="pt-2 px-4 flex items-center justify-between text-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <AgentAvatar
              avatar={formData.avatar}
              name={formData.app_preset.name || 'Agent'}
              variant="square"
              size="md"
              onClick={() => setShowAgentInfo(true)}
            />
            <div className="flex gap-4">
              <span className="font-semibold text-foreground">
                {formData.app_preset.name || '未命名 Agent'}
              </span>
              <span className="text-muted-foreground">
                {formData.app_preset.description || ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Agent Info Editor */}
          <AgentInfoEditor
              agent={formData}
              show={showAgentInfo}
              onShowChange={setShowAgentInfo}
              onSave={handleAgentInfoSave}
              onDelete={handleAgentDelete}
            />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="pretty" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                {formData.model || '选择模型'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] space-y-4 p-4" align="end">
              <div className="space-y-2">
                <Label>供应商 *</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => {
                    updateFormData('provider', value);
                    // 重置模型选择
                    const provider = providers.find(p => p.name === value);
                    if (provider && provider.models && provider.models.length > 0) {
                      updateFormData('model', provider.models[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(provider => (
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
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 py-4 px-12">
        {/* 左侧主编辑区域 - 提示词编辑 */}
        <div className="w-full md:w-1/2">
          <PromptEditor
            messages={formData.preset_messages}
            onMessagesChange={(messages) => updateFormData('preset_messages', messages)}
            className="h-[calc(100vh-150px)] overflow-y-auto no-scrollbar"
          />
        </div>
        {/* 右侧 - 交互配置 */}
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
                rows={7}
                className="styled_scrollbar"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.app_preset.send_greetings_to_ai || false}
                  onCheckedChange={(checked) => updateAppPreset('send_greetings_to_ai', checked)}
                />
                <span className="text-xs text-muted-foreground">欢迎消息一并发送给AI</span>
              </div>
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
  );
} 