import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/x-ui/card';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import {  RotateCw, Download, ImageIcon, Upload} from 'lucide-react';
import { toast } from '@/hooks/use-toast';


// 新增：下载组件
export function ImageDownloader({ imageUrl, onReset }: { imageUrl: string, onReset?: () => void}) {
  const [downloadWidth, setDownloadWidth] = useState(800);
  const [downloadHeight, setDownloadHeight] = useState(600);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setOriginalAspectRatio(aspectRatio);
      setDownloadWidth(img.width);
      setDownloadHeight(img.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleWidthChange = useCallback((value: number) => {
    setDownloadWidth(value);
    if (maintainAspectRatio) {
      setDownloadHeight(Math.round(value / originalAspectRatio));
    }
  }, [maintainAspectRatio, originalAspectRatio]);

  const handleHeightChange = useCallback((value: number) => {
    setDownloadHeight(value);
    if (maintainAspectRatio) {
      setDownloadWidth(Math.round(value * originalAspectRatio));
    }
  }, [maintainAspectRatio, originalAspectRatio]);

  const handleDownload = useCallback(async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = downloadWidth;
      canvas.height = downloadHeight;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, downloadWidth, downloadHeight);
        
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = `resized-image-${downloadWidth}x${downloadHeight}-${Date.now()}.jpg`;
        link.click();

        toast({
          title: '成功',
          description: `图片已下载 (${downloadWidth}×${downloadHeight})`
        });
      };
      img.src = imageUrl;
    } catch (error) {
      toast({
        title: '错误',
        description: '下载失败',
        variant: 'destructive'
      });
    }
  }, [imageUrl, downloadWidth, downloadHeight]);

  return (
    <div className="space-y-6">
      {/* 下载设置 */}
      <Card>
        <CardHeader>
          <div className="flex gap-2 items-center">
          <ImageIcon className="w-5 h-5 text-indigo-600" />
            <span className="text-lg font-bold">下载设置</span>
            <CardDescription>调整图片尺寸后下载</CardDescription>
          </div>
          {/* <CardTitle className="text-lg">下载设置</CardTitle> */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">宽度 (px)</Label>
              <Input
                id="width"
                type="number"
                value={downloadWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                min="1"
                max="4000"
              />
            </div>
            <div>
              <Label htmlFor="height">高度 (px)</Label>
              <Input
                id="height"
                type="number"
                value={downloadHeight}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                min="1"
                max="4000"
              />
            </div>
          </div>

          {/* 宽高为1:1时，可以选择常用尺寸预设 */}
          {downloadWidth===downloadHeight && (
            <div>
              <Label className="text-sm font-medium mb-3 block">常用尺寸</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDownloadWidth(64);
                    setDownloadHeight(64);
                  }}
                >
                  64×64
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDownloadWidth(128);
                    setDownloadHeight(128);
                  }}
                >
                  128×128
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDownloadWidth(256);
                    setDownloadHeight(256);
                  }}
                >
                  256×256
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDownloadWidth(512);
                    setDownloadHeight(512);
                  }}
                >
                  512×512
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="aspectRatio"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="aspectRatio">保持宽高比</Label>
          </div>

          <div className="flex gap-3 justify-center">
            <Button onClick={onReset} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              选择新图片
            </Button>
            <Button 
              onClick={handleDownload} 
              // className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              variant="attractive"
            >
              <Download className="w-4 h-4 mr-2" />
              下载图片
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}