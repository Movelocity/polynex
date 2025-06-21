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