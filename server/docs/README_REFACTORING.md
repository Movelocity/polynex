# 博客平台 API 功能分组重构总结

## 重构概述
将原本在 `main.py` 中的所有路由功能按业务逻辑进行分组拆分，提高代码的可维护性和组织性。

## 分组结构

### 1. 用户相关功能

#### 认证模块 (`routers/auth.py`)
- **路由前缀**: `/api/auth`
- **功能**:
  - `POST /login` - 用户登录
  - `POST /register` - 用户注册
  - `POST /logout` - 用户登出
  - `GET /validate` - 验证JWT token
  - `PUT /password` - 更新用户密码

#### 用户管理模块 (`routers/users.py`)
- **路由前缀**: `/api/users`
- **功能**:
  - `GET /` - 获取所有用户
  - `GET /current` - 获取当前用户
  - `GET /by-email/{email}` - 根据邮箱查找用户
  - `GET /by-username/{username}` - 根据用户名查找用户
  - `POST /` - 创建用户
  - `PUT /{user_id}` - 更新用户信息
  - `POST /batch` - 批量保存用户

### 2. 文章相关功能

#### 博客管理模块 (`routers/blogs.py`)
- **路由前缀**: `/api/blogs`
- **功能**:
  - `GET /` - 获取所有博客
  - `GET /published` - 获取已发布博客
  - `GET /{blog_id}` - 根据ID获取博客
  - `GET /author/{author_id}` - 根据作者获取博客
  - `GET /category/{category}` - 根据分类获取博客
  - `GET /search` - 搜索博客
  - `POST /` - 创建博客
  - `PUT /{blog_id}` - 更新博客
  - `DELETE /{blog_id}` - 删除博客
  - `POST /{blog_id}/views` - 增加博客浏览量
  - `POST /batch` - 批量保存博客

#### 分类管理模块 (`routers/categories.py`)
- **路由前缀**: `/api/categories`
- **功能**:
  - `GET /` - 获取所有分类
  - `GET /{name}` - 根据名称获取分类
  - `POST /` - 创建分类
  - `PUT /{category_id}` - 更新分类
  - `DELETE /{category_id}` - 删除分类
  - `PUT /counts` - 更新分类计数
  - `POST /batch` - 批量保存分类

### 3. 文件相关功能

#### 文件管理模块 (`routers/files.py`)
- **路由前缀**: `/api`
- **功能**:
  - `POST /resources/upload` - 上传文件
  - `GET /resources/{unique_id}.{postfix}` - 获取文件
  - `GET /resources/list` - 获取文件列表
  - `DELETE /resources/{unique_id}.{postfix}` - 删除文件
  - `POST /resources/user-avatar` - 上传用户头像

### 4. 管理员相关功能

#### 管理员模块 (`routers/admin.py`)
- **路由前缀**: `/api/admin`
- **功能**:
  - **网站配置管理**:
    - `GET /site-config` - 获取所有网站配置
    - `GET /site-config/{key}` - 根据键获取配置
    - `PUT /site-config/{key}` - 更新网站配置
    - `POST /site-config` - 创建网站配置
    - `DELETE /site-config/{key}` - 删除网站配置
  - **用户管理**:
    - `GET /users` - 获取所有用户（管理员权限）
    - `GET /users/stats` - 获取用户统计数据
    - `PUT /users/{user_id}/role` - 更新用户角色
    - `PUT /users/{user_id}` - 更新用户信息
    - `DELETE /users/{user_id}` - 删除用户
    - `PUT /users/{user_id}/password` - 重置用户密码

### 5. 测试相关功能

#### 开发测试模块 (`routers/dev.py`)
- **路由前缀**: `/api/dev`
- **功能**:
  - `POST /generate-sample-data` - 生成示例数据

## 重构后的文件结构

```
server/
├── main.py                    # 主应用文件（精简后）
├── models.py                  # 数据模型
├── database.py                # 数据库操作
├── auth.py                    # 认证相关工具
└── routers/                   # 路由模块目录
    ├── __init__.py           # 包初始化文件
    ├── auth.py               # 用户认证路由
    ├── users.py              # 用户管理路由
    ├── blogs.py              # 博客管理路由
    ├── categories.py         # 分类管理路由
    ├── files.py              # 文件管理路由
    ├── admin.py              # 管理员功能路由
    └── dev.py                # 开发测试路由
```

## 重构优势

1. **模块化**: 每个功能模块独立，便于维护和开发
2. **职责明确**: 每个路由文件只负责特定的业务逻辑
3. **易于扩展**: 新功能可以轻松添加到对应的模块中
4. **减少耦合**: 各模块之间依赖性降低
5. **代码复用**: 公共功能（如权限检查）可以在多个模块中复用
6. **更好的测试**: 可以针对每个模块进行单独测试

## 注意事项

1. 所有路由模块都使用相对导入 (`from ..models import ...`)
2. 权限检查函数在需要的模块中重复定义，可以考虑提取到公共模块
3. 文件上传路径配置在 `files.py` 中，与主应用保持一致
4. 数据库连接通过 `db` 实例共享

## 使用方法

重构后的应用启动方式不变：

```bash
cd server
python main.py
```

或者使用 uvicorn：

```bash
cd server
uvicorn main:app --host 0.0.0.0 --port 8765 --reload
```

API 文档访问地址：
- Swagger UI: http://localhost:8765/docs
- ReDoc: http://localhost:8765/redoc 