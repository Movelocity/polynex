import { useState, useEffect} from 'react';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Textarea } from '@/components/x-ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { Switch } from '@/components/x-ui/switch';
import { AgentAvatarEditor } from '@/components/chat/AgentAvatarEditor';
import { AvatarConfig } from '@/types';
import { toast } from '@/hooks/use-toast';
import { 
  Settings2,
  Globe,
} from 'lucide-react';
import { AgentAvatar } from '@/components/chat/AgentAvatar'
import { Agent, AgentInfo } from '@/components/chat/types';

interface AgentInfoEditorProps {
  agent?: Agent;
  show: boolean;
  onShowChange: (show: boolean) => void;
  onSave: (agent: AgentInfo) => void;
  isCreateMode?: boolean;
  triggerButton?: React.ReactNode;
}
/** 编辑Agent基本信息 */
export function AgentInfoEditor({ agent, show, onShowChange, onSave, isCreateMode = false, triggerButton }: AgentInfoEditorProps) {
  const defaultAvatar: AvatarConfig = {
    variant: 'emoji',
    emoji: '🤖',
    bg_color: 'bg-blue-500'
  };

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    avatar: AvatarConfig;
    access_level: number;
  }>({
    name: agent?.app_preset?.name || '',
    description: agent?.app_preset?.description || '',
    avatar: agent?.avatar || defaultAvatar,
    access_level: agent?.access_level || 1,
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.app_preset.name,
        description: agent.app_preset.description,
        avatar: agent.avatar,
        access_level: agent.access_level,
      });
    }
  }, [agent]);

  const [showAvatarConfig, setShowAvatarConfig] = useState(false);

  return (
    <>
      <Dialog open={show} onOpenChange={onShowChange}>
        {triggerButton ? (
          <DialogTrigger asChild>
            {triggerButton}
          </DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => onShowChange(true)}>
              <Settings2 className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? '创建Agent' : '应用配置'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Agent名称 *</Label>
              <div className="flex items-center gap-2">
                <AgentAvatar
                  avatar={formData.avatar}
                  name={formData.name || 'New Agent'}
                  variant="square"
                  size="md"
                  onClick={() => {setShowAvatarConfig(true);}}
                />
                <Input
                  className="flex-1"
                  placeholder="输入Agent名称..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>描述</Label>
              <Textarea
                placeholder="描述这个Agent的功能..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                checked={formData.access_level === 3}
                onCheckedChange={(checked) => setFormData({...formData, access_level: checked ? 3 : 1})}
              />
            </div>

          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => onShowChange(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (!formData.name.trim()) {
                toast({
                  title: '保存失败',
                  description: 'Agent名称不能为空',
                  variant: 'destructive'
                });
                return;
              }
              
              onSave({
                name: formData.name,
                description: formData.description,
                avatar: formData.avatar,
                access_level: formData.access_level
              });
              onShowChange(false);
            }}>
              {isCreateMode ? '创建' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 头像配置 */}
      <Dialog open={showAvatarConfig} onOpenChange={setShowAvatarConfig}>
        <DialogContent className="sm:max-w-md text-foreground" aria-describedby="">
          <DialogTitle className="text-lg font-semibold">头像配置</DialogTitle>
          <AgentAvatarEditor
            avatar={formData.avatar}
            name={formData.name || 'Agent'}
            onChange={(avatar) => {
              setFormData({...formData, avatar: avatar});
              setShowAvatarConfig(false);
            }}
            onCancel={() => setShowAvatarConfig(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}