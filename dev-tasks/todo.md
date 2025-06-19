# 任务：博客管理网站开发

## 目标：创建一个功能完整、美观高效的博客管理系统

## 步骤：
[x] 设计和开发完整的博客管理网站系统 → Web Development 步骤
  - 用户认证系统（登录/注册）
  - 博客管理功能（创建、编辑、删除、发布）
  - 博客阅读界面（列表、详情、分页）
  - 博客分类系统
  - 关键词搜索功能
  - 响应式设计，现代化UI
  - localstorage 数据模拟后端

[x] 页面优化任务
  - 增加文章列表页面
  - 首页文章统计可以简化后放到侧边
  - 增加用户设置页面，允许改密码
  - /write 页面编辑预览对markdown的支持不如博客详情页面完善

## 已完成的优化内容：
1. ✅ 文章列表页面 - 创建了独立的文章列表页面，支持搜索、分类筛选、排序（最新/最热）和分页
2. ✅ 首页统计优化 - 将文章统计移到侧边栏，以更简洁的卡片形式展示
3. ✅ 用户设置页面 - 创建了账户设置页面，包含个人信息查看和密码修改功能
4. ✅ Markdown预览优化 - 改进了写作页面的Markdown预览，使用与博客详情页面相同的渲染组件

[x] bug 修复
```
http://localhost:5173/articles
Something went wrong.
A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
Error: A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
    at http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-select.js?v=2d5e35f9:904:13
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-HBJ3AJOL.js?v=2d5e35f9:11596:26)
```
- ✅ 已修复：将分类筛选器的"所有分类"选项的value从空字符串改为"all"
