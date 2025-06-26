import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Button } from '@/components/x-ui/button';
import { Label } from '@/components/x-ui/label';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';

import { useAIProviders } from '@/hooks/useAIProviders';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AIProviderConfigCreate, 
  AIProviderConfigUpdate,
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
  Edit, 
  Trash2, 
  TestTube, 
  Star,
  Eye,
  EyeOff,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AIProviderDialog } from '@/components/chat/AIProviderDialog';

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
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

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
    if (!editingProvider?.id) return false;
    
    const success = await updateProvider(editingProvider.id, data);
    if (success) {
      setEditingProvider(null);
      toast({
        title: "成功",
        description: "AI供应商更新成功",
      });
    }
    return success;
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
    setEditingProvider(provider);
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
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增供应商
            </Button>
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
                    {/* <div className="text-2xl"> */}
                      {/* {getProviderTypeIcon(provider.provider_type)} */}
                    {/* </div> */}
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{formatProviderDisplayName(provider)}</span>
                        {provider.id === defaultProvider?.id && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {getProviderTypeDisplayName(provider.provider_type)}
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
                        {/*showApiKey[provider.id] ? provider.api_key : maskApiKey(provider.api_key)*/}
                        **********
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
                  {/* 显示代理配置信息 */}
                  {provider.proxy && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>代理配置</span>
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        <p>URL: {provider.proxy.url}</p>
                        {provider.proxy.username && (
                          <p>用户名: {provider.proxy.username}</p>
                        )}
                      </div>
                    </div>
                  )}
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