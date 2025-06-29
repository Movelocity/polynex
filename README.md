# Polynex 博客平台

Polynex 是一个功能完整的现代化博客平台，集成AI对话、文件管理、用户管理等多种功能。

在信息的宇宙中，创作者常被困于孤岛——文字、图像、AI散落四方。Polynex在这种情况下诞生。

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.1-yellow.svg)](https://vitejs.dev/)

## ✨ 核心功能

### 🔐 用户系统
- JWT Token认证与授权
- 用户注册、登录、个人资料管理
- 头像上传与编辑
- 管理员权限控制

### 📝 博客管理
- Markdown支持的博客编辑器
- 分类管理与标签系统
- 博客发布与草稿保存
- 博客搜索与筛选

### 🤖 AI集成
- **AI供应商管理**: 支持多种AI服务（OpenAI、Claude等）
- **AI代理系统**: 创建自定义AI对话角色
- **智能对话**: 支持长对话历史与上下文
- **对话搜索**: 智能搜索历史对话内容

### 📁 文件管理
- 文件上传与存储
- 图片裁剪与处理
- 文件预览与下载

### 🛠️ 实用工具
- **图片裁剪器**: 支持多种尺寸比例
- **图片OCR**: 文字识别功能
- **JSON格式化**: 代码美化工具
- **Markdown预览**: 实时预览支持

## 🏗️ 技术栈

### 后端 (Server)
- **框架**: FastAPI 0.104.1
- **数据库**: SQLAlchemy + SQLite
- **认证**: JWT + Passlib
- **AI集成**: OpenAI API
- **异步**: Uvicorn ASGI服务器

### 前端 (Web)
- **框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 6.0.1
- **UI库**: Radix UI + Tailwind CSS
- **路由**: React Router v6
- **状态管理**: React Context + Hooks
- **图标**: Lucide React

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 16+
- npm 或 yarn

### 1. 克隆项目
```bash
git clone https://github.com/Movelocity/polynex.git
cd polynex
```

### 2. 后端设置

#### 安装依赖
```bash
cd server
pip install -r requirements.txt
```

#### 环境配置
创建 `.env` 文件：
```bash
# 数据库配置
BLOG_DATABASE_URL=sqlite:///./blog_platform.db

# 安全配置
BLOG_SECRET_KEY=your-super-secret-key-here
BLOG_JWT_ALGORITHM=HS256
BLOG_JWT_EXPIRE_MINUTES=10080

# 服务器配置
BLOG_HOST=0.0.0.0
BLOG_PORT=8765
BLOG_DEBUG=true

# 日志配置
BLOG_LOG_LEVEL=INFO

# CORS配置
BLOG_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# AI配置 (可选)
OPENAI_API_KEY=your-openai-api-key
```

#### 启动后端
```bash
python main.py
```

服务启动后访问：
- API服务: http://localhost:8765
- API文档: http://localhost:8765/docs
- 交互式文档: http://localhost:8765/redoc

### 3. 前端设置

#### 安装依赖
```bash
cd web
npm install
```

#### 启动前端
```bash
npm run dev
```

前端启动后访问: http://localhost:5173

### 4. 首次使用

1. 访问前端页面进行用户注册
2. 登录后即可使用所有功能
3. 管理员功能需要在数据库中手动设置用户权限

## 📚 API文档

### 认证接口
```
POST /api/auth/login     # 用户登录
POST /api/auth/register  # 用户注册
POST /api/auth/logout    # 用户登出
```

### 用户管理
```
GET  /api/users/profile  # 获取个人资料
PUT  /api/users/profile  # 更新个人资料
POST /api/users/avatar   # 上传头像
```

### 博客管理
```
GET    /api/blogs        # 获取博客列表
POST   /api/blogs        # 创建博客
GET    /api/blogs/{id}   # 获取博客详情
PUT    /api/blogs/{id}   # 更新博客
DELETE /api/blogs/{id}   # 删除博客
```

### AI功能
```
GET  /api/agents         # 获取AI代理列表
POST /api/agents         # 创建AI代理
GET  /api/conversations  # 获取对话列表
POST /api/conversations  # 创建对话
```

### 文件管理
```
POST /api/files/upload   # 文件上传
GET  /api/files/{id}     # 文件下载
```

完整API文档请访问: http://localhost:8765/docs

## 📁 项目结构

```
blog-platform/
├── server/                 # 后端代码
│   ├── controllers/        # API控制器
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── core(deprecated)/              # 核心功能
│   ├── constants/         # 配置常量
│   ├── migrations/        # 数据库迁移
│   ├── requirements.txt   # Python依赖
│   └── main.py           # 应用入口
├── web/                   # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── contexts/      # React Context
│   │   ├── types/         # TypeScript类型
│   │   └── utils/         # 工具函数
│   ├── package.json       # Node.js依赖
│   └── vite.config.ts     # Vite配置
└── README.md              # 项目文档
```

## 🔧 开发指南

### 后端开发

#### 添加新的API端点
1. 在 `controllers/` 中创建新的路由文件
2. 在 `services/` 中实现业务逻辑
3. 在 `main.py` 中注册路由

#### 数据库迁移
```bash
# 创建迁移脚本
cd server/migrations
python your_migration_script.py
```

### 前端开发

#### 组件开发规范
- 使用TypeScript严格模式
- 组件放在 `src/components/` 目录
- 页面组件放在 `src/pages/` 目录
- 使用Tailwind CSS进行样式设计

#### 添加新页面
1. 在 `src/pages/` 中创建页面组件
2. 在 `App.tsx` 中添加路由配置
3. 如需API调用，在 `src/services/` 中添加服务

## 🎨 主题配置

项目支持亮色/暗色主题切换，主题配置文件位于：
- `web/src/hooks/useTheme.ts`
- `web/tailwind.config.js`

## 🔍 功能特色

### AI对话功能
- 支持多个AI供应商（OpenAI、Claude等）
- 可创建个性化AI代理角色
- 支持长对话历史记录
- 智能对话搜索功能

### 博客编辑器
- Markdown实时预览
- 代码高亮支持
- 数学公式渲染（KaTeX）
- 自动保存草稿

### 用户体验
- 响应式设计，支持移动端
- 现代化UI设计
- 快速搜索功能
- 文件拖拽上传

## 🚀 部署指南

### Docker部署 (推荐)
```bash
# 构建镜像
docker build -t blog-platform .

# 运行容器
docker run -p 8765:8765 -p 5173:5173 blog-platform
```

### 传统部署
1. 在服务器上安装Python 3.9+和Node.js
2. 按照快速开始指南配置环境
3. 使用PM2或systemd管理进程
4. 配置Nginx反向代理

## ❓ 常见问题

### Q: 如何配置AI功能？
A: 在 `.env` 文件中设置 `OPENAI_API_KEY`，然后在管理面板中配置AI供应商。

### Q: 如何修改数据库配置？
A: 修改 `.env` 文件中的 `BLOG_DATABASE_URL` 配置项。

### Q: 前端如何连接不同的后端地址？
A: 修改 `web/src/services/api/ApiClient.ts` 中的baseURL配置。

### Q: 如何自定义主题？
A: 修改 `web/tailwind.config.js` 和相关CSS变量文件。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本项目
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的Python Web框架
- [React](https://reactjs.org/) - 用户界面库
- [Radix UI](https://www.radix-ui.com/) - 高质量组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个⭐️</p>
  <p>Built with ❤️ by Blog Platform Team</p>
</div>