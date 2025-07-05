from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from contextlib import asynccontextmanager
import uvicorn
import sys

# 导入配置和日志
from constants import get_settings, configure_logging, print_config_status

# 导入路由模块
from controllers import auth, users, blogs, categories, files, admin, conversations, agents, ai_providers

# 导入数据库初始化
from models.database import create_tables

# 初始化配置和日志
settings = get_settings()
configure_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 创建数据库表，确保数据库就绪
    create_tables()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="博客平台 API",
    description="""
    ## 功能强大的博客平台后端 API
    
    ### 主要功能：
    - **🔐 用户认证**: JWT Token认证，支持用户注册、登录
    - **👥 用户管理**: 完整的用户管理系统，支持管理员权限控制  
    - **🤖 AI供应商管理**: 支持多种AI服务提供商配置和管理
    - **🎭 AI代理系统**: 创建和管理自定义AI对话代理
    - **📝 博客管理**: 博客文章的创建、编辑、发布功能
    - **📁 文件管理**: 文件上传、存储和管理
    - **⚙️ 系统配置**: 网站配置和系统参数管理
    
    ### 权限说明：
    - **🟢 公开接口**: 无需认证即可访问
    - **🔵 用户接口**: 需要登录用户权限
    - **🔴 管理员接口**: 需要管理员权限
    
    ### 认证方式：
    请在请求头中添加：`Authorization: Bearer <your_jwt_token>`
    
    获取Token请先调用登录接口：`POST /api/auth/login`
    """,
    version="1.0.0",
    contact={
        "name": "博客平台开发团队",
        "email": "admin@blogplatform.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    },
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 确保上传目录存在
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 注册路由
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(blogs.router)
app.include_router(categories.router)
app.include_router(files.router)
app.include_router(admin.router)
app.include_router(conversations.router)
app.include_router(agents.router)
app.include_router(ai_providers.router)  # 已经有前缀 /api/ai

# 根路径欢迎信息
@app.get("/")
async def root():
    """
    API根路径 - 欢迎页面
    
    返回API的基本信息和文档链接。
    """
    return {
        "message": "🎉 欢迎使用博客平台 API",
        "version": "1.0.0",
        "description": "功能强大的博客平台后端服务",
        "features": {
            "authentication": "JWT Token认证系统",
            "ai_integration": "AI供应商和代理管理",
            "blog_management": "完整的博客管理功能",
            "user_management": "用户和权限管理",
            "file_management": "文件上传和管理"
        },
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc", 
            "custom_docs": "/api/docs/",
            "api_status": "/api/docs/status",
            "permissions_info": "/api/docs/permissions"
        },
        "endpoints": {
            "health_check": "/health",
            "authentication": "/api/auth/*",
            "ai_providers": "/api/ai/*",
            "ai_agents": "/api/agents/*",
            "admin": "/api/admin/*",
            "users": "/api/users/*",
            "blogs": "/api/blogs/*"
        }
    }

# 健康检查
@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "message": "服务运行正常"}


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8765)

def main():
    """启动 FastAPI 服务"""
    print("🚀 启动博客平台后端服务...")
    print(f"📍 服务地址: http://{settings.host}:{settings.port}")
    print(f"📖 API 文档: http://{settings.host}:{settings.port}/docs")
    print(f"🔧 交互式文档: http://{settings.host}:{settings.port}/redoc")
    
    # 显示配置状态
    print_config_status()

    try:
        uvicorn.run(
            "main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
            log_level=settings.log_level.lower()
        )
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()