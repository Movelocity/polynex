# 对话搜索弹窗使用说明

## 📖 功能概述

对话搜索弹窗组件(`ConversationSearchDialog`)已成功集成到对话历史侧边栏中，为用户提供快速搜索历史对话的功能。

## 🚀 使用方法

### 1. 打开搜索弹窗

**方式一：点击搜索按钮**
- 在对话历史侧边栏的头部，点击🔍搜索图标按钮

**方式二：快捷键**
- 按下 `Ctrl + F` 快速打开搜索弹窗

### 2. 搜索对话

1. 在搜索框中输入关键词
2. 支持搜索对话标题和消息内容
3. 自动防抖搜索（500ms延迟）
4. 实时显示搜索结果

### 3. 查看搜索结果

- **搜索统计**: 显示找到的匹配对话数量
- **结果列表**: 显示匹配的对话，包括：
  - 对话标题（高亮显示匹配关键词）
  - 上下文预览（显示匹配位置的前后文）
  - 匹配次数标记
  - 更新时间
  - 会话ID

### 4. 操作功能

- **选择对话**: 点击任意搜索结果直接跳转到该对话
- **加载更多**: 当结果较多时，可点击"加载更多"按钮
- **清空搜索**: 点击输入框右侧的❌按钮
- **关闭弹窗**: 点击对话框外部或按ESC键

## ✨ 主要特性

### 🎯 智能搜索
- 同时搜索对话标题和消息内容
- 大小写不敏感
- 完全支持中文搜索

### 🎨 用户体验
- **防抖搜索**: 避免频繁API调用
- **高亮显示**: 搜索关键词在结果中高亮显示
- **上下文预览**: 显示匹配位置的周围文本
- **加载状态**: 显示搜索进度和加载动画
- **错误处理**: 完善的错误提示

### 📱 交互设计
- **快捷键支持**: Ctrl+F快速打开
- **自动聚焦**: 打开时自动聚焦到搜索框
- **分页加载**: 支持无限滚动加载更多结果
- **清空功能**: 一键清空搜索内容

## 🎛️ 组件Props

### ConversationSearchDialog

```typescript
interface ConversationSearchDialogProps {
  open: boolean;                                    // 弹窗开关状态
  onOpenChange: (open: boolean) => void;           // 状态变化回调
  onConversationSelect?: (conversationId: string) => void; // 对话选择回调
}
```

## 🔧 技术实现

### 使用的Hook
- `useConversationSearch`: 核心搜索逻辑
- `useState`: 本地状态管理
- `useEffect`: 副作用处理（防抖、快捷键）

### 主要组件
- `Dialog`: shadcn/ui对话框组件
- `Input`: 搜索输入框
- `ScrollArea`: 滚动区域
- `Badge`: 匹配次数标记

### 样式特点
- 响应式设计，最大宽度2xl
- 最大高度80vh，避免超出视窗
- 灵活布局，头部固定，内容区域可滚动

## 📋 使用示例

```typescript
import { ConversationSearchDialog } from '@/components/chat/ConversationSearchDialog';

function MyComponent() {
  const [searchOpen, setSearchOpen] = useState(false);

  const handleConversationSelect = (conversationId: string) => {
    // 处理对话选择
    console.log('Selected conversation:', conversationId);
  };

  return (
    <>
      <button onClick={() => setSearchOpen(true)}>
        搜索对话
      </button>
      
      <ConversationSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onConversationSelect={handleConversationSelect}
      />
    </>
  );
}
```

## 🛠️ 维护说明

### 依赖项
- 确保已安装并配置shadcn/ui组件库
- 需要`useConversationSearch` Hook
- 需要正确的类型定义

### 样式依赖
- line-clamp CSS类（用于文本截断）
- shadcn/ui主题变量
- Tailwind CSS工具类

### API依赖
- 后端搜索API: `GET /api/conversations/search/conversations`
- 需要用户认证Token

## 🚧 后续优化建议

1. **搜索历史**: 保存用户的搜索记录
2. **高级筛选**: 添加时间范围、Agent类型等筛选
3. **搜索建议**: 基于历史搜索提供自动补全
4. **导出功能**: 支持导出搜索结果
5. **性能优化**: 虚拟滚动处理大量结果

## 🎉 总结

对话搜索弹窗已完全集成到系统中，提供了完整的搜索体验：

- ✅ 快速搜索历史对话
- ✅ 智能关键词匹配和高亮
- ✅ 友好的用户交互体验
- ✅ 完善的错误处理机制
- ✅ 快捷键和无障碍支持

用户现在可以方便地在大量对话历史中快速找到所需的内容！🎯 