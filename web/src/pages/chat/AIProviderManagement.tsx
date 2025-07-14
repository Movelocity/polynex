import { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';
import { Input } from '@/components/x-ui/input';
import { Textarea } from '@/components/x-ui/textarea';
import { Separator } from '@/components/x-ui/separator';

import { useAIProviders } from '@/hooks/useAIProviders';
import { 
  AIProviderConfigCreate, 
  AIProviderConfigUpdate,
  AIProviderConfig,
  TestProviderRequest
} from '@/types';
import { 
  getProviderTypeDisplayName,
  getProviderTypeIcon,
  formatProviderDisplayName,
  // getProviderStatusText
} from '@/utils/aiProviderUtils';
import { 
  Plus, 
  Trash2, 
  Eye,
  EyeOff,
  Settings,
  User,
  Circle,
  Shield,
  Bot,
  X,
  ChevronDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AIProviderDialog } from '@/components/chat/AIProviderDialog';
import { cn } from '@/lib/utils';

// Provider状态配置
const statusConfig = {
  active: { color: "text-success", text: "Active" },
  inactive: { color: "text-muted-foreground", text: "Inactive" },
  error: { color: "text-destructive", text: "Error" },
};

// Provider列表组件
interface ProviderListProps {
  providers: AIProviderConfig[];
  selectedProvider: any;
  onProviderSelect: (provider: any) => void;
  onAddProvider: () => void;
}

function ProviderList({ providers, selectedProvider, onProviderSelect, onAddProvider }: ProviderListProps) {
  return (
    <div className="card-elevated">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-foreground">供应商列表 ({providers.length})</h2>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 border border-border" onClick={onAddProvider}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {providers.map((provider) => {
          const status = provider.access_level >= 2 ? 'active' : 'inactive';
          return (
            <div
              key={provider.id}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-theme-blue/20 border border-transparent",
                selectedProvider?.id === provider.id && "bg-theme-blue/10 border border-theme-blue/30"
              )}
              onClick={() => onProviderSelect(provider)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* <div className="text-muted-foreground">
                    {getProviderTypeIcon(provider.provider_type)}
                  </div> */}
                  <div className="w-8 h-8 rounded-lg bg-theme-blue/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-theme-blue" />
                  </div>
                  <span className="font-medium text-sm text-foreground truncate">{formatProviderDisplayName(provider)}</span>
                </div>
                <Circle className={`h-3 w-3 fill-current ${statusConfig[status].color}`} />
              </div>
              {/* <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{getProviderTypeDisplayName(provider.provider_type)}</span>
              </div> */}
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border">
                  {(provider.models || []).length} models
                </Badge>
                {/* <Badge
                  variant="secondary"
                  className={`text-xs border ${
                    provider.access_level >= 2
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {getProviderStatusText(provider.access_level >= 2)}
                </Badge> */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Provider详情组件
interface ProviderDetailProps {
  provider: any;
  testingProvider: string | null;
  onSave: (updatedData: any) => void;
  onDelete: () => void;
  onTest: () => void;
  onProviderUpdate: (updatedProvider: any) => void;
}

function ProviderDetail({ 
  provider, 
  testingProvider,
  onSave, 
  onDelete, 
  onTest,  
  onProviderUpdate
}: ProviderDetailProps) {
  const [editData, setEditData] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [newModelInput, setNewModelInput] = useState<string>('');
  const [showDefaultModelDropdown, setShowDefaultModelDropdown] = useState<boolean>(false);

  // 当开始编辑时，初始化编辑数据
  useEffect(() => {
    setShowApiKey(false);
    setEditData({ ...provider });
    setNewModelInput('');
    setShowDefaultModelDropdown(false);
  }, [provider]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDefaultModelDropdown(false);
    };
    
    if (showDefaultModelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDefaultModelDropdown]);

  const handleFieldChange = (field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProxyFieldChange = (field: string, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      proxy: {
        ...prev.proxy,
        [field]: value
      }
    }));
  };

  const handleUpdateModels = (models: string[]) => {
    if (editData) {
      setEditData((prev: any) => {
        const updatedData = {
          ...prev,
          models
        };
        
        // Auto-set default model if empty and models exist
        if (models.length > 0 && !updatedData.default_model) {
          updatedData.default_model = models[0];
        }
        // Clear default model if it's not in available models
        else if (models.length > 0 && updatedData.default_model && !models.includes(updatedData.default_model)) {
          updatedData.default_model = models[0];
        }
        // Clear default model if no models available
        else if (models.length === 0) {
          updatedData.default_model = '';
        }
        
        return updatedData;
      });
    } else {
      // Create a new provider object to avoid direct mutation
      const updatedProvider = { ...provider, models };
      
      // Auto-set default model if empty and models exist
      if (models.length > 0 && !updatedProvider.default_model) {
        updatedProvider.default_model = models[0];
      }
      // Clear default model if it's not in available models
      else if (models.length > 0 && updatedProvider.default_model && !models.includes(updatedProvider.default_model)) {
        updatedProvider.default_model = models[0];
      }
      // Clear default model if no models available
      else if (models.length === 0) {
        updatedProvider.default_model = '';
      }
      
      onProviderUpdate(updatedProvider);
    }
  };

  const handleAddModel = () => {
    if (newModelInput.trim()) {
      const currentModels = getCurrentData().models || [];
      if (!currentModels.includes(newModelInput.trim())) {
        handleUpdateModels([...currentModels, newModelInput.trim()]);
      }
      setNewModelInput('');
    }
  };

  const handleRemoveModel = (modelToRemove: string) => {
    const currentModels = getCurrentData().models || [];
    const updatedModels = currentModels.filter((model: string) => model !== modelToRemove);
    handleUpdateModels(updatedModels);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddModel();
    }
  };

  const handleSave = () => {
    if (editData) {
      onSave(editData);
    }
  };

  const getCurrentData = () => {
    return editData || provider;
  };


  return (
    <div className="card-elevated">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="text-lg text-foreground">
            编辑AI供应商配置
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onTest}
              disabled={testingProvider === provider.id}
              className="flex-1 h-8 bg-muted border-border hover:bg-muted/80 text-muted-foreground"
            >
              {testingProvider === provider.id ? '测试中...' : '测试'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 border-destructive text-destructive hover:bg-destructive/10 hover:border-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="h-8 border-primary text-primary hover:bg-primary/10 hover:border-primary"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              保存
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* 基础配置 */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">Provider Name</Label>
              <Input
                id="name"
                value={getCurrentData().name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label htmlFor="provider_type" className="text-xs text-muted-foreground">Type</Label>
              <Input
                id="provider_type"
                value={getProviderTypeDisplayName(getCurrentData().provider_type)}
                disabled={true}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="base_url" className="text-xs text-muted-foreground">Base URL</Label>
              <Input
                id="base_url"
                value={getCurrentData().base_url || ''}
                onChange={(e) => handleFieldChange('base_url', e.target.value)}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
        {/* API配置 */}
        <div>
          <Label htmlFor="api_key" className="text-xs text-muted-foreground">API Key</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="api_key"
              type={showApiKey ? "text" : "password"}
              value={getCurrentData().api_key || ''}
              onChange={(e) => handleFieldChange('api_key', e.target.value)}
              className="flex-1 h-8 bg-background border-border text-foreground text-sm"
              autoComplete="new-password"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
              className="h-8 w-8 p-0 bg-muted border-border hover:bg-muted/80"
            >
              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* 模型配置 */}
        <div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Available Models</Label>
              <div className="mt-1 space-y-2">
                {/* Model badges */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] px-2 bg-background">
                  {(getCurrentData().models || []).map((model: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="inline-flex items-center gap-1 pr-1 text-xs border-none bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                    >
                      <span className="truncate max-w-[220px]">{model}</span>
                      <button
                        onClick={() => handleRemoveModel(model)}
                        className="ml-1 hover:bg-destructive/20 hover:text-destructive rounded-sm p-0.5 transition-colors"
                        type="button"
                        aria-label={`Remove ${model}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {(getCurrentData().models || []).length === 0 && (
                    <span className="text-xs text-muted-foreground py-1">No models configured</span>
                  )}
                </div>
                
                {/* Add new model input */}
                <div className="flex gap-2">
                  <Input
                    value={newModelInput}
                    onChange={(e) => setNewModelInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter model name (e.g., gpt-4, claude-3-sonnet)"
                    className="flex-1 h-8 bg-background border-border text-foreground text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddModel}
                    disabled={!newModelInput.trim()}
                    className="h-8 px-3 border-border hover:bg-muted/80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="default_model" className="text-xs text-muted-foreground">Default Model</Label>
              <div className="mt-1 relative">
                <div 
                  className="flex items-center justify-between h-8 px-3 bg-background border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if ((getCurrentData().models || []).length > 0) {
                      setShowDefaultModelDropdown(!showDefaultModelDropdown);
                    }
                  }}
                >
                  <span className={`text-sm ${
                    getCurrentData().default_model 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                  }`}>
                    {getCurrentData().default_model || 
                      ((getCurrentData().models || []).length > 0 
                        ? 'Select a default model' 
                        : 'No models available')}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    showDefaultModelDropdown ? 'rotate-180' : ''
                  } ${
                    (getCurrentData().models || []).length === 0 ? 'opacity-50' : ''
                  }`} />
                </div>
                
                {/* Dropdown for available models */}
                {showDefaultModelDropdown && (getCurrentData().models || []).length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    <div 
                      className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFieldChange('default_model', '');
                        setShowDefaultModelDropdown(false);
                      }}
                    >
                      None (clear selection)
                    </div>
                    {(getCurrentData().models || []).map((model: string) => (
                      <div
                        key={model}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors ${
                          getCurrentData().default_model === model 
                            ? 'bg-theme-blue/10 text-theme-blue' 
                            : 'text-foreground'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldChange('default_model', model);
                          setShowDefaultModelDropdown(false);
                        }}
                      >
                        {model}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 代理配置 */}
        {true && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="proxy_url" className="text-xs text-muted-foreground">Proxy URL</Label>
              <Input
                id="proxy_url"
                value={(getCurrentData().proxy?.url || '')}
                onChange={(e) => handleProxyFieldChange('url', e.target.value)}
                placeholder="http://localhost:7890"
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
            {getCurrentData().proxy?.url && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="proxy_username" className="text-xs text-muted-foreground">Username</Label>
                  <Input
                    id="proxy_username"
                    value={(getCurrentData().proxy?.username || '')}
                    onChange={(e) => handleProxyFieldChange('username', e.target.value)}
                    className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="proxy_password" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="proxy_password"
                    type="password"
                    value={(getCurrentData().proxy?.password || '')}
                    onChange={(e) => handleProxyFieldChange('password', e.target.value)}
                    className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 主组件
export function AIProviderManagement() {
  const {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    setDefaultProvider,
  } = useAIProviders();

  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // const [editingProvider, setEditingProvider] = useState<any>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(true); // Default to editing mode

  // 检查用户权限
  // const isAdmin = user?.role === 'admin';

  // 初始化选中第一个provider
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleProviderSelect = (provider: any) => {
    setSelectedProvider(provider);
    setIsEditing(true); // Keep edit mode when switching providers
    // setShowApiKey(prev => ({ ...prev, [provider.id]: false }));
  };

  const handleCreateProvider = async (data: AIProviderConfigCreate) => {
    const success = await createProvider(data);
    if (success) {
      toast({
        title: "成功",
        description: "AI供应商创建成功",
      });
    }
    return success;
  };

  const handleUpdateProvider = async (providerData: any) => {
    if (!selectedProvider?.id) return false;
    
    // 从完整的 provider 数据中提取更新所需的字段
    const updateData: AIProviderConfigUpdate = {
      name: providerData.name,
      base_url: providerData.base_url,
      api_key: providerData.api_key,
      models: providerData.models,
      access_level: providerData.access_level,
      proxy: providerData.proxy
    };
    
    const success = await updateProvider(selectedProvider.id, updateData);
    if (success) {
      setIsEditing(false);
      toast({
        title: "成功",
        description: "AI供应商更新成功",
      });
    }
    return success;
  };

  const handleDeleteProvider = async () => {
    if (!selectedProvider) return;
    
    if (confirm('确定要删除这个AI供应商吗？')) {
      const success = await deleteProvider(selectedProvider.id);
      if (success) {
        // 选择下一个provider
        const currentIndex = providers.findIndex(p => p.id === selectedProvider.id);
        const nextProvider = providers[currentIndex + 1] || providers[currentIndex - 1] || null;
        setSelectedProvider(nextProvider);
        setIsEditing(false);
        toast({
          title: "成功",
          description: "AI供应商删除成功",
        });
      }
    }
  };

  const handleTestProvider = async () => {
    if (!selectedProvider) return;
    
    setTestingProvider(selectedProvider.id);
    const testRequest: TestProviderRequest = {
      message: 'Hello, this is a test message.',
      model: selectedProvider.default_model
    };
    
    try {
      const result = await testProvider(selectedProvider.id, testRequest);
      if (result?.success) {
        toast({
          title: "测试成功",
          description: `响应: ${result.response?.content?.slice(0, 100)}...`,
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

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl p-4">
        {/* 页面标题 */}
        <div className=" pb-4">
          <h1 className="text-2xl font-semibold text-foreground mb-1">配置 LLM API 供应商</h1>
          {/* <p className="text-sm text-muted-foreground">Configure and manage your AI model providers</p> */}
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* 左侧Provider列表 */}
          <div className="col-span-12 lg:col-span-4">
            {loading && providers.length === 0 ? (
              <div className="card-elevated h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-sm">Loading providers...</p>
                </div>
              </div>
            ) : providers.length === 0 ? (
              <div className="card-elevated h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-3 opacity-80" />
                  <p className="text-sm mb-4">No providers configured</p>
                  <Button onClick={() => setShowCreateDialog(true)} size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    点击创建
                  </Button>
                </div>
              </div>
            ) : (
              <ProviderList
                providers={providers}
                selectedProvider={selectedProvider}
                onProviderSelect={handleProviderSelect}
                onAddProvider={() => setShowCreateDialog(true)}
              />
            )}
          </div>

          {/* 右侧Provider详情 */}
          <div className="col-span-12 lg:col-span-8">
            {selectedProvider ? (
              <ProviderDetail
                provider={selectedProvider}
                testingProvider={testingProvider}
                onSave={async (updatedData) => {
                  const success = await handleUpdateProvider(updatedData);
                  if (success) {
                    setSelectedProvider(updatedData);
                  }
                }}
                onDelete={handleDeleteProvider}
                onTest={handleTestProvider}
                onProviderUpdate={(updatedProvider) => setSelectedProvider(updatedProvider)}
              />
            ) : (
              <div className="card-elevated h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a provider to configure</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI供应商对话框 */}
      <AIProviderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        // mode="create"
        loading={loading}
        onSubmit={handleCreateProvider}
      />
      
      {/* <AIProviderDialog
        open={!!editingProvider}
        onOpenChange={(open) => !open && setEditingProvider(null)}
        mode="edit"
        initialData={editingProvider}
        loading={loading}
        onSubmit={handleUpdateProvider}
      /> */}
    </div>
  );
} 