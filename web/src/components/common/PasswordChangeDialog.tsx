import React, { useState, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/x-ui/dialog';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Lock, Eye, EyeOff, Save, AlertCircle, Check } from 'lucide-react';

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

export function PasswordChangeDialog({ open, onOpenChange, onPasswordChange }: PasswordChangeDialogProps) {
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setError('');
      setSuccess('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open]);

  const validatePasswordForm = () => {
    if (!currentPassword) {
      setError('请输入当前密码');
      return false;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return false;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      return false;
    }
    return true;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePasswordForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await onPasswordChange(currentPassword, newPassword);
      if (result.success) {
        setSuccess(result.message);
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('密码修改失败:', err);
      setError('密码修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lock className="w-4 h-4 mr-2" />
          修改密码
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>
            请输入当前密码和新密码
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="currentPassword" className="text-foreground">当前密码</Label>
            <div className="relative mt-1">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
                placeholder="请输入当前密码"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword" className="text-foreground">新密码</Label>
            <div className="relative mt-1">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                placeholder="请输入新密码（至少6个字符）"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">密码至少需要6个字符</p>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-foreground">确认新密码</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                placeholder="请再次输入新密码"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存密码
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 