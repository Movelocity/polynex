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
