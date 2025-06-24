import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Crop, ScanText, FileJson, Sparkles, Settings, Bot, MessageCircle } from 'lucide-react';

export function Tools() {
  const tools = [
    {
      title: '图片裁剪',
      description: '上传图片并裁剪成所需尺寸，支持预设宽高比和自定义尺寸',
      icon: Crop,
      path: '/tools/image-cropper',
      color: 'from-theme-blue to-theme-cyan'
    },
    {
      title: '图片裁剪 ver.2',
      description: '上传图片并裁剪成所需尺寸，支持预设宽高比和自定义尺寸。换一种排版方式',
      icon: Sparkles,
      path: '/tools/advanced-image-cropper',
      color: 'from-theme-indigo to-theme-purple'
    },
    {
      title: '图片OCR',
      description: '上传或粘贴图片进行文字识别，提取图片中的文本内容',
      icon: ScanText,
      path: '/tools/image-ocr',
      color: 'from-theme-green to-theme-cyan'
    },
    {
      title: 'JSON 格式化',
      description: '格式化、压缩和验证JSON数据，支持语法高亮显示',
      icon: FileJson,
      path: '/tools/json-formatter',
      color: 'from-theme-purple to-theme-pink'
    },
    {
      title: 'AI供应商管理',
      description: '管理和配置AI服务供应商，设置API密钥和模型参数',
      icon: Settings,
      path: '/tools/ai-provider-management',
      color: 'from-theme-orange to-theme-red'
    },
    {
      title: 'AI Agent管理',
      description: '创建和管理智能AI Agent，配置个性化对话助手',
      icon: Bot,
      path: '/tools/agent-management',
      // color: 'from-theme-teal to-theme-green'
      color: 'from-theme-orange to-theme-red'
    },
    {
      title: '对话管理',
      description: '管理AI对话历史，查看和整理您的聊天记录',
      icon: MessageCircle,
      path: '/tools/conversation-management',
      // color: 'from-theme-violet to-theme-purple'
      color: 'from-theme-orange to-theme-red'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">在线工具</h1>
        <p className="text-muted-foreground">高效便捷的在线工具集合，助力您的日常工作</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link key={tool.path} to={tool.path} className="group">
              <Card className="h-full duration-300 hover:shadow-lg border-border group-hover:border-border">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="">
                    {tool.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
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