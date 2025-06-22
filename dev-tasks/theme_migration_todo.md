# 主题色迁移任务清单

## 🎯 总体目标
将所有硬编码的颜色类替换为支持深浅色主题切换的颜色类，确保整个应用在深浅色模式下都能正常显示。

## ✅ 已完成
- [x] **useTheme Hook** - 创建主题切换功能
- [x] **HeadBanner 组件** - 添加主题切换按钮，替换所有硬编码颜色
- [x] **Layout.tsx** - 核心布局组件主题色修改完成
- [x] **BlogCard.tsx** - 博客卡片组件主题色修改完成  
- [x] **WriteBlog.tsx** - 写文章页面主题色修改完成
- [x] **BlogDetail.tsx** - 文章详情页面主题色修改完成
- [x] **TOC.tsx** - 目录组件主题色修改完成
- [x] **UserAvatar.tsx** - 用户头像组件主题色修改完成
- [x] **Tools.tsx** - 工具页面主题色修改完成
- [x] **UserSettings.tsx** - 用户设置页面主题色修改完成
- [x] **JsonFormatter.tsx** - JSON格式化工具主题色修改完成
- [x] **NewImageCropperDemo.tsx** - 图片裁剪工具主题色修改完成（部分）

## 🔄 待修改组件清单

### 1. 高优先级 - 核心布局组件

#### 📁 Layout.tsx
**当前问题：**
```tsx
- `bg-gradient-to-br from-slate-50 to-blue-50` → `bg-gradient-to-br from-background to-theme-blue/5`
- `bg-white border-t border-slate-200` → `bg-background border-t border-border`
- `from-blue-600 to-purple-600` → `from-theme-blue to-theme-purple`
- `text-white` → `text-white` (可保持)
- `text-slate-600` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
```

### 2. 页面组件

#### 📁 pages/WriteBlog.tsx
**当前问题：**
```tsx
- `bg-blue-50 border-blue-200` → `bg-theme-blue/5 border-theme-blue/20`
- `text-blue-800` → `text-theme-blue`
- `text-blue-700` → `text-theme-blue`
- `bg-white/80` → `bg-background/80`
- `from-blue-600 to-purple-600` → `from-theme-blue to-theme-purple`
- `text-slate-500` → `text-muted-foreground`
- `text-red-600` → `text-destructive`
```

#### 📁 pages/UserSettings.tsx
**当前问题：**
```tsx
- `border-slate-600` → `border-foreground`
- `text-slate-800` → `text-foreground`
- `border-green-200 bg-green-50` → `border-success/20 bg-success/5`
- `text-green-600` → `text-success`
- `text-green-800` → `text-success`
- `bg-slate-50` → `bg-muted`
- `text-slate-500` → `text-muted-foreground`
```

#### 📁 pages/Tools.tsx
**当前问题：**
```tsx
- `from-blue-500 to-cyan-500` → `from-theme-blue to-theme-cyan`
- `from-indigo-500 to-purple-500` → `from-theme-indigo to-theme-purple`
- `from-green-500 to-emerald-500` → `from-theme-green to-theme-cyan`
- `from-purple-500 to-pink-500` → `from-theme-purple to-theme-pink`
- `text-slate-900` → `text-foreground`
- `text-slate-600` → `text-muted-foreground`
- `border-slate-200` → `border-border`
- `text-white` → `text-white` (可保持)
```

#### 📁 pages/BlogDetail.tsx
**当前问题：**
```tsx
- `from-blue-600 to-purple-600` → `from-theme-blue to-theme-purple`
- `text-white` → `text-white` (可保持)
- `text-slate-600` → `text-muted-foreground`
- `bg-red-100` → `bg-destructive/10`
- `text-red-500` → `text-destructive`
- `text-red-600` → `text-destructive`
- `hover:text-blue-600` → `hover:text-theme-blue`
- `bg-blue-100 text-blue-700` → `bg-theme-blue/10 text-theme-blue`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-800` → `text-foreground`
- `border-slate-200` → `border-border`
- `hover:border-blue-300` → `hover:border-theme-blue/30`
- `group-hover:text-blue-600` → `group-hover:text-theme-blue`
```

#### 📁 pages/tools/JsonFormatter.tsx
**当前问题：**
```tsx
- `text-slate-600` → `text-muted-foreground`
- `text-slate-800` → `text-foreground`
- `text-slate-900` → `text-foreground`
- `text-green-600` → `text-success`
- `text-red-600` → `text-destructive`
- `border-green-200 bg-green-50` → `border-success/20 bg-success/5`
- `border-red-200 bg-red-50` → `border-destructive/20 bg-destructive/5`
- `text-green-800` → `text-success`
- `text-red-800` → `text-destructive`
- `text-red-700` → `text-destructive`
- `bg-slate-50 border-slate-200` → `bg-muted border-border`
- `text-slate-400` → `text-muted-foreground`
```

#### 📁 pages/tools/NewImageCropperDemo.tsx
**当前问题：**
```tsx
- `bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50` → `bg-gradient-to-br from-theme-blue/5 via-theme-indigo/5 to-theme-purple/5`
- `text-slate-600` → `text-muted-foreground`
- `text-slate-800` → `text-foreground`
- `from-blue-500 to-indigo-600` → `from-theme-blue to-theme-indigo`
- `text-white` → `text-white` (可保持)
- `bg-gradient-to-r from-blue-600 to-indigo-600` → `bg-gradient-to-r from-theme-blue to-theme-indigo`
- `bg-white/80` → `bg-background/80`
- `border-blue-300` → `border-theme-blue/30`
- `hover:border-blue-400` → `hover:border-theme-blue/40`
- `hover:bg-blue-50/50` → `hover:bg-theme-blue/5`
- `bg-blue-100` → `bg-theme-blue/10`
- `text-blue-600` → `text-theme-blue`
- `text-blue-700` → `text-theme-blue`
- `hover:bg-blue-50` → `hover:bg-theme-blue/5`
- `text-slate-700` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-indigo-600` → `text-theme-indigo`
- `text-purple-600` → `text-theme-purple`
- `bg-blue-500` → `bg-theme-blue`
- `bg-green-500` → `bg-theme-green`
- `bg-purple-500` → `bg-theme-purple`
- `bg-white/90` → `bg-background/90`
- `text-green-600` → `text-theme-green`
- `bg-gray-100` → `bg-muted`
```

### 3. 组件层级

#### 📁 components/common/TOC.tsx
**当前问题：**
```tsx
- `text-slate-400` → `text-muted-foreground`
- `hover:bg-blue-50` → `hover:bg-theme-blue/5`
- `hover:text-blue-700` → `hover:text-theme-blue`
- `text-blue-600` → `text-theme-blue`
- `bg-blue-50` → `bg-theme-blue/5`
- `border-blue-600` → `border-theme-blue`
- `text-slate-600` → `text-foreground`
- `hover:text-slate-800` → `hover:text-foreground`
```

#### 📁 components/common/user/UserAvatar.tsx
**当前问题：**
```tsx
- `from-blue-600 to-purple-600` → `from-theme-blue to-theme-purple`
- `text-white` → `text-white` (可保持)
```

#### 📁 components/common/blog/BlogCard.tsx
**当前问题：**
```tsx
- `bg-green-100 text-green-700` → `bg-success/10 text-success`
- `bg-yellow-100 text-yellow-700` → `bg-warning/10 text-warning`
- `text-slate-500` → `text-muted-foreground`
- `group-hover:text-blue-600` → `group-hover:text-theme-blue`
- `hover:text-blue-600` → `hover:text-theme-blue`
- `text-slate-800` → `text-foreground`
```

### 4. X-UI 组件 (低优先级，大部分已使用CSS变量)

这些组件大部分已经使用了CSS变量系统，但有些还需要调整：

#### 📁 components/x-ui/button.tsx
**需要检查的部分：**
```tsx
- pretty/attractive 变体中的硬编码颜色
- `from-blue-600 to-indigo-600` → `from-theme-blue to-theme-indigo`
- `from-blue-700 to-indigo-700` → `from-theme-blue to-theme-indigo` (hover)
- `text-zinc-50` → 检查是否需要改为 `text-white`
```

#### 📁 components/x-ui/form.tsx
**当前问题：**
```tsx
- `text-red-500 dark:text-red-900` → `text-destructive`
```

## 📋 修改优先级

### 🔴 高优先级 (影响主要页面体验)
1. Layout.tsx
2. WriteBlog.tsx  
3. BlogDetail.tsx
4. BlogCard.tsx

### 🟡 中优先级 (工具页面和设置)
1. UserSettings.tsx
2. Tools.tsx
3. JsonFormatter.tsx
4. NewImageCropperDemo.tsx
5. TOC.tsx
6. UserAvatar.tsx

### 🟢 低优先级 (基础组件，大部分已适配)
1. x-ui组件中的个别硬编码颜色
2. 其他辅助组件

## 🛠️ 修改规则

### 颜色映射规则
```tsx
// 背景色
slate-50 → background
slate-100 → muted
white → background
gray-50 → muted

// 文字色
slate-600 → foreground
slate-500 → muted-foreground  
slate-400 → muted-foreground
slate-800 → foreground
slate-900 → foreground

// 主题色
blue-600 → theme-blue
blue-500 → theme-blue  
blue-100 → theme-blue/10
blue-50 → theme-blue/5

purple-600 → theme-purple
green-600 → theme-green
red-600 → destructive
yellow-600 → warning

// 边框
slate-200 → border
blue-200 → theme-blue/20
green-200 → success/20
red-200 → destructive/20

// 状态色
green-* → success/*
red-* → destructive/*
yellow-* → warning/*
blue-* (状态用) → info/*
```

### 语义化替换
```tsx
// 成功状态
bg-green-* → bg-success
text-green-* → text-success
border-green-* → border-success

// 错误状态  
bg-red-* → bg-destructive
text-red-* → text-destructive
border-red-* → border-destructive

// 警告状态
bg-yellow-* → bg-warning
text-yellow-* → text-warning
border-yellow-* → border-warning

// 信息状态
bg-blue-* (信息用) → bg-info
text-blue-* (信息用) → text-info
border-blue-* (信息用) → border-info

// 主题装饰色
bg-blue-* (装饰用) → bg-theme-blue
text-blue-* (装饰用) → text-theme-blue
border-blue-* (装饰用) → border-theme-blue
```

## ✅ 完成标准

每个组件修改后应该：
1. 在浅色模式下正常显示
2. 在深色模式下正常显示
3. 颜色对比度符合可访问性标准
4. 保持原有的视觉层次和用户体验
5. 使用语义化的颜色类名

## 🧪 测试检查清单

修改完成后，每个组件都需要测试：
- [ ] 浅色模式显示正常
- [ ] 深色模式显示正常  
- [ ] 颜色对比度足够
- [ ] 交互状态(hover, focus)正常
- [ ] 响应式布局不受影响
- [ ] 与其他组件的视觉一致性 