# Bug修复总结

## 修复时间
2025年1月

## Bug描述
在访问文章列表页面 (`/articles`) 时，页面崩溃并显示错误：
```
A <Select.Item /> must have a value prop that is not an empty string. 
This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
```

## 问题原因
在 `src/pages/ArticleList.tsx` 中，分类筛选器的"所有分类"选项使用了空字符串作为value：
```jsx
<SelectItem value="">所有分类</SelectItem>
```

根据 Radix UI Select 组件的规则，`SelectItem` 的 value 属性不能是空字符串，因为空字符串被保留用于清除选择并显示占位符。

## 解决方案
1. 将"所有分类"选项的 value 从空字符串改为 "all"
2. 更新相关的状态初始值和筛选逻辑

### 具体修改：
1. 修改状态初始值：
   ```jsx
   // 之前
   const [selectedCategory, setSelectedCategory] = useState<string>('');
   // 之后
   const [selectedCategory, setSelectedCategory] = useState<string>('all');
   ```

2. 更新筛选逻辑：
   ```jsx
   // 之前
   const matchesCategory = !selectedCategory || blog.category === selectedCategory;
   // 之后
   const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
   ```

3. 修改SelectItem的value：
   ```jsx
   // 之前
   <SelectItem value="">所有分类</SelectItem>
   // 之后
   <SelectItem value="all">所有分类</SelectItem>
   ```

## 测试验证
修复后，文章列表页面可以正常访问，分类筛选功能正常工作：
- 默认显示所有分类的文章
- 可以选择特定分类进行筛选
- 可以切换回"所有分类"查看全部文章

## 经验教训
使用第三方UI组件库时，需要仔细了解其API限制和规则，避免使用保留值或特殊值导致意外错误。 