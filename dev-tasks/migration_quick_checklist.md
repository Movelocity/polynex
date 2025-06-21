# 组件迁移快速执行清单

## 🚀 执行顺序（建议按此顺序进行）

### 第一步：移动业务组件（最重要，影响最大）
```bash
# 创建目录（如果还没有）
mkdir src\components\business\user
mkdir src\components\business\blog

# 移动用户相关组件
move src\components\ui\AvatarUpload.tsx src\components\business\user\
move src\components\ui\UserAvatar.tsx src\components\business\user\

# 移动博客组件
move src\components\ui\BlogCard.tsx src\components\business\blog\
```

### 第二步：移动通用组件
```bash
# 移动到 common 目录
move src\components\ui\ImageCropperDialog.tsx src\components\common\
move src\components\ui\PasswordChangeDialog.tsx src\components\common\
move src\components\ui\FileUploadArea.tsx src\components\common\
move src\components\ui\FileList.tsx src\components\common\
move src\components\ui\UserProfileInfo.tsx src\components\common\
move src\components\ui\markdown-preview.tsx src\components\common\MarkdownPreview.tsx
```

### 第三步：移动布局组件
```bash
# 移动到 layout 目录
move src\components\ui\sidebar.tsx src\components\layout\Sidebar.tsx
move src\components\ui\breadcrumb.tsx src\components\layout\Breadcrumb.tsx
move src\components\ui\navigation-menu.tsx src\components\layout\NavigationMenu.tsx
move src\components\ui\menubar.tsx src\components\layout\Menubar.tsx
```

## 🔍 关键文件检查

完成移动后，首先检查这些最重要的文件是否需要更新导入：

### 1. UserSettings.tsx ✅ 
**状态**: 已经更新过，应该不需要改动

### 2. Layout.tsx ⚠️
**检查命令**: `findstr /s /i "sidebar" src\components\Layout.tsx`
**可能需要更新**: Sidebar 导入路径

### 3. 其他可能受影响的文件
```bash
# 检查 UserAvatar 使用
findstr /s /i "UserAvatar" src\pages\*.tsx

# 检查 BlogCard 使用  
findstr /s /i "BlogCard" src\pages\*.tsx

# 检查 MarkdownPreview 使用
findstr /s /i "markdown-preview\|MarkdownPreview" src\pages\*.tsx
```

## 📝 最小化索引文件创建

**优先创建这些索引文件（其他的可以后续补充）：**

### `src\components\business\user\index.ts`
```typescript
export { AvatarUpload } from './AvatarUpload';
export { UserAvatar } from './UserAvatar';
```

### `src\components\common\index.ts`
```typescript
export { ImageCropperDialog } from './ImageCropperDialog';
export { PasswordChangeDialog } from './PasswordChangeDialog';
export { FileUploadArea } from './FileUploadArea';
export { FileList } from './FileList';
export { UserProfileInfo } from './UserProfileInfo';
export { MarkdownPreview } from './MarkdownPreview';
```

## ⚡ 快速验证

完成移动后，立即运行：
```bash
npm run dev
```

如果启动成功，说明主要路径都没问题。如果有错误，通常会在控制台看到具体的导入错误信息。

## 🎯 重点关注

**最容易出错的地方：**
1. `UserSettings.tsx` - 但应该已经更新过了
2. `Layout.tsx` - 如果使用了 Sidebar
3. 任何使用 `UserAvatar` 的地方
4. 任何使用 `BlogCard` 的地方

## 💡 小贴士

1. **一次移动一个组件**：如果某个组件移动后出现错误，容易定位问题
2. **保持终端开着**：随时可以看到编译错误
3. **先移动，后创建索引**：确保基本移动没问题后再优化导入路径
4. **使用相对简单的导入**：开始时使用完整路径，稳定后再使用索引文件

## 🚨 应急回滚

如果某个组件移动后出现问题，可以立即回滚：
```bash
# 示例：如果 AvatarUpload 有问题
move src\components\business\user\AvatarUpload.tsx src\components\ui\
```

## 📊 进度跟踪

**移动完成情况**：
- [ ] AvatarUpload.tsx
- [ ] UserAvatar.tsx  
- [ ] BlogCard.tsx
- [ ] ImageCropperDialog.tsx
- [ ] PasswordChangeDialog.tsx
- [ ] FileUploadArea.tsx
- [ ] FileList.tsx
- [ ] UserProfileInfo.tsx
- [ ] MarkdownPreview.tsx
- [ ] Sidebar.tsx
- [ ] Breadcrumb.tsx
- [ ] NavigationMenu.tsx
- [ ] Menubar.tsx

**索引文件创建**：
- [ ] `src\components\business\user\index.ts`
- [ ] `src\components\business\blog\index.ts`
- [ ] `src\components\common\index.ts`
- [ ] `src\components\layout\index.ts`

**验证完成**：
- [ ] `npm run dev` 运行成功
- [ ] 页面加载正常
- [ ] 所有功能测试通过 