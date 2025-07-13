import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/x-ui/dialog';
import { Button } from '@/components/x-ui/button';
import { Textarea } from '@/components/x-ui/textarea';
import { ConversationMessage } from '@/types';
import { Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: ConversationMessage | null;
  messageIndex: number;
  onSave: (messageIndex: number, newContent: string) => Promise<void>;
}

export const MessageEditDialog: React.FC<MessageEditDialogProps> = ({
  isOpen,
  onClose,
  message,
  messageIndex,
  onSave
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 当消息改变时更新内容
  useEffect(() => {
    if (message) {
      setContent(message.content);
    }
  }, [message]);

  // 处理保存
  const handleSave = async () => {
    if (!message || content.trim() === message.content.trim()) {
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      await onSave(messageIndex, content.trim());
      toast({
        title: "成功",
        description: "消息内容已更新",
      });
      onClose();
    } catch (error) {
      toast({
        title: "错误",
        description: "更新消息内容失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    setContent(message?.content || '');
    onClose();
  };

  // 检查是否有更改
  const hasChanges = content.trim() !== message?.content?.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1024px]">
        <DialogHeader>
          <DialogTitle>修改{message?.role === 'user' ? '用户' : 'AI助手'}的消息内容</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2 relative">
            <Textarea
              id="message-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入消息内容..."
              className="min-h-[400px] resize-none"
              maxLength={128000}
            />
            <div className="text-sm text-muted-foreground text-right absolute bottom-2 right-4">
              {content.length}/128000
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !hasChanges || !content.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 