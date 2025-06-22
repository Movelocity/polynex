# API路由文档

本文档描述了博客平台的所有API接口路由和数据格式。

## 基础配置

- **基础URL**: `http://localhost:8765/api`
- **认证方式**: Bearer Token
- **Content-Type**: `application/json`

## 认证接口

### 用户登录
- **URL**: `POST /auth/login`
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **响应**:
  ```json
  {
    "user": {
      "id": "user_id",
      "username": "用户名",
      "email": "user@example.com",
      "avatar": "头像URL",
      "registerTime": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
  ```

### 用户注册
- **URL**: `POST /auth/register`
- **请求体**:
  ```json
  {
    "username": "新用户",
    "email": "newuser@example.com",
    "password": "password123",
    "avatar": "头像URL（可选）"
  }
  ```
- **响应**:
  ```json
  {
    "user": {
      "id": "new_user_id",
      "username": "新用户",
      "email": "newuser@example.com",
      "avatar": "头像URL",
      "registerTime": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
  ```

### 用户登出
- **URL**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `200 OK`

### 验证JWT token
- **URL**: `GET /auth/validate`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `200 OK` 或 `401 Unauthorized`

### 更新密码
- **URL**: `PUT /auth/password`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**:
  ```json
  {
    "oldPassword": "旧密码",
    "newPassword": "新密码"
  }
  ```
- **响应**: `200 OK` 或 `400 Bad Request`

## 用户接口

### 获取所有用户
- **URL**: `GET /users`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `User[]`

### 获取当前用户
- **URL**: `GET /users/current`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `User`

### 根据邮箱查找用户
- **URL**: `GET /users/by-email/:email`
- **参数**: `email` - 用户邮箱
- **响应**: `User` 或 `404 Not Found`

### 根据用户名查找用户
- **URL**: `GET /users/by-username/:username`
- **参数**: `username` - 用户名
- **响应**: `User` 或 `404 Not Found`

### 创建用户
- **URL**: `POST /users`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `User`
- **响应**: `201 Created`

### 更新用户
- **URL**: `PUT /users/:id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `id` - 用户ID
- **请求体**: `Partial<User>`
- **响应**: `200 OK` 或 `404 Not Found`

### 批量保存用户
- **URL**: `POST /users/batch`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**:
  ```json
  {
    "users": [User, User, ...]
  }
  ```
- **响应**: `200 OK`

### 上传用户头像
- **URL**: `POST /users/avatar/upload`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `FormData`
- **响应**: `200 OK`

## 博客接口

### 获取所有博客
- **URL**: `GET /blogs`
- **响应**: `Blog[]`

### 获取已发布博客
- **URL**: `GET /blogs/published`
- **响应**: `Blog[]`

### 根据ID获取博客
- **URL**: `GET /blogs/:id`
- **参数**: `id` - 博客ID
- **响应**: `Blog` 或 `404 Not Found`

### 根据作者获取博客
- **URL**: `GET /blogs/author/:authorId`
- **参数**: `authorId` - 作者ID
- **响应**: `Blog[]`

### 根据分类获取博客
- **URL**: `GET /blogs/category/:category`
- **参数**: `category` - 分类名称
- **响应**: `Blog[]`

### 搜索博客
- **URL**: `GET /blogs/search`
- **查询参数**: `q` - 搜索关键词
- **响应**: `Blog[]`

### 创建博客
- **URL**: `POST /blogs`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `Blog`
- **响应**: `201 Created`

### 更新博客
- **URL**: `PUT /blogs/:id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `id` - 博客ID
- **请求体**: `Partial<Blog>`
- **响应**: `200 OK` 或 `404 Not Found`

### 删除博客
- **URL**: `DELETE /blogs/:id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `id` - 博客ID
- **响应**: `200 OK` 或 `404 Not Found`

### 增加博客浏览量
- **URL**: `POST /blogs/:id/views`
- **参数**: `id` - 博客ID
- **响应**: `200 OK`

### 批量保存博客
- **URL**: `POST /blogs/batch`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**:
  ```json
  {
    "blogs": [Blog, Blog, ...]
  }
  ```
- **响应**: `200 OK`

## 分类接口

### 获取所有分类
- **URL**: `GET /categories`
- **响应**: `Category[]`

### 根据名称获取分类
- **URL**: `GET /categories/:name`
- **参数**: `name` - 分类名称
- **响应**: `Category` 或 `404 Not Found`

### 创建分类
- **URL**: `POST /categories`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `Category`
- **响应**: `201 Created`

### 更新分类
- **URL**: `PUT /categories/:id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `id` - 分类ID
- **请求体**: `Partial<Category>`
- **响应**: `200 OK` 或 `404 Not Found`

### 删除分类
- **URL**: `DELETE /categories/:id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `id` - 分类ID
- **响应**: `200 OK` 或 `404 Not Found`

### 更新分类计数
- **URL**: `PUT /categories/counts`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `200 OK`

### 批量保存分类
- **URL**: `POST /categories/batch`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**:
  ```json
  {
    "categories": [Category, Category, ...]
  }
  ```
- **响应**: `200 OK`

## 数据模型

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  registerTime: string;
}
```

### Blog
```typescript
interface Blog {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createTime: string;
  updateTime: string;
  status: 'published' | 'draft';
  views: number;
}
```

### Category
```typescript
interface Category {
  id: string;
  name: string;
  description: string;
  count: number;
}
```

## 错误处理

API使用标准的HTTP状态码：

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未授权
- `403 Forbidden` - 禁止访问
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器错误

错误响应格式：
```json
{
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": "详细错误信息（可选）"
}
```

## 网站配置管理接口（管理员权限）

### 获取所有网站配置
- **URL**: `GET /admin/site-config`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `SiteConfig[]`

### 根据键获取网站配置
- **URL**: `GET /admin/site-config/:key`
- **参数**: `key` - 配置键
- **响应**: `SiteConfig` 或 `404 Not Found`

### 更新网站配置
- **URL**: `PUT /admin/site-config/:key`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `key` - 配置键
- **请求体**: `SiteConfig`
- **响应**: `200 OK` 或 `404 Not Found`

### 创建网站配置
- **URL**: `POST /admin/site-config`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `SiteConfig`
- **响应**: `201 Created`

### 删除网站配置
- **URL**: `DELETE /admin/site-config/:key`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `key` - 配置键
- **响应**: `200 OK` 或 `404 Not Found`

## 管理员用户管理接口（管理员权限）

### 获取所有用户列表
- **URL**: `GET /admin/users`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `List[UserResponse]`

### 获取用户统计数据
- **URL**: `GET /admin/users/stats`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `UserStatsResponse`
  ```json
  {
    "total": 25,
    "admins": 2,
    "users": 23
  }
  ```

### 更新用户角色
- **URL**: `PUT /admin/users/:user_id/role`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `user_id` - 用户ID
- **请求体**: `UserRoleUpdate`
  ```json
  {
    "role": "admin" | "user"
  }
  ```
- **限制**: 管理员不能修改自己的角色

### 更新用户信息
- **URL**: `PUT /admin/users/:user_id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `user_id` - 用户ID
- **请求体**: `AdminUserUpdate`
  ```json
  {
    "username": "新用户名",
    "email": "new@example.com",
    "role": "admin" | "user"
  }
  ```
- **限制**: 管理员不能修改自己的角色

### 删除用户
- **URL**: `DELETE /admin/users/:user_id`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `user_id` - 用户ID
- **响应**: `200 OK` 或 `404 Not Found`

### 重置用户密码
- **URL**: `PUT /admin/users/:user_id/password`
- **Headers**: `Authorization: Bearer <token>`
- **参数**: `user_id` - 用户ID
- **请求体**: `AdminPasswordReset`
  ```json
  {
    "newPassword": "新密码"
  }
  ```

## 权限控制

### 管理员权限检查
所有管理员接口都使用 `require_admin_permission` 依赖进行权限验证：
- 验证用户是否已登录
- 验证用户角色是否为 `admin`
- 返回403错误如果权限不足

### 自我保护机制
- 管理员不能删除自己的账户
- 管理员不能修改自己的角色
- 系统不允许删除最后一个管理员账户

## 开发者接口

### 生成示例数据
- **URL**: `POST /dev/generate-sample-data`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `{}`
- **响应**: `200 OK`

## 文件存储接口

### 上传文件
- **URL**: `POST /resources/upload`
- **Headers**: `Authorization: Bearer <token>`
- **请求体**: `FormData`
- **响应**: `200 OK`

### 获取文件
- **URL**: `GET /resources/:unique_id.:postfix`
- **参数**: `unique_id` - 唯一标识符, `postfix` - 文件后缀
- **响应**: 文件内容

### 获取用户文件列表
- **URL**: `GET /resources/list`
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `List[Resource]`

### 删除文件
- **URL**: `DELETE /resources/:unique_id.:postfix`
- **参数**: `unique_id` - 唯一标识符, `postfix` - 文件后缀
- **Headers**: `Authorization: Bearer <token>`
- **响应**: `200 OK` 或 `404 Not Found`

## 新增管理员接口详细说明

### 获取所有用户列表
- **端点**: `GET /admin/users`
- **权限**: 管理员
- **响应**: 返回所有用户的详细信息列表
- **响应模型**: `List[UserResponse]`

### 获取用户统计数据
- **端点**: `GET /admin/users/stats`
- **权限**: 管理员
- **响应**: 用户统计信息
- **响应模型**: `UserStatsResponse`
  ```json
  {
    "total": 25,
    "admins": 2,
    "users": 23
  }
  ```

### 更新用户角色
- **端点**: `PUT /admin/users/:user_id/role`
- **权限**: 管理员
- **请求体**: `UserRoleUpdate`
  ```json
  {
    "role": "admin" | "user"
  }
  ```
- **限制**: 管理员不能修改自己的角色

### 更新用户信息
- **端点**: `PUT /admin/users/:user_id`
- **权限**: 管理员
- **请求体**: `AdminUserUpdate`
  ```json
  {
    "username": "新用户名",
    "email": "new@example.com",
    "role": "admin" | "user"
  }
  ```
- **限制**: 管理员不能修改自己的角色

### 删除用户
- **端点**: `DELETE /admin/users/:user_id`
- **权限**: 管理员
- **限制**: 
  - 不能删除自己的账户
  - 不能删除最后一个管理员
  - 删除用户时会同时删除其相关博客

### 重置用户密码
- **端点**: `PUT /admin/users/:user_id/password`
- **权限**: 管理员
- **请求体**: `AdminPasswordReset`
  ```json
  {
    "newPassword": "新密码"
  }
  ```

## 权限控制

### 管理员权限检查
所有管理员接口都使用 `require_admin_permission` 依赖进行权限验证：
- 验证用户是否已登录
- 验证用户角色是否为 `admin`
- 返回403错误如果权限不足

### 自我保护机制
- 管理员不能删除自己的账户
- 管理员不能修改自己的角色
- 系统不允许删除最后一个管理员账户 