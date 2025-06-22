# 页面标题管理指南

## 概述

本项目已实现了动态页面标题管理功能，每个页面可以在加载时自动设置对应的网页标题。

## 使用方法

### 1. 导入Hook

```typescript
import { useTitle } from '@/hooks/usePageTitle';
```

### 2. 在组件中使用

#### 基本用法（固定标题）
```typescript
export function MyPage() {
  // 设置固定标题
  useTitle('我的页面');
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

#### 动态标题（根据状态变化）
```typescript
export function BlogDetail() {
  const [blog, setBlog] = useState<Blog | null>(null);
  
  // 根据文章数据动态设置标题
  useTitle(blog ? blog.title : '文章详情');
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

#### 条件标题（根据不同条件设置不同标题）
```typescript
export function WriteBlog() {
  const [isEdit, setIsEdit] = useState(false);
  
  // 根据编辑状态设置不同标题
  useTitle(isEdit ? '编辑文章' : '写文章');
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

#### 搜索页面标题（包含搜索关键词）
```typescript
export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // 根据搜索状态设置标题
  useTitle(
    searchQuery ? `搜索"${searchQuery}"` : '搜索文章'
  );
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

## 已实现的页面

以下页面已经实现了动态标题设置：

| 页面 | 标题 | 类型 |
|------|------|------|
| 首页 | "首页 - 博客平台" | 固定 |
| 登录 | "登录 - 博客平台" | 固定 |
| 注册 | "注册 - 博客平台" | 固定 |
| 管理中心 | "管理中心 - 博客平台" | 固定 |
| 写文章 | "写文章 - 博客平台" / "编辑文章 - 博客平台" | 条件 |
| 文章详情 | "{文章标题} - 博客平台" | 动态 |
| 搜索 | "搜索文章 - 博客平台" / "搜索"{关键词}" - 博客平台" | 动态 |

## Hook API

### useTitle(title: string)
简化版本，只需要传入页面标题。

**参数：**
- `title` (string): 页面标题

**示例：**
```typescript
useTitle('我的页面'); // 结果: "我的页面 - 博客平台"
```

### usePageTitle(title: string, baseTitle?: string)
完整版本，可以自定义基础标题。

**参数：**
- `title` (string): 页面标题
- `baseTitle` (string, 可选): 基础标题，默认为 "博客平台"

**示例：**
```typescript
usePageTitle('我的页面', '我的网站'); // 结果: "我的页面 - 我的网站"
```

## 最佳实践

### 1. 标题命名
- 使用简洁明了的标题
- 避免过长的标题（建议不超过60个字符）
- 使用中文描述，符合用户习惯

### 2. 动态标题
- 确保在数据加载完成后及时更新标题
- 为加载状态提供合适的默认标题
- 处理数据不存在的情况

### 3. SEO优化
- 每个页面都应该有独特的标题
- 标题应该准确描述页面内容
- 考虑在标题中包含关键词

## 扩展功能

如果需要更高级的功能，可以考虑：

1. **元数据管理**：扩展hook以支持description、keywords等
2. **国际化**：支持多语言标题
3. **标题模板**：为不同类型的页面定义标题模板
4. **面包屑集成**：将标题与面包屑导航结合

## 注意事项

1. **性能**：Hook使用useEffect，会在组件挂载和标题变化时更新DOM
2. **清理**：组件卸载时可以选择重置标题（目前已注释）
3. **SSR**：如果将来需要服务端渲染，需要考虑document对象的存在性 