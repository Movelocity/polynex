import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Crop, ScanText, FileJson, Sparkles } from 'lucide-react';

export function Tools() {
  const tools = [
    {
      title: '图片裁剪',
      description: '上传图片并裁剪成所需尺寸，支持预设宽高比和自定义尺寸',
      icon: Crop,
      path: '/tools/image-cropper',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: '图片裁剪 ver.2',
      description: '上传图片并裁剪成所需尺寸，支持预设宽高比和自定义尺寸。换一种排版方式',
      icon: Sparkles,
      path: '/tools/advanced-image-cropper',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      title: '图片OCR',
      description: '上传或粘贴图片进行文字识别，提取图片中的文本内容',
      icon: ScanText,
      path: '/tools/image-ocr',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'JSON 格式化',
      description: '格式化、压缩和验证JSON数据，支持语法高亮显示',
      icon: FileJson,
      path: '/tools/json-formatter',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">在线工具</h1>
        <p className="text-slate-600">高效便捷的在线工具集合，助力您的日常工作</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link key={tool.path} to={tool.path} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-200 group-hover:border-slate-300">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-slate-900 group-hover:text-slate-700">
                    {tool.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed">
                    {tool.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 