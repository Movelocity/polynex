import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Textarea } from '@/components/x-ui/textarea';
import { useAIProviders } from '@/hooks/useAIProviders';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AIProviderType, 
  AIProviderConfigCreate, 
  AIProviderConfigUpdate,
  TestProviderRequest 
} from '@/types';
import { 
  getProviderTypeDisplayName,
  getProviderTypeIcon,
  formatProviderDisplayName,
  getProviderStatusText,
  validateProviderConfig 
} from '@/utils/aiProviderUtils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  Star,
  Eye,
  EyeOff,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProviderFormData {
  name: string;
  provider: string;
  provider_type: AIProviderType;
  base_url: string;
  api_key: string;
  models: string[];
  default_model: string;
  proxy_config?: any;
  is_active: boolean;
}

export function AIProviderManagement() {
  const { user } = useAuth();
  const {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    setDefaultProvider,
    refresh,
    activeProviders,
    defaultProvider,
    hasDefaultProvider
  } = useAIProviders();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    provider: '',
    provider_type: AIProviderType.OPENAI,
    base_url: '',
    api_key: '',
    models: [],
    default_model: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [modelsInput, setModelsInput] = useState('');

  // 检查用户权限
  const isAdmin = user?.role === 'admin';

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
      provider: '',
      provider_type: AIProviderType.OPENAI,
      base_url: '',
      api_key: '',
      models: [],
      default_model: '',
      is_active: true
    });
    setModelsInput('');
    setFormErrors([]);
  };

  const handleCreateProvider = async () => {
    // 处理模型列表
    const models = modelsInput.split(',').map(m => m.trim()).filter(m => m);
    const providerData: AIProviderConfigCreate = {
      ...formData,
      models
    };

    // 验证数据
    const errors = validateProviderConfig(providerData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const success = await createProvider(providerData);
    if (success) {
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "成功",
        description: "AI供应商创建成功",
      });
    }
  };

  const handleUpdateProvider = async (providerId: string) => {
    const models = modelsInput.split(',').map(m => m.trim()).filter(m => m);
    const updateData: AIProviderConfigUpdate = {
      ...formData,
      models
    };

    // 验证数据
    const errors = validateProviderConfig(updateData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const success = await updateProvider(providerId, updateData);
    if (success) {
      setEditingProvider(null);
      resetForm();
      toast({
        title: "成功",
        description: "AI供应商更新成功",
      });
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (confirm('确定要删除这个AI供应商吗？')) {
      const success = await deleteProvider(providerId);
      if (success) {
        toast({
          title: "成功",
          description: "AI供应商删除成功",
        });
      }
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    const testRequest: TestProviderRequest = {
      message: 'Hello, this is a test message.'
    };
    
    try {
      const result = await testProvider(providerId, testRequest);
      if (result?.success) {
        toast({
          title: "测试成功",
          description: `响应: ${result.response?.slice(0, 100)}...`,
        });
      } else {
        toast({
          title: "测试失败",
          description: result?.message || "未知错误",
          variant: "destructive",
        });
      }
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetDefaultProvider = async (providerId: string) => {
    const success = await setDefaultProvider(providerId);
    if (success) {
      toast({
        title: "成功",
        description: "默认供应商设置成功",
      });
    }
  };

  const startEdit = (provider: any) => {
    setFormData({
      name: provider.name,
      provider: provider.provider,
      provider_type: provider.provider_type,
      base_url: provider.base_url,
      api_key: provider.api_key,
      models: provider.models,
      default_model: provider.default_model,
      is_active: provider.is_active
    });
    setModelsInput(provider.models.join(', '));
    setEditingProvider(provider.id);
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const maskApiKey = (apiKey: string) => {
    if (!apiKey) return '';
    return apiKey.slice(0, 8) + '*'.repeat(Math.max(0, apiKey.length - 8));
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            此功能需要管理员权限才能访问。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">AI供应商管理</h1>
        <p className="text-muted-foreground">管理和配置AI服务供应商</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总供应商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">活跃供应商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProviders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">默认供应商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasDefaultProvider ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
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
                  新增供应商
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建AI供应商</DialogTitle>
                  <DialogDescription>
                    添加新的AI服务供应商配置
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {formErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {formErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">供应商名称</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例如：OpenAI主配置"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">供应商标识</Label>
                    <Input
                      id="provider"
                      value={formData.provider}
                      onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                      placeholder="例如：openai-main"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider_type">供应商类型</Label>
                    <Select
                      value={formData.provider_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, provider_type: value as AIProviderType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(AIProviderType).map(type => (
                          <SelectItem key={type} value={type}>
                            {getProviderTypeDisplayName(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_url">API基础URL</Label>
                    <Input
                      id="base_url"
                      value={formData.base_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                      placeholder="例如：https://api.openai.com/v1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">API密钥</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="输入API密钥"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="models">支持的模型</Label>
                    <Textarea
                      id="models"
                      value={modelsInput}
                      onChange={(e) => setModelsInput(e.target.value)}
                      placeholder="输入模型名称，用逗号分隔。例如：gpt-4, gpt-3.5-turbo"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_model">默认模型</Label>
                    <Input
                      id="default_model"
                      value={formData.default_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_model: e.target.value }))}
                      placeholder="例如：gpt-4"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <Label htmlFor="is_active">启用供应商</Label>
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
                  <Button onClick={handleCreateProvider} disabled={loading}>
                    {loading ? '创建中...' : '创建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* 供应商列表 */}
      <div className="space-y-4">
        {loading && providers.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">加载中...</p>
          </div>
        ) : providers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">暂无AI供应商</h3>
              <p className="text-muted-foreground">点击上方"新增供应商"按钮来创建第一个AI供应商配置</p>
            </CardContent>
          </Card>
        ) : (
          providers.map((provider) => (
            <Card key={provider.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getProviderTypeIcon(provider.provider_type)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{formatProviderDisplayName(provider)}</span>
                        {provider.id === defaultProvider?.id && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {getProviderTypeDisplayName(provider.provider_type)} • {provider.provider}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={provider.is_active ? "default" : "secondary"}>
                      {getProviderStatusText(provider.is_active)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium">API地址</Label>
                    <p className="text-sm text-muted-foreground break-all">{provider.base_url}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">API密钥</Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground font-mono">
                        {showApiKey[provider.id] ? provider.api_key : maskApiKey(provider.api_key)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleApiKeyVisibility(provider.id)}
                      >
                        {showApiKey[provider.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">默认模型</Label>
                    <p className="text-sm text-muted-foreground">{provider.default_model}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">支持模型</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.models.slice(0, 3).map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                      {provider.models.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{provider.models.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestProvider(provider.id)}
                      disabled={testingProvider === provider.id || !provider.is_active}
                    >
                      <TestTube className="h-3 w-3 mr-1" />
                      {testingProvider === provider.id ? '测试中...' : '测试连接'}
                    </Button>
                    {provider.id !== defaultProvider?.id && provider.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefaultProvider(provider.id)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        设为默认
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(provider)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteProvider(provider.id)}
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

      {/* 编辑对话框 */}
      {editingProvider && (
        <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑AI供应商</DialogTitle>
              <DialogDescription>
                修改AI供应商配置信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {formErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">供应商名称</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：OpenAI主配置"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider">供应商标识</Label>
                <Input
                  id="edit-provider"
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="例如：openai-main"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider_type">供应商类型</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider_type: value as AIProviderType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AIProviderType).map(type => (
                      <SelectItem key={type} value={type}>
                        {getProviderTypeDisplayName(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-base_url">API基础URL</Label>
                <Input
                  id="edit-base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="例如：https://api.openai.com/v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-api_key">API密钥</Label>
                <Input
                  id="edit-api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="输入API密钥"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-models">支持的模型</Label>
                <Textarea
                  id="edit-models"
                  value={modelsInput}
                  onChange={(e) => setModelsInput(e.target.value)}
                  placeholder="输入模型名称，用逗号分隔。例如：gpt-4, gpt-3.5-turbo"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-default_model">默认模型</Label>
                <Input
                  id="edit-default_model"
                  value={formData.default_model}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_model: e.target.value }))}
                  placeholder="例如：gpt-4"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <Label htmlFor="edit-is_active">启用供应商</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProvider(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button onClick={() => handleUpdateProvider(editingProvider)} disabled={loading}>
                {loading ? '更新中...' : '更新'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 