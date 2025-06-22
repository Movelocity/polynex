import React, { useState, useRef } from 'react';
import { NewImageCropper } from '@/components/ImageCropV2/NewImageCropper';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Input } from '@/components/x-ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  ArrowLeft,
  ImageIcon,
  Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function NewImageCropperDemo() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [croppedResult, setCroppedResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setImageData(base64);
      setCroppedResult(null);
    };
    reader.readAsDataURL(file);
  };

  // 处理拖放上传
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
      setImageData(base64);
      setCroppedResult(null);
    };
    reader.readAsDataURL(file);
  };

  // 处理裁剪完成
  const handleCropComplete = (result: string | null) => {
    setCroppedResult(result);
    if (result) {
      toast({
        title: '成功',
        description: '图片处理完成',
      });
    }
  };

  // 下载图片
  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.click();
  };

  // 重新选择图片
  const handleNewImage = () => {
    setImageData(null);
    setCroppedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              to="/tools" 
              className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回工具列表
            </Link>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 gap-2">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                图片裁剪工具 ver.2
              </span>
            </div>
          </div>
        </div>

        {!imageData ? (
          /* 上传区域 */
          <Card className="max-w-2xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-slate-800">上传图片开始处理</CardTitle>
              <p className="text-slate-600 mt-2">支持 JPG、PNG、GIF 等常见格式</p>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-700 mb-2">
                      拖放图片到这里或点击上传
                    </p>
                    <p className="text-sm text-slate-500">
                      最大文件大小: 10MB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    选择文件
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 裁剪界面 */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主裁剪区域 */}
            <div className="lg:col-span-2">
              <NewImageCropper
                imageData={imageData}
                onCropComplete={handleCropComplete}
              />
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 操作面板 */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    操作面板
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button 
                    onClick={handleNewImage}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择新图片
                  </Button>
                  
                  {croppedResult && (
                    <Button
                      onClick={() => downloadImage(croppedResult, `cropped-${Date.now()}.png`)}
                      variant="attractive"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载结果
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* 功能特点 */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    功能特点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>智能识别图片比例，自动推荐最佳裁剪方案</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>支持手动调整裁剪区域，精确控制</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>多种预设尺寸，满足不同需求</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>高质量输出，保持图片清晰度</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 结果预览 */}
              {/* {croppedResult && (
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-green-600" />
                      处理结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={croppedResult} 
                          alt="裁剪结果预览" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>✅ 处理完成</p>
                        <p>📏 尺寸: ?</p>
                        <p>📁 格式: ?</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 