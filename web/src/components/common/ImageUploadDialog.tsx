import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/x-ui/dialog';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File;
  onUpload: (file: File, altText: string) => Promise<void>;
}

export function ImageUploadDialog({ open, onOpenChange, imageFile, onUpload }: ImageUploadDialogProps) {
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      
      // Set default alt text based on filename
      const nameWithoutExt = imageFile.name.split('.').slice(0, -1).join('.');
      setAltText(nameWithoutExt || '');
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleUpload = async () => {
    if (!imageFile) return;
    
    setUploading(true);
    setError('');
    
    try {
      await onUpload(imageFile, altText);
      onOpenChange(false);
      setAltText('');
    } catch (err: any) {
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setAltText('');
    setError('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            上传图片
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {previewUrl && (
            <div className="rounded-lg p-2 bg-muted">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-48 mx-auto rounded object-contain"
              />
              <div className="text-xs text-muted-foreground mt-2 text-center">
                {imageFile.name} ({formatFileSize(imageFile.size)})
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="altText" className="text-foreground">
              图片描述
              <span className="text-xs text-muted-foreground">（Alt文本，有助于提高可访问性和SEO）</span>
            </Label>
            <Input
              id="altText"
              placeholder="为图片添加描述（可选）"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              disabled={uploading}
              className="text-foreground"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={uploading}
          >
            取消
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                上传
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}