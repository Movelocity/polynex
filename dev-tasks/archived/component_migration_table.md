# 组件迁移对照表

## 移动命令对照表

### 第一批：业务组件迁移

| 组件名称 | 当前位置 | 目标位置 | 分类说明 | Windows移动命令 |
|---------|---------|---------|----------|----------------|
| `AvatarUpload.tsx` | `src\components\ui\` | `src\components\business\user\` | 用户头像上传业务组件 | `move src\components\ui\AvatarUpload.tsx src\components\business\user\` |
| `UserAvatar.tsx` | `src\components\ui\` | `src\components\business\user\` | 用户头像展示业务组件 | `move src\components\ui\UserAvatar.tsx src\components\business\user\` |
| `BlogCard.tsx` | `src\components\ui\` | `src\components\business\blog\` | 博客卡片业务组件 | `move src\components\ui\BlogCard.tsx src\components\business\blog\` |

### 第二批：通用复合组件迁移

| 组件名称 | 当前位置 | 目标位置 | 分类说明 | Windows移动命令 |
|---------|---------|---------|----------|----------------|
| `ImageCropperDialog.tsx` | `src\components\ui\` | `src\components\common\` | 图片裁剪通用组件 | `move src\components\ui\ImageCropperDialog.tsx src\components\common\` |
| `PasswordChangeDialog.tsx` | `src\components\ui\` | `src\components\common\` | 密码修改通用组件 | `move src\components\ui\PasswordChangeDialog.tsx src\components\common\` |
| `FileUploadArea.tsx` | `src\components\ui\` | `src\components\common\` | 文件上传通用组件 | `move src\components\ui\FileUploadArea.tsx src\components\common\` |
| `FileList.tsx` | `src\components\ui\` | `src\components\common\` | 文件列表通用组件 | `move src\components\ui\FileList.tsx src\components\common\` |
| `UserProfileInfo.tsx` | `src\components\ui\` | `src\components\common\` | 用户信息展示通用组件 | `move src\components\ui\UserProfileInfo.tsx src\components\common\` |
| `markdown-preview.tsx` | `src\components\ui\` | `src\components\common\` | Markdown预览通用组件 | `move src\components\ui\markdown-preview.tsx src\components\common\MarkdownPreview.tsx` |

### 第三批：布局组件迁移

| 组件名称 | 当前位置 | 目标位置 | 分类说明 | Windows移动命令 |
|---------|---------|---------|----------|----------------|
| `sidebar.tsx` | `src\components\ui\` | `src\components\layout\` | 侧边栏布局组件 | `move src\components\ui\sidebar.tsx src\components\layout\Sidebar.tsx` |
| `breadcrumb.tsx` | `src\components\ui\` | `src\components\layout\` | 面包屑布局组件 | `move src\components\ui\breadcrumb.tsx src\components\layout\Breadcrumb.tsx` |
| `navigation-menu.tsx` | `src\components\ui\` | `src\components\layout\` | 导航菜单布局组件 | `move src\components\ui\navigation-menu.tsx src\components\layout\NavigationMenu.tsx` |
| `menubar.tsx` | `src\components\ui\` | `src\components\layout\` | 菜单栏布局组件 | `move src\components\ui\menubar.tsx src\components\layout\Menubar.tsx` |

## 需要更新导入路径的文件

### 主要文件清单

| 文件路径 | 需要更新的导入 |
|---------|---------------|
| `src\pages\UserSettings.tsx` | ✅ 已更新 |
| `src\components\Layout.tsx` | 可能需要更新 Sidebar 导入 |
| `src\pages\WriteBlog.tsx` | 可能需要更新 MarkdownPreview 导入 |
| `src\pages\Dashboard.tsx` | 可能需要更新相关组件导入 |
| `src\pages\Home.tsx` | 可能需要更新 BlogCard 导入 |

## 创建索引文件

### 1. 创建 `src\components\business\user\index.ts`
```typescript
export { AvatarUpload } from './AvatarUpload';
export { UserAvatar } from './UserAvatar';
```

### 2. 创建 `src\components\business\blog\index.ts`
```typescript
export { BlogCard } from './BlogCard';
```

### 3. 创建 `src\components\business\index.ts`
```typescript
export * from './user';
export * from './blog';
export * from './file';
```

### 4. 创建 `src\components\common\index.ts`
```typescript
export { ImageCropperDialog } from './ImageCropperDialog';
export { PasswordChangeDialog } from './PasswordChangeDialog';
export { FileUploadArea } from './FileUploadArea';
export { FileList } from './FileList';
export { UserProfileInfo } from './UserProfileInfo';
export { MarkdownPreview } from './MarkdownPreview';
```

### 5. 创建 `src\components\layout\index.ts`
```typescript
export { Sidebar } from './Sidebar';
export { Breadcrumb } from './Breadcrumb';
export { NavigationMenu } from './NavigationMenu';
export { Menubar } from './Menubar';
```

## 执行步骤

### 步骤1：执行移动命令
按照上表中的Windows移动命令，逐个执行文件移动

### 步骤2：创建索引文件
根据上面的内容创建各个 `index.ts` 文件

### 步骤3：查找并更新导入路径
执行以下搜索命令找到需要更新的文件：
```bash
# 搜索 AvatarUpload 的使用
findstr /s /i "AvatarUpload" src\*.tsx

# 搜索 UserAvatar 的使用
findstr /s /i "UserAvatar" src\*.tsx

# 搜索 BlogCard 的使用
findstr /s /i "BlogCard" src\*.tsx

# 搜索 ImageCropperDialog 的使用
findstr /s /i "ImageCropperDialog" src\*.tsx

# 搜索 PasswordChangeDialog 的使用
findstr /s /i "PasswordChangeDialog" src\*.tsx

# 搜索 FileUploadArea 的使用
findstr /s /i "FileUploadArea" src\*.tsx

# 搜索 FileList 的使用
findstr /s /i "FileList" src\*.tsx

# 搜索 UserProfileInfo 的使用
findstr /s /i "UserProfileInfo" src\*.tsx

# 搜索 sidebar 的使用
findstr /s /i "sidebar" src\*.tsx
```

## 导入路径更新示例

### UserSettings.tsx (已更新)
```typescript
// 旧导入
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { FileUploadArea } from '@/components/ui/FileUploadArea';

// 新导入
import { AvatarUpload } from '@/components/business/user/AvatarUpload';
import { FileUploadArea } from '@/components/common/FileUploadArea';

// 或者使用索引文件
import { AvatarUpload } from '@/components/business/user';
import { FileUploadArea } from '@/components/common';
```

### Layout.tsx (需要更新)
```typescript
// 旧导入
import { Sidebar } from '@/components/ui/sidebar';

// 新导入
import { Sidebar } from '@/components/layout/Sidebar';
// 或者
import { Sidebar } from '@/components/layout';
```

## 验证清单

完成迁移后，请验证：

- [ ] 所有组件文件都已移动到正确位置
- [ ] 创建了所有必要的 `index.ts` 文件
- [ ] 更新了所有导入路径
- [ ] 项目能够正常编译 (`npm run build`)
- [ ] 项目能够正常运行 (`npm run dev`)
- [ ] 所有功能都能正常工作

## 回滚计划

如果遇到问题，可以按相反顺序执行移动命令来回滚：
```bash
# 示例回滚命令
move src\components\business\user\AvatarUpload.tsx src\components\ui\
move src\components\business\user\UserAvatar.tsx src\components\ui\
# ... 其他组件
``` 