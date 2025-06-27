import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/x-ui/dialog';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Textarea } from '@/components/x-ui/textarea';
import { 
  AIProviderType, 
  AIProviderConfigCreate, 
  AIProviderConfigUpdate,
  ProxyConfig
} from '@/types';
import { 
  getProviderTypeDisplayName,
  validateProviderConfig 
} from '@/utils/aiProviderUtils';
import { AlertCircle, Globe } from 'lucide-react';

interface ProviderFormData {
  name: string;
  provider_type: AIProviderType;
  base_url: string;
  api_key: string;
  models: string[];
  default_model: string;
  proxy?: ProxyConfig;
  is_active: boolean;
}

interface AIProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: any; // 现有供应商数据，用于编辑模式
  loading: boolean;
  onSubmit: (data: AIProviderConfigCreate | AIProviderConfigUpdate) => Promise<boolean>;
}

export function AIProviderDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  loading,
  onSubmit
}: AIProviderDialogProps) {
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    provider_type: AIProviderType.OPENAI,
    base_url: '',
    api_key: '',
    models: [],
    default_model: '',
    proxy: {
      url: '',
      username: '',
      password: ''
    },
    is_active: true
  });
  const [modelsInput, setModelsInput] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // 当对话框打开时，根据模式初始化表单数据
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setFormData({
          name: initialData.name,
          provider_type: initialData.provider_type,
          base_url: initialData.base_url,
          api_key: initialData.api_key,
          models: initialData.models,
          default_model: initialData.default_model,
          proxy: {
            url: initialData.proxy?.url || '',
            username: initialData.proxy?.username || '',
            password: initialData.proxy?.password || ''
          },
          is_active: initialData.is_active
        });
        setModelsInput(initialData.models.join(', '));
      } else {
        resetForm();
      }
      setFormErrors([]);
    }
  }, [open, mode, initialData]);

  const resetForm = () => {
    setFormData({
      name: '',
      provider_type: AIProviderType.OPENAI,
      base_url: '',
      api_key: '',
      models: [],
      default_model: '',
      proxy: {
        url: '',
        username: '',
        password: ''
      },
      is_active: true
    });
    setModelsInput('');
    setFormErrors([]);
  };

  const handleSubmit = async () => {
    // 处理模型列表
    const models = modelsInput.split(',').map(m => m.trim()).filter(m => m);
    
    // 处理代理配置
    let proxyConfig: ProxyConfig | undefined = undefined;
    if (formData.proxy?.url && formData.proxy.url.trim()) {
      proxyConfig = {
        url: formData.proxy.url.trim(),
        username: formData.proxy.username?.trim() || undefined,
        password: formData.proxy.password?.trim() || undefined
      };
    }
    
    const submitData = {
      ...formData,
      models,
      proxy: proxyConfig
    };

    // 验证数据
    const errors = validateProviderConfig(submitData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const success = await onSubmit(submitData);
    if (success) {
      onOpenChange(false);
      resetForm();
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] text-foreground flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '创建AI供应商' : '编辑AI供应商'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? '添加新的AI服务供应商配置'
              : '修改AI供应商配置信息'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="w-[105%] pl-0.5 pr-2 space-y-4 flex-1 overflow-y-auto">
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
              id="mingzi"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如：OpenAI主配置"
              autoComplete="off"
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
            <Label htmlFor="jiben_url">API基础URL</Label>
            <Input
              id="jiben_url"
              value={formData.base_url}
              onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
              placeholder="例如：https://api.openai.com/v1"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_miyao">API密钥</Label>
            <Input
              id="api_miyao"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="输入API密钥"
              autoComplete="off"
            />
          </div>

          {/* 代理配置部分 */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <Label className="text-sm font-medium">代理配置（可选）</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proxy_url">代理URL</Label>
              <Input
                id="proxy_url"
                value={formData.proxy?.url || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  proxy: { ...prev.proxy, url: e.target.value }
                }))}
                placeholder="例如：http://127.0.0.1:7890"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                支持 HTTP/HTTPS/SOCKS5 代理，格式：协议://地址:端口
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="daili_yonghuming">代理用户名</Label>
                <Input
                  id="daili_yonghuming"  // 使用拼音名，避免被检测为用户名输入框
                  value={formData.proxy?.username || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    proxy: { ...prev.proxy, username: e.target.value }
                  }))}
                  placeholder="可选"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daili_miyao">代理密码</Label>
                <Input
                  id="daili_miyao"
                  type="password"
                  value={formData.proxy?.password || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    proxy: { ...prev.proxy, password: e.target.value }
                  }))}
                  placeholder="可选"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="models">支持的模型</Label>
            <Textarea
              id="models"
              value={modelsInput}
              onChange={(e) => setModelsInput(e.target.value)}
              placeholder="输入模型名称，用逗号分隔。例如：gpt-4, gpt-3.5-turbo"
              className="min-h-[80px]"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_model">默认模型</Label>
            <Input
              id="default_model"
              value={formData.default_model}
              onChange={(e) => setFormData(prev => ({ ...prev, default_model: e.target.value }))}
              placeholder="例如：gpt-4"
              autoComplete="off"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              autoComplete="off"
            />
            <Label htmlFor="is_active">启用供应商</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (mode === 'create' ? '创建中...' : '更新中...') : (mode === 'create' ? '创建' : '更新')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 