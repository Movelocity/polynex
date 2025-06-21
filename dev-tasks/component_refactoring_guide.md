# 组件目录结构重构指南

## 当前问题
现在的 `src/components/ui/` 目录混合了基础原子组件和复杂业务组件，导致：
- 难以找到特定组件
- 职责不清晰
- 不利于团队协作
- 影响组件复用

## 新的目录结构

### 1. `src/components/ui/` - 基础原子组件
保留最基础的UI元素，这些组件：
- 无业务逻辑
- 高度可复用
- 通常是对第三方UI库的封装

**应保留的组件：**
```
ui/
├── button.tsx           # 按钮
├── input.tsx            # 输入框
├── label.tsx            # 标签
├── textarea.tsx         # 文本域
├── checkbox.tsx         # 复选框
├── radio-group.tsx      # 单选组
├── switch.tsx           # 开关
├── slider.tsx           # 滑块
├── badge.tsx            # 徽章
├── avatar.tsx           # 头像容器
├── skeleton.tsx         # 骨架屏
├── separator.tsx        # 分隔符
├── progress.tsx         # 进度条
├── alert.tsx            # 警告框
├── card.tsx             # 卡片
├── dialog.tsx           # 对话框
├── popover.tsx          # 弹窗
├── tooltip.tsx          # 提示框
├── sheet.tsx            # 抽屉
├── tabs.tsx             # 标签页
├── accordion.tsx        # 折叠面板
├── select.tsx           # 选择器
├── table.tsx            # 表格
└── form.tsx             # 表单
```

### 2. `src/components/common/` - 通用复合组件
由基础组件组合而成的通用组件：
- 可在多个页面复用
- 包含一定的交互逻辑
- 与具体业务解耦

**应迁移的组件：**
```
common/
├── ImageCropperDialog.tsx    # 图片裁剪对话框
├── MarkdownPreview.tsx       # Markdown预览
├── PasswordChangeDialog.tsx  # 密码修改对话框
├── FileUploadArea.tsx        # 文件上传区域
├── FileList.tsx              # 文件列表
├── UserProfileInfo.tsx       # 用户信息展示
└── DateRangePicker.tsx       # 日期范围选择器
```

### 3. `src/components/business/` - 业务特定组件
与具体业务场景紧密相关的组件：
- 包含业务逻辑
- 特定于某个功能模块
- 可能调用API

**应迁移的组件：**
```
business/
├── blog/
│   ├── BlogCard.tsx          # 博客卡片
│   ├── BlogEditor.tsx        # 博客编辑器
│   └── BlogList.tsx          # 博客列表
├── user/
│   ├── AvatarUpload.tsx      # 头像上传
│   ├── UserAvatar.tsx        # 用户头像
│   └── UserCard.tsx          # 用户卡片
└── file/
    ├── FileManager.tsx       # 文件管理器
    └── ImagePreview.tsx      # 图片预览
```

### 4. `src/components/layout/` - 布局组件
页面级别的布局组件：
- 控制页面整体结构
- 导航和页面框架
- 响应式布局

**应迁移的组件：**
```
layout/
├── Sidebar.tsx              # 侧边栏
├── Navigation.tsx           # 导航组件
├── Header.tsx               # 页头
├── Footer.tsx               # 页脚
├── Breadcrumb.tsx           # 面包屑
├── PageLayout.tsx           # 页面布局
└── DashboardLayout.tsx      # 仪表板布局
```

## 迁移步骤

### 第一阶段：创建新目录结构
```bash
mkdir src/components/common
mkdir src/components/business
mkdir src/components/layout
```

### 第二阶段：移动业务组件
1. 移动业务特定组件到 `business/` 目录
2. 按功能模块分组（blog, user, file等）
3. 更新导入路径

### 第三阶段：移动通用组件
1. 移动可复用的复合组件到 `common/` 目录
2. 更新导入路径

### 第四阶段：移动布局组件
1. 移动布局相关组件到 `layout/` 目录
2. 更新导入路径

### 第五阶段：清理和优化
1. 检查所有导入路径
2. 更新 index.ts 文件
3. 更新文档

## 导入路径示例

### 重构前
```typescript
import { Button } from '@/components/ui/button';
import { BlogCard } from '@/components/ui/BlogCard';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
```

### 重构后
```typescript
import { Button } from '@/components/ui/button';
import { BlogCard } from '@/components/business/blog/BlogCard';
import { AvatarUpload } from '@/components/business/user/AvatarUpload';
```

## 组件索引文件

为了便于导入，在每个目录下创建 `index.ts` 文件：

### `src/components/common/index.ts`
```typescript
export { ImageCropperDialog } from './ImageCropperDialog';
export { MarkdownPreview } from './MarkdownPreview';
export { PasswordChangeDialog } from './PasswordChangeDialog';
export { FileUploadArea } from './FileUploadArea';
export { FileList } from './FileList';
export { UserProfileInfo } from './UserProfileInfo';
```

### `src/components/business/index.ts`
```typescript
export * from './blog';
export * from './user';
export * from './file';
```

### `src/components/business/user/index.ts`
```typescript
export { AvatarUpload } from './AvatarUpload';
export { UserAvatar } from './UserAvatar';
export { UserCard } from './UserCard';
```

## 优化建议

### 1. 类型定义
将组件相关的类型定义统一管理：
```
src/types/
├── components/
│   ├── ui.ts
│   ├── business.ts
│   └── layout.ts
```

### 2. 样式管理
考虑将组件样式按类别分组：
```
src/styles/
├── components/
│   ├── ui.css
│   ├── business.css
│   └── layout.css
```

### 3. 文档
为每个组件类别创建 README 文档：
- 使用指南
- 组件清单
- 最佳实践

## 实施建议

1. **渐进式迁移**：不要一次性迁移所有组件，按模块逐步进行
2. **保持向后兼容**：在迁移期间保留旧的导入路径
3. **团队沟通**：确保团队成员了解新的目录结构
4. **工具支持**：配置IDE来支持新的导入路径自动补全

## 预期收益

1. **更清晰的组件分层**：易于理解和维护
2. **提高开发效率**：快速找到所需组件
3. **更好的复用性**：明确组件的使用场景
4. **便于团队协作**：统一的组织方式
5. **利于扩展**：新组件有明确的归属

## 迁移检查清单

- [ ] 创建新目录结构
- [ ] 移动业务组件到 business/ 目录
- [ ] 移动通用组件到 common/ 目录  
- [ ] 移动布局组件到 layout/ 目录
- [ ] 更新所有导入路径
- [ ] 创建组件索引文件
- [ ] 更新 TypeScript 配置
- [ ] 测试所有组件是否正常工作
- [ ] 更新项目文档
- [ ] 团队培训和沟通 