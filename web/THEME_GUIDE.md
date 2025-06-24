# 深浅色主题系统使用指南

本指南介绍了项目中完整的深浅色主题系统，包括扩展的颜色类、组件样式和使用最佳实践。

## 🎨 主题概述

这个主题系统是基于 Tailwind CSS 和 shadcn/ui 的扩展，提供了：

- ✅ 完整的深浅色主题支持
- ✅ 扩展的主题色彩系统 (9种颜色)
- ✅ 语义化状态颜色 (成功、警告、信息、危险)
- ✅ 自适应灰度系统
- ✅ 预定义渐变背景
- ✅ 扩展的组件样式
- ✅ CSS 变量驱动，支持动态主题切换

## 🚀 快速开始

### 1. 主题切换

通过添加或移除 `dark` 类来切换深浅色主题：

```typescript
// 切换到深色主题
document.documentElement.classList.add('dark');

// 切换到浅色主题
document.documentElement.classList.remove('dark');

// 切换主题
document.documentElement.classList.toggle('dark');
```

### 2. 基础使用示例

```tsx
import { ThemeDemo } from '@/components/ThemeDemo';

// 在页面中使用主题演示组件
<ThemeDemo />
```

## 🎯 颜色系统

### 基础颜色 CSS 变量

所有颜色都使用 HSL 格式的 CSS 变量定义：

#### 浅色主题变量
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --secondary: 240 4.8% 95.9%;
  /* ... 更多变量 */
}
```

#### 深色主题变量
```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --secondary: 240 3.7% 15.9%;
  /* ... 更多变量 */
}
```

### 主题色彩

#### 可用的主题色彩
- **Blue** (`--blue`) - 蓝色主题
- **Green** (`--green`) - 绿色主题  
- **Purple** (`--purple`) - 紫色主题
- **Orange** (`--orange`) - 橙色主题
- **Pink** (`--pink`) - 粉色主题
- **Cyan** (`--cyan`) - 青色主题
- **Indigo** (`--indigo`) - 靛蓝主题
- **Yellow** (`--yellow`) - 黄色主题
- **Red** (`--red`) - 红色主题

#### 使用方法

```tsx
// 背景色
<div className="bg-theme-blue">蓝色背景</div>
<div className="bg-theme-green">绿色背景</div>
<div className="bg-theme-purple">紫色背景</div>

// 文字颜色
<span className="text-theme-blue">蓝色文字</span>
<span className="text-theme-green">绿色文字</span>

// 边框颜色
<div className="border border-theme-purple">紫色边框</div>

// Tailwind 配置中的颜色
<div className="bg-theme-blue text-theme-blue-foreground">
  使用配置的主题色
</div>
```

### 状态颜色

#### 可用的状态颜色
- **Success** (`--success`) - 成功状态
- **Warning** (`--warning`) - 警告状态
- **Info** (`--info`) - 信息状态
- **Destructive** (`--destructive`) - 危险状态

#### 使用方法

```tsx
// 背景色
<div className="bg-success">成功背景</div>
<div className="bg-warning">警告背景</div>
<div className="bg-info">信息背景</div>

// 文字颜色
<span className="text-success">成功文字</span>
<span className="text-warning">警告文字</span>

// 边框颜色
<div className="border border-info">信息边框</div>

// 在组件中使用
<Alert className="bg-success text-white">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>成功</AlertTitle>
  <AlertDescription>操作成功完成！</AlertDescription>
</Alert>
```

### 灰度系统

扩展的灰度系统，在深浅色主题下自动适配：

```tsx
// 背景色 (50-900)
<div className="bg-gray-50">最浅灰色</div>
<div className="bg-gray-500">中等灰色</div>
<div className="bg-gray-900">最深灰色</div>

// 文字颜色
<span className="text-gray-400">灰色文字</span>
<span className="text-gray-600">深灰色文字</span>

// 使用 Tailwind 配置的灰度
<div className="bg-gray-custom-100">自定义灰度</div>
```

## 🎨 预定义样式类

### 渐变背景

```tsx
// 预定义渐变
<div className="bg-gradient-primary">主要渐变</div>
<div className="bg-gradient-blue">蓝色渐变</div>
<div className="bg-gradient-green">绿色渐变</div>
<div className="bg-gradient-purple">紫色渐变</div>
<div className="bg-gradient-warm">暖色调渐变</div>
<div className="bg-gradient-cool">冷色调渐变</div>
```

### 卡片样式

```tsx
// 不同样式的卡片
<Card className="card-elevated">高阴影卡片</Card>
<Card className="card-subtle">轻微阴影卡片</Card>
<Card className="card-flat">扁平卡片</Card>
```

### 按钮样式

```tsx
// 状态按钮
<Button className="btn-success">成功按钮</Button>
<Button className="btn-warning">警告按钮</Button>
<Button className="btn-info">信息按钮</Button>

// 现有的变体按钮
<Button variant="pretty">漂亮按钮</Button>
<Button variant="attractive">吸引按钮</Button>
```

### 文本样式

```tsx
// 语义化文本样式
<p className="text-subtle">次要文本</p>
<p className="text-emphasis">强调文本</p>
<p className="text-highlight">高亮文本</p>
```

## 📱 组件集成示例

### 完整的卡片组件

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { Button } from '@/components/x-ui/button';

const ExampleCard = () => (
  <Card className="card-elevated">
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-highlight">项目标题</CardTitle>
        <Badge className="bg-success text-white">活跃</Badge>
      </div>
      <CardDescription className="text-subtle">
        这是一个使用新主题系统的示例卡片
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-emphasis mb-4">
        这个卡片展示了如何使用扩展的主题类
      </p>
      <div className="flex space-x-2">
        <Button className="btn-success">保存</Button>
        <Button variant="outline" className="border-theme-blue text-theme-blue">
          编辑
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

### 状态提示组件

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/x-ui/alert';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const StatusAlerts = () => (
  <div className="space-y-4">
    <Alert className="bg-success text-white">
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>成功</AlertTitle>
      <AlertDescription>操作成功完成！</AlertDescription>
    </Alert>
    
    <Alert className="bg-warning text-white">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>警告</AlertTitle>
      <AlertDescription>请注意这个操作的影响</AlertDescription>
    </Alert>
    
    <Alert className="bg-info text-white">
      <Info className="h-4 w-4" />
      <AlertTitle>信息</AlertTitle>
      <AlertDescription>这里有一些有用的信息</AlertDescription>
    </Alert>
  </div>
);
```

## 🛠️ 自定义扩展

### 添加新的主题色

1. 在 `src/index.css` 中添加 CSS 变量：

```css
:root {
  --custom-color: 180 100% 50%;
  --custom-color-foreground: 0 0% 100%;
}

.dark {
  --custom-color: 180 100% 40%;
  --custom-color-foreground: 0 0% 100%;
}
```

2. 在 `@layer components` 中添加实用类：

```css
@layer components {
  .bg-custom { @apply bg-[hsl(var(--custom-color))]; }
  .text-custom { @apply text-[hsl(var(--custom-color))]; }
  .border-custom { @apply border-[hsl(var(--custom-color))]; }
}
```

3. 在 `tailwind.config.js` 中添加配置：

```javascript
colors: {
  'custom': {
    DEFAULT: 'hsl(var(--custom-color))',
    foreground: 'hsl(var(--custom-color-foreground))',
  },
}
```

### 添加新的渐变

```css
@layer components {
  .bg-gradient-custom {
    @apply bg-gradient-to-r from-[hsl(var(--custom-color))] to-[hsl(var(--primary))];
  }
}
```

## 🎭 主题切换实现

### React Hook 示例

```tsx
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取主题设置
    const saved = localStorage.getItem('theme');
    const isDarkMode = saved === 'dark' || 
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return { isDark, toggleTheme };
};
```

### 主题切换组件

```tsx
import { Switch } from '@/components/x-ui/switch';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4 text-yellow-500" />
      <Switch 
        checked={isDark} 
        onCheckedChange={toggleTheme}
        aria-label="切换深浅色主题"
      />
      <Moon className="h-4 w-4 text-blue-500" />
    </div>
  );
};
```

## 📋 最佳实践

### 1. 语义化使用

```tsx
// ✅ 好的做法 - 使用语义化类名
<div className="bg-success text-success-foreground">成功状态</div>
<p className="text-emphasis">重要信息</p>
<span className="text-subtle">次要信息</span>

// ❌ 避免 - 直接使用颜色名称用于语义
<div className="bg-green-500">成功状态</div> // 不够语义化
```

### 2. 深色模式适配

```tsx
// ✅ 自动适配深浅色
<div className="bg-card text-card-foreground">
  这个卡片在深浅色模式下都会正确显示
</div>

// ❌ 避免硬编码颜色
<div className="bg-white text-black">
  这在深色模式下会很难看
</div>
```

### 3. 组件一致性

```tsx
// ✅ 使用预定义的组件样式
<Card className="card-elevated">
  <CardContent>内容</CardContent>
</Card>

// ✅ 保持按钮样式一致
<Button className="btn-success">保存</Button>
<Button className="btn-warning">警告</Button>
```

### 4. 颜色对比度

确保文字和背景有足够的对比度：

```tsx
// ✅ 使用配套的前景色
<div className="bg-theme-blue text-theme-blue-foreground">
  良好的对比度
</div>

// ✅ 使用状态色的配套前景色
<Alert className="bg-success text-success-foreground">
  成功提示
</Alert>
```

## 🔧 实用工具类

### 滚动条样式

```tsx
// 隐藏滚动条
<div className="scrollbar-hide overflow-auto">内容</div>

// 显示默认滚动条
<div className="scrollbar-default overflow-auto">内容</div>
```

### 文本换行

```tsx
// 平衡换行
<p className="text-balance">这个文本会使用平衡换行</p>

// 优美换行
<p className="text-pretty">这个文本会使用优美换行</p>
```

### 动画类

```tsx
// 淡入动画
<div className="animate-fade-in">淡入内容</div>

// 滑入动画
<div className="animate-slide-in">滑入内容</div>

// 微妙脉冲动画
<div className="animate-pulse-subtle">脉冲内容</div>
```

## 📚 完整的类名参考

### 主题色彩类
- `bg-theme-{color}` - 背景色
- `text-theme-{color}` - 文字色
- `border-theme-{color}` - 边框色

### 状态颜色类
- `bg-{status}` - 背景色 (success, warning, info, destructive)
- `text-{status}` - 文字色
- `border-{status}` - 边框色

### 渐变类
- `bg-gradient-primary` - 主要渐变
- `bg-gradient-blue` - 蓝色渐变
- `bg-gradient-green` - 绿色渐变
- `bg-gradient-purple` - 紫色渐变
- `bg-gradient-warm` - 暖色渐变
- `bg-gradient-cool` - 冷色渐变

### 组件样式类
- `card-elevated` - 高阴影卡片
- `card-subtle` - 轻微阴影卡片
- `card-flat` - 扁平卡片
- `btn-success` - 成功按钮
- `btn-warning` - 警告按钮
- `btn-info` - 信息按钮

### 文本样式类
- `text-subtle` - 次要文本
- `text-emphasis` - 强调文本
- `text-highlight` - 高亮文本

## 🎉 总结

这个扩展的主题系统为你的项目提供了：

1. **完整的深浅色支持** - 所有颜色都会在两种模式下正确显示
2. **丰富的颜色选择** - 9种主题色 + 4种状态色 + 完整灰度系统
3. **易于扩展** - 基于 CSS 变量，可以轻松添加新颜色
4. **语义化设计** - 使用有意义的类名，提高代码可读性
5. **最佳实践** - 遵循现代 Web 设计和可访问性标准

通过使用这个主题系统，你可以快速创建美观、一致且易于维护的用户界面。 