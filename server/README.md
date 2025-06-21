# 博客平台后端服务

一个基于 FastAPI 和 pandas DataFrame 的简单博客平台后端服务，用于协助前端开发。

## 功能特性

- 🚀 **FastAPI** - 现代、快速的 Python Web 框架
- 📊 **pandas DataFrame** - 简单的数据存储方案
- 🔐 **JWT 认证** - 安全的用户认证系统
- 📝 **完整的 CRUD** - 用户、博客、分类的增删改查
- 🔍 **搜索功能** - 博客内容搜索
- 📖 **自动文档** - Swagger UI 和 ReDoc
- 🌐 **CORS 支持** - 跨域请求支持

## 快速开始

### 1. 安装依赖

```bash
cd server
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python start.py
```

或者直接运行：

```bash
python main.py
```

### 3. 访问服务

- **API 基础地址**: http://localhost:8765/api
- **API 文档**: http://localhost:8765/docs
- **交互式文档**: http://localhost:8765/redoc

## API 接口

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/validate` - 验证JWT token
- `PUT /api/auth/password` - 更新密码

### 用户接口

- `GET /api/users` - 获取所有用户
- `GET /api/users/current` - 获取当前用户
- `GET /api/users/by-email/{email}` - 根据邮箱查找用户
- `GET /api/users/by-username/{username}` - 根据用户名查找用户
- `POST /api/users` - 创建用户
- `PUT /api/users/{id}` - 更新用户
- `POST /api/users/batch` - 批量保存用户

### 博客接口

- `GET /api/blogs` - 获取所有博客
- `GET /api/blogs/published` - 获取已发布博客
- `GET /api/blogs/{id}` - 根据ID获取博客
- `GET /api/blogs/author/{authorId}` - 根据作者获取博客
- `GET /api/blogs/category/{category}` - 根据分类获取博客
- `GET /api/blogs/search?q={query}` - 搜索博客
- `POST /api/blogs` - 创建博客
- `PUT /api/blogs/{id}` - 更新博客
- `DELETE /api/blogs/{id}` - 删除博客
- `POST /api/blogs/{id}/views` - 增加博客浏览量
- `POST /api/blogs/batch` - 批量保存博客

### 分类接口

- `GET /api/categories` - 获取所有分类
- `GET /api/categories/{name}` - 根据名称获取分类
- `POST /api/categories` - 创建分类
- `PUT /api/categories/{id}` - 更新分类
- `DELETE /api/categories/{id}` - 删除分类
- `PUT /api/categories/counts` - 更新分类计数
- `POST /api/categories/batch` - 批量保存分类

### 文件存储接口 🆕

#### 文件上传
```
POST /api/resources/upload
```
- 需要认证
- 支持的文件类型：
  - 图片：`.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
  - 文档：`.pdf`, `.doc`, `.docx`, `.txt`, `.md`, `.rtf`
- 最大文件大小：50MB
- 返回文件的唯一ID和URL

**请求示例（curl）：**
```bash
curl -X POST "http://localhost:8765/api/resources/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

**响应示例：**
```json
{
  "message": "文件上传成功",
  "file": {
    "unique_id": "123e4567-e89b-12d3-a456-426614174000",
    "original_name": "avatar.jpg",
    "extension": ".jpg",
    "size": 102400,
    "upload_time": "2024-01-01T12:00:00",
    "uploader_id": "user123",
    "url": "/api/resources/123e4567-e89b-12d3-a456-426614174000.jpg"
  }
}
```

#### 文件获取
```
GET /api/resources/{unique_id}.{postfix}
```
- 无需认证
- 直接返回文件内容
- 支持浏览器直接访问和下载

**访问示例：**
```
http://localhost:8765/api/resources/123e4567-e89b-12d3-a456-426614174000.jpg
```

#### 文件列表
```
GET /api/resources/list
```
- 需要认证  
- 返回当前用户上传的所有文件列表

#### 文件删除
```
DELETE /api/resources/{unique_id}.{postfix}
```
- 需要认证
- 删除指定的文件

#### 用户头像上传 ⭐
```
POST /api/users/avatar/upload
```
- 需要认证
- 只允许图片格式
- 最大文件大小：5MB
- 自动更新用户头像并返回更新后的用户信息

**请求示例（curl）：**
```bash
curl -X POST "http://localhost:8765/api/users/avatar/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/avatar.jpg"
```

**响应示例：**
```json
{
  "message": "头像上传成功",
  "avatar_url": "/api/resources/123e4567-e89b-12d3-a456-426614174000.jpg",
  "user": {
    "id": "user123",
    "username": "测试用户",
    "email": "user@example.com",
    "avatar": "/api/resources/123e4567-e89b-12d3-a456-426614174000.jpg",
    "registerTime": "2024-01-01T12:00:00"
  }
}
```

## 数据存储

数据使用 pandas DataFrame 存储，并持久化到 JSON 文件：

- `data/users.json` - 用户数据
- `data/blogs.json` - 博客数据
- `data/categories.json` - 分类数据

## 示例数据

服务启动时会自动创建示例数据：

### 示例用户
- **博客达人** (demo@example.com / demo123)
- **技术小白** (tech@example.com / tech123)

### 示例博客
- FastAPI 快速入门指南

### 示例分类
- 技术
- 生活
- 随笔

## 认证说明

- 使用 JWT Token 进行认证
- Token 有效期：30分钟
- 需要认证的接口需要在 Header 中添加：`Authorization: Bearer <token>`

## 开发说明

### 项目结构

```
server/
├── main.py          # FastAPI 应用主文件
├── models.py        # Pydantic 数据模型
├── database.py      # 数据库操作类
├── auth.py          # 认证相关工具
├── start.py         # 启动脚本
├── requirements.txt # 依赖包列表
├── README.md        # 说明文档
└── data/           # 数据存储目录
    ├── users.json
    ├── blogs.json
    └── categories.json
```

### 扩展建议

1. **数据库升级**: 可以轻松替换为 SQLite、PostgreSQL 等真实数据库
2. **缓存支持**: 添加 Redis 缓存提升性能
3. **文件上传**: 支持图片和文件上传
4. **邮件服务**: 添加邮件验证和通知功能
5. **日志系统**: 完善的日志记录和监控

## 注意事项

- 这是一个开发用的简单实现，不建议直接用于生产环境
- 密码加密使用 bcrypt，但 JWT 密钥是硬编码的，生产环境需要使用环境变量
- 数据存储在本地文件中，重启服务数据不会丢失
- CORS 配置允许本地开发，生产环境需要调整

## 使用场景

### 1. 用户头像
```javascript
// 上传头像
const formData = new FormData();
formData.append('file', avatarFile);

const response = await fetch('/api/resources/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
const avatarUrl = result.file.url;

// 更新用户信息中的头像URL
await fetch(`/api/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ avatar: avatarUrl })
});
```

### 2. 博客图片
```javascript
// 在博客编辑器中插入图片
const uploadImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  
  const response = await fetch('/api/resources/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  return result.file.url; // 可以直接在markdown中使用
};
```

### 3. 用户文件管理（网盘功能）
```javascript
// 获取用户文件列表
const getUserFiles = async () => {
  const response = await fetch('/api/resources/list', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// 删除文件
const deleteFile = async (uniqueId, extension) => {
  await fetch(`/api/resources/${uniqueId}.${extension}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

## 文件存储说明

- 文件存储在服务器的 `uploads/` 目录中
- 每个文件都有唯一的UUID作为文件名
- 文件URL格式：`/api/resources/{uuid}.{extension}`
- 文件可以直接通过URL访问，无需认证
- 上传和删除操作需要用户认证

## 测试账号

系统预设了以下测试账号：

| 邮箱 | 密码 | 用户名 | 头像 |
|------|------|--------|------|
| demo@example.com | demo123 | 博客达人 | 外部头像 |
| demo1@example.com | demo123 | 测试用户 | 无头像（可测试上传） |
| tech@example.com | tech123 | 技术小白 | 外部头像 |

## 头像处理逻辑

### URL格式统一
- 文件上传返回：`/api/resources/{uuid}.{ext}` （相对路径）
- 前端自动解析为：`http://localhost:8765/api/resources/{uuid}.{ext}`
- 用户头像字段存储相对路径，前端显示时自动转换为完整URL

### 头像上传流程
1. 用户选择图片文件
2. 调用 `/api/users/avatar/upload` 接口
3. 后端保存文件并更新用户头像字段
4. 返回新的用户信息
5. 前端更新本地用户数据

## 安全注意事项

1. 文件类型限制：只允许特定的文件扩展名
2. 文件大小限制：常规文件50MB，头像5MB
3. 唯一ID：使用UUID防止文件名冲突和猜测
4. 上传认证：需要JWT token才能上传文件
5. 目录权限：确保uploads目录有适当的读写权限
6. 头像专用接口：自动更新用户信息，避免数据不一致
