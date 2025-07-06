import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Textarea } from '@/components/x-ui/textarea';
import { Label } from '@/components/x-ui/label';
import { Upload, ScanText, Copy, Trash2, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export function ImageOCR() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '错误',
        description: '请上传图片文件',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);
      setExtractedText(''); // 清空之前的文本
    };
    reader.readAsDataURL(file);
  }, []);

  // 处理拖放上传
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '错误',
        description: '请上传图片文件',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);
      setExtractedText(''); // 清空之前的文本
    };
    reader.readAsDataURL(file);
  }, []);

  // 处理粘贴上传
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setUploadedImage(base64);
            setExtractedText(''); // 清空之前的文本
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  // 模拟OCR处理
  const handleOCR = useCallback(async () => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    
    // 模拟API调用延迟
    setTimeout(() => {
      // 模拟OCR结果
      setExtractedText(`这是一个演示页面，OCR功能暂未接入实际API。

当前显示的是模拟文本识别结果。

在实际使用中，这里会显示从图片中识别出的真实文本内容。

您可以测试上传图片的功能，包括：
• 点击上传按钮选择图片
• 拖拽图片到上传区域
• 使用 Ctrl+V 粘贴剪贴板中的图片

识别完成后，您可以：
• 复制识别结果到剪贴板
• 清空当前内容重新开始

时间戳：${new Date().toLocaleString()}`);
      
      setIsProcessing(false);
      toast({
        title: '识别完成',
        description: '文字识别已完成（演示模式）'
      });
    }, 2000);
  }, [uploadedImage]);

  // 复制文本
  const handleCopyText = useCallback(() => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      toast({
        title: '成功',
        description: '文本已复制到剪贴板'
      });
    }
  }, [extractedText]);

  // 清空所有内容
  const handleClear = useCallback(() => {
    setUploadedImage(null);
    setExtractedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 阻止默认拖拽行为
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            to="/tools" 
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回工具列表
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">图片OCR识别</h1>
        <p className="text-muted-foreground">上传图片或粘贴图片进行文字识别（演示版本）</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 图片上传区域 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5" />
                <span>图片上传</span>
              </CardTitle>
              <CardDescription>
                支持拖拽、点击上传或粘贴图片（Ctrl+V）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!uploadedImage ? (
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    拖放图片到这里或点击上传
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    支持 JPG、PNG、GIF 等格式
                  </p>
                  <p className="text-xs text-slate-400">
                    提示：您也可以使用 Ctrl+V 粘贴剪贴板中的图片
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={uploadedImage}
                      alt="上传的图片"
                      className="max-w-full max-h-96 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleOCR}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      <ScanText className="w-4 h-4 mr-2" />
                      {isProcessing ? '识别中...' : '开始识别'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClear}
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start space-x-2">
                <span className="font-medium text-slate-800">1.</span>
                <span>上传图片：点击上传区域、拖拽图片或使用 Ctrl+V 粘贴</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-slate-800">2.</span>
                <span>开始识别：点击"开始识别"按钮进行文字识别</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-slate-800">3.</span>
                <span>查看结果：识别完成后在右侧查看提取的文本</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-slate-800">4.</span>
                <span>复制文本：点击复制按钮将结果复制到剪贴板</span>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-700 text-xs">
                  <strong>注意：</strong>这是演示版本，实际OCR API尚未接入。当前会显示模拟的识别结果。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 识别结果区域 */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <ScanText className="w-5 h-5" />
                  <span>识别结果</span>
                </span>
                {extractedText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                ...
              </CardDescription>
            </CardHeader>
            <CardContent>
              {extractedText ? (
                <div className="space-y-4">
                  <Label htmlFor="extracted-text">识别出的文本：</Label>
                  <Textarea
                    id="extracted-text"
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    placeholder="识别出的文本将显示在这里..."
                    rows={20}
                    className="resize-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                  <ScanText className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium mb-2">等待图片识别</p>
                  <p className="text-sm text-center">
                    请先上传图片并点击"开始识别"按钮
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 