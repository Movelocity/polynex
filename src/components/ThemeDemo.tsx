import React, { useState } from 'react';
import { Button } from '@/components/x-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/x-ui/alert';
import { Switch } from '@/components/x-ui/switch';
import { Sun, Moon, Palette, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * ThemeDemo 组件 - 展示完整的深浅色主题系统
 * 
 * 这个组件演示了如何使用扩展的主题类，包括：
 * - 深浅色主题切换
 * - 扩展的主题色彩
 * - 状态颜色
 * - 灰度系统
 * - 渐变背景
 * - 卡片样式
 * - 按钮样式
 */
export const ThemeDemo: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 切换深浅色主题
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // 主题色彩配置
  const themeColors = [
    { name: 'Blue', class: 'bg-theme-blue', textClass: 'text-theme-blue', borderClass: 'border-theme-blue' },
    { name: 'Green', class: 'bg-theme-green', textClass: 'text-theme-green', borderClass: 'border-theme-green' },
    { name: 'Purple', class: 'bg-theme-purple', textClass: 'text-theme-purple', borderClass: 'border-theme-purple' },
    { name: 'Orange', class: 'bg-theme-orange', textClass: 'text-theme-orange', borderClass: 'border-theme-orange' },
    { name: 'Pink', class: 'bg-theme-pink', textClass: 'text-theme-pink', borderClass: 'border-theme-pink' },
    { name: 'Cyan', class: 'bg-theme-cyan', textClass: 'text-theme-cyan', borderClass: 'border-theme-cyan' },
    { name: 'Indigo', class: 'bg-theme-indigo', textClass: 'text-theme-indigo', borderClass: 'border-theme-indigo' },
    { name: 'Yellow', class: 'bg-theme-yellow', textClass: 'text-theme-yellow', borderClass: 'border-theme-yellow' },
    { name: 'Red', class: 'bg-theme-red', textClass: 'text-theme-red', borderClass: 'border-theme-red' },
  ];

  // 状态颜色配置
  const statusColors = [
    { name: 'Success', class: 'bg-success', textClass: 'text-success', icon: CheckCircle },
    { name: 'Warning', class: 'bg-warning', textClass: 'text-warning', icon: AlertTriangle },
    { name: 'Info', class: 'bg-info', textClass: 'text-info', icon: Info },
    { name: 'Destructive', class: 'bg-destructive', textClass: 'text-destructive', icon: X },
  ];

  // 渐变背景配置
  const gradients = [
    { name: 'Primary', class: 'bg-gradient-primary' },
    { name: 'Blue', class: 'bg-gradient-blue' },
    { name: 'Green', class: 'bg-gradient-green' },
    { name: 'Purple', class: 'bg-gradient-purple' },
    { name: 'Warm', class: 'bg-gradient-warm' },
    { name: 'Cool', class: 'bg-gradient-cool' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 标题和主题切换 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emphasis">主题演示</h1>
            <p className="text-subtle mt-2">展示完整的深浅色主题系统</p>
          </div>
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4" />
            <Switch 
              checked={isDarkMode} 
              onCheckedChange={toggleTheme}
              aria-label="切换深浅色主题"
            />
            <Moon className="h-4 w-4" />
          </div>
        </div>

        {/* 主题色彩展示 */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>主题色彩</span>
            </CardTitle>
            <CardDescription>
              扩展的主题色彩系统，支持深浅色模式自动切换
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {themeColors.map((color) => (
                <div key={color.name} className="text-center">
                  <div className={`w-16 h-16 rounded-lg mx-auto mb-2 ${color.class} shadow-md`} />
                  <p className={`font-medium ${color.textClass}`}>{color.name}</p>
                  <div className={`mt-1 mx-auto w-8 h-0.5 ${color.class}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 状态颜色展示 */}
        <Card className="card-subtle">
          <CardHeader>
            <CardTitle>状态颜色</CardTitle>
            <CardDescription>
              用于表示不同状态的语义化颜色
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {statusColors.map((status) => (
                <Alert key={status.name} className={`${status.class} text-white`}>
                  <status.icon className="h-4 w-4" />
                  <AlertTitle>{status.name}</AlertTitle>
                  <AlertDescription>
                    这是一个 {status.name.toLowerCase()} 状态的示例
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 按钮样式展示 */}
        <Card className="card-flat">
          <CardHeader>
            <CardTitle>按钮样式</CardTitle>
            <CardDescription>
              扩展的按钮样式，包括状态按钮和主题按钮
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">默认按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="ghost">透明按钮</Button>
              <Button variant="destructive">危险按钮</Button>
              <Button className="btn-success">成功按钮</Button>
              <Button className="btn-warning">警告按钮</Button>
              <Button className="btn-info">信息按钮</Button>
              <Button variant="pretty">漂亮按钮</Button>
              <Button variant="attractive">吸引按钮</Button>
            </div>
          </CardContent>
        </Card>

        {/* 渐变背景展示 */}
        <Card>
          <CardHeader>
            <CardTitle>渐变背景</CardTitle>
            <CardDescription>
              预定义的渐变背景样式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gradients.map((gradient) => (
                <div key={gradient.name} className="text-center">
                  <div className={`w-full h-20 rounded-lg ${gradient.class} shadow-md flex items-center justify-center`}>
                    <span className="text-white font-medium">{gradient.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 徽章展示 */}
        <Card>
          <CardHeader>
            <CardTitle>徽章样式</CardTitle>
            <CardDescription>
              不同样式的徽章组件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>默认</Badge>
              <Badge variant="secondary">次要</Badge>
              <Badge variant="outline">轮廓</Badge>
              <Badge variant="destructive">危险</Badge>
              <Badge className="bg-theme-blue text-white">蓝色</Badge>
              <Badge className="bg-theme-green text-white">绿色</Badge>
              <Badge className="bg-theme-purple text-white">紫色</Badge>
              <Badge className="bg-success text-white">成功</Badge>
              <Badge className="bg-warning text-white">警告</Badge>
              <Badge className="bg-info text-white">信息</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 文本样式展示 */}
        <Card>
          <CardHeader>
            <CardTitle>文本样式</CardTitle>
            <CardDescription>
              语义化的文本样式类
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-foreground">这是普通文本</p>
              <p className="text-subtle">这是次要文本</p>
              <p className="text-emphasis">这是强调文本</p>
              <p className="text-highlight">这是高亮文本</p>
              <p className="text-muted-foreground">这是静音文本</p>
              <div className="flex space-x-4 mt-4">
                <span className="text-theme-blue">蓝色文本</span>
                <span className="text-theme-green">绿色文本</span>
                <span className="text-theme-purple">紫色文本</span>
                <span className="text-success">成功文本</span>
                <span className="text-warning">警告文本</span>
                <span className="text-info">信息文本</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 灰度系统展示 */}
        <Card>
          <CardHeader>
            <CardTitle>灰度系统</CardTitle>
            <CardDescription>
              自适应的灰度色彩系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div key={shade} className="text-center">
                  <div className={`w-full h-12 rounded bg-gray-custom-${shade} shadow-sm`} />
                  <p className="text-xs mt-1 text-subtle">{shade}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
            <CardDescription>
              如何在项目中使用这些主题类
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-emphasis mb-2">主题色彩</h4>
                <p className="text-subtle text-sm">
                  使用 <code className="bg-muted px-1 py-0.5 rounded">bg-theme-blue</code>、
                  <code className="bg-muted px-1 py-0.5 rounded">text-theme-green</code>、
                  <code className="bg-muted px-1 py-0.5 rounded">border-theme-purple</code> 等类
                </p>
              </div>
              <div>
                <h4 className="font-medium text-emphasis mb-2">状态颜色</h4>
                <p className="text-subtle text-sm">
                  使用 <code className="bg-muted px-1 py-0.5 rounded">bg-success</code>、
                  <code className="bg-muted px-1 py-0.5 rounded">text-warning</code>、
                  <code className="bg-muted px-1 py-0.5 rounded">border-info</code> 等类
                </p>
              </div>
              <div>
                <h4 className="font-medium text-emphasis mb-2">渐变背景</h4>
                <p className="text-subtle text-sm">
                  使用 <code className="bg-muted px-1 py-0.5 rounded">bg-gradient-primary</code>、
                  <code className="bg-muted px-1 py-0.5 rounded">bg-gradient-blue</code> 等类
                </p>
              </div>
              <div>
                <h4 className="font-medium text-emphasis mb-2">深色模式</h4>
                <p className="text-subtle text-sm">
                  所有颜色都会在深色模式下自动调整，通过在 html 元素上添加 
                  <code className="bg-muted px-1 py-0.5 rounded">dark</code> 类来切换
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 