import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/x-ui/card';
import { Crop, ScanText, FileJson, Sparkles, MessageSquareText, Bot, Image, PenTool } from 'lucide-react';

export function Tools() {
  const tools = [
    {
      title: 'Chat',
      description: '开始和 Agent 聊天',
      icon: MessageSquareText,
      path: '/chat/conversation',
      color: 'from-theme-orange to-theme-red'
    },
    {
      title: 'AI Agent',
      description: '创建和管理智能AI Agent，配置个性化对话助手',
      icon: Bot,
      path: '/chat/agents',
      color: 'from-theme-teal to-theme-green'
    },
    {
      title: '写文章',
      description: '保留旧版文章编辑器页面',
      icon: PenTool,
      path: '/write',
      color: 'from-theme-blue to-theme-cyan'
    },
    {
      title: '图片裁剪',
      description: '上传图片并裁剪成所需尺寸，支持预设宽高比和自定义尺寸',
      icon: Crop,
      path: '/tools/image-cropper',
      color: 'from-theme-blue to-theme-cyan'
    },
    {
      title: '函数式图片编辑器',
      description: '基于函数指令的图片编辑工具，支持裁剪、调整大小和填充操作',
      icon: Image,
      path: '/tools/functional-image-editor',
      color: 'from-theme-green to-theme-cyan'
    },
    {
      title: '图片OCR',
      description: '上传或粘贴图片进行文字识别，提取图片中的文本内容',
      icon: ScanText,
      path: '/tools/image-ocr',
      color: 'from-theme-indigo to-theme-purple'
    },
    {
      title: 'JSON 格式化',
      description: '格式化、压缩和验证JSON数据，支持语法高亮显示',
      icon: FileJson,
      path: '/tools/json-formatter',
      color: 'from-theme-purple to-theme-pink'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">探索</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link key={tool.path} to={tool.path} className="group">
              <Card className="h-full duration-300 hover:shadow-lg border-border group-hover:border-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${tool.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="mb-2">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 