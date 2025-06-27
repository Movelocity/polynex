import React, { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Input } from '@/components/x-ui/input';
import { Textarea } from '@/components/x-ui/textarea';
import { Separator } from '@/components/x-ui/separator';

import { useAIProviders } from '@/hooks/useAIProviders';
import { useAuth } from '@/contexts/AuthContext';
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
  getProviderStatusText
} from '@/utils/aiProviderUtils';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  TestTube, 
  Star,
  Eye,
  EyeOff,
  Settings,
  AlertCircle,
  Key,
  Globe,
  Brain,
  Circle,
  Shield,
  Bot
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AIProviderDialog } from '@/components/chat/AIProviderDialog';

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
  defaultProvider: any;
  onProviderSelect: (provider: any) => void;
  onAddProvider: () => void;
}

function ProviderList({ providers, selectedProvider, defaultProvider, onProviderSelect, onAddProvider }: ProviderListProps) {
  return (
    <div className="card-elevated">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-foreground">Providers</h2>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 border border-border" onClick={onAddProvider}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{providers.length} configured</p>
      </div>
      <div className="p-2 space-y-1">
        {providers.map((provider) => {
          const status = provider.is_active ? 'active' : 'inactive';
          return (
            <div
              key={provider.id}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedProvider?.id === provider.id
                  ? "bg-theme-blue/10 border border-theme-blue/30"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
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
                  {provider.id === defaultProvider?.id && (
                    <Star className="h-3 w-3 text-theme-yellow fill-current" />
                  )}
                </div>
                <Circle className={`h-3 w-3 fill-current ${statusConfig[status].color}`} />
              </div>
              {/* <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{getProviderTypeDisplayName(provider.provider_type)}</span>
              </div> */}
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border">
                  {provider.models.length} models
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs border ${
                    provider.is_active
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {getProviderStatusText(provider.is_active)}
                </Badge>
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
  defaultProvider: any;
  isEditing: boolean;
  showApiKey: boolean;
  testingProvider: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTest: () => void;
  onSetDefault: () => void;
  onToggleApiKey: () => void;
}

function ProviderDetail({ 
  provider, 
  defaultProvider, 
  isEditing, 
  showApiKey, 
  testingProvider,
  onEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  onTest, 
  onSetDefault, 
  onToggleApiKey 
}: ProviderDetailProps) {
  const status = provider.is_active ? 'active' : 'inactive';

  const maskApiKey = (key: string) => {
    if (!key) return "Not configured";
    return key.substring(0, 6) + "•".repeat(Math.max(0, key.length - 6));
  };

  return (
    <div className="card-elevated">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="text-muted-foreground">
              {getProviderTypeIcon(provider.provider_type)}
            </div> */}
            <div>
              <h2 className="font-semibold text-foreground">{formatProviderDisplayName(provider)}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground capitalize">{getProviderTypeDisplayName(provider.provider_type)}</span>
                <Circle className={`h-1.5 w-1.5 fill-current ${statusConfig[status].color}`} />
                <span className="text-xs text-muted-foreground">{statusConfig[status].text}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isEditing ? onCancel : onEdit}
              className="h-8 bg-muted border-border hover:bg-muted/80 text-muted-foreground"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 border-destructive text-destructive hover:bg-destructive/10 hover:border-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* 基础配置 */}
        <div>
          {/* <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configuration
          </h3> */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">Provider Name</Label>
              <Input
                id="name"
                value={provider.name}
                disabled={!isEditing}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label htmlFor="provider_type" className="text-xs text-muted-foreground">Type</Label>
              <Input
                id="provider_type"
                value={getProviderTypeDisplayName(provider.provider_type)}
                disabled={true}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="base_url" className="text-xs text-muted-foreground">Base URL</Label>
              <Input
                id="base_url"
                value={provider.base_url}
                disabled={!isEditing}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* API配置 */}
        <div>
          <div>
            <Label htmlFor="api_key" className="text-xs text-muted-foreground">API Key</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                value={isEditing ? provider.api_key : maskApiKey(provider.api_key)}
                disabled={!isEditing}
                className="flex-1 h-8 bg-background border-border text-foreground text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleApiKey}
                className="h-8 w-8 p-0 bg-muted border-border hover:bg-muted/80"
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* 代理配置 */}
        {(provider.proxy?.url || isEditing) && (
          <>
            <Separator className="bg-border" />
            <div>
              {/* <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Proxy
              </h3> */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="proxy_url" className="text-xs text-muted-foreground">Proxy URL</Label>
                  <Input
                    id="proxy_url"
                    value={provider.proxy?.url || ''}
                    disabled={!isEditing}
                    placeholder="http://localhost:7890"
                    className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                  />
                </div>
                {provider.proxy?.url && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="proxy_username" className="text-xs text-muted-foreground">Username</Label>
                      <Input
                        id="proxy_username"
                        value={provider.proxy?.username || ''}
                        disabled={!isEditing}
                        className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="proxy_password" className="text-xs text-muted-foreground">Password</Label>
                      <Input
                        id="proxy_password"
                        type="password"
                        value={provider.proxy?.password || ''}
                        disabled={!isEditing}
                        className="mt-1 h-8 bg-background border-border text-foreground text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator className="bg-border" />

        {/* 模型配置 */}
        <div>
          {/* <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Models
          </h3> */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="models" className="text-xs text-muted-foreground">Available Models</Label>
              <div className="mt-1">
                {isEditing ? (
                  <Textarea
                    id="models"
                    value={provider.models.join(", ")}
                    className="bg-background border-border text-foreground text-sm resize-none"
                    rows={2}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {provider.models.map((model: string) => (
                      <Badge
                        key={model}
                        variant="secondary"
                        className="text-xs bg-muted text-muted-foreground border-border"
                      >
                        {model}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="default_model" className="text-xs text-muted-foreground">Default Model</Label>
              <Input
                id="default_model"
                value={provider.default_model}
                disabled={!isEditing}
                className="mt-1 h-8 bg-background border-border text-foreground text-sm"
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <Separator className="bg-border" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onTest}
              disabled={testingProvider === provider.id || !provider.is_active}
              className="flex-1 h-8 bg-muted border-border hover:bg-muted/80 text-muted-foreground"
            >
              <TestTube className="h-3.5 w-3.5 mr-1.5" />
              {testingProvider === provider.id ? 'Testing...' : 'Test Connection'}
            </Button>
            {provider.id !== defaultProvider?.id && provider.is_active && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSetDefault}
                className="flex-1 h-8 bg-muted border-border hover:bg-muted/80 text-muted-foreground"
              >
                <Star className="h-3.5 w-3.5 mr-1.5" />
                Set Default
              </Button>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-2">
              <Button onClick={onSave} className="flex-1 h-8 bg-theme-blue hover:bg-theme-blue/90 text-theme-blue-foreground">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="h-8 bg-muted border-border hover:bg-muted/80 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 主组件
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

  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);

  // 检查用户权限
  const isAdmin = user?.role === 'admin';

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
    setIsEditing(false);
    setShowApiKey(prev => ({ ...prev, [provider.id]: false }));
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

  const handleUpdateProvider = async (data: AIProviderConfigUpdate) => {
    if (!selectedProvider?.id) return false;
    
    const success = await updateProvider(selectedProvider.id, data);
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
      message: 'Hello, this is a test message.'
    };
    
    try {
      const result = await testProvider(selectedProvider.id, testRequest);
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

  const handleSetDefaultProvider = async () => {
    if (!selectedProvider) return;
    
    const success = await setDefaultProvider(selectedProvider.id);
    if (success) {
      toast({
        title: "成功",
        description: "默认供应商设置成功",
      });
    }
  };

  const toggleApiKeyVisibility = () => {
    if (!selectedProvider) return;
    setShowApiKey(prev => ({
      ...prev,
      [selectedProvider.id]: !prev[selectedProvider.id]
    }));
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
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl p-4">
        {/* 页面标题 */}
        <div className=" pb-4">
          <h1 className="text-2xl font-semibold text-foreground mb-1">LLM Providers</h1>
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
                  <Settings className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-4">No providers configured</p>
                  <Button onClick={() => setShowCreateDialog(true)} size="sm">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Add Provider
                  </Button>
                </div>
              </div>
            ) : (
              <ProviderList
                providers={providers}
                selectedProvider={selectedProvider}
                defaultProvider={defaultProvider}
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
                defaultProvider={defaultProvider}
                isEditing={isEditing}
                showApiKey={showApiKey[selectedProvider.id] || false}
                testingProvider={testingProvider}
                onEdit={() => setIsEditing(true)}
                onSave={() => setIsEditing(false)}
                onCancel={() => setIsEditing(false)}
                onDelete={handleDeleteProvider}
                onTest={handleTestProvider}
                onSetDefault={handleSetDefaultProvider}
                onToggleApiKey={toggleApiKeyVisibility}
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
        mode="create"
        loading={loading}
        onSubmit={handleCreateProvider}
      />
      
      <AIProviderDialog
        open={!!editingProvider}
        onOpenChange={(open) => !open && setEditingProvider(null)}
        mode="edit"
        initialData={editingProvider}
        loading={loading}
        onSubmit={handleUpdateProvider}
      />
    </div>
  );
} 