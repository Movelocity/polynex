from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uvicorn
import sys

# 导入配置和日志
from constants import get_settings, configure_logging, print_config_status

# 导入路由模块
from controllers import auth, users, blogs, categories, files, admin, dev, conversations, agents, ai_providers

# 初始化配置和日志
settings = get_settings()
configure_logging()

app = FastAPI(
    title="博客平台 API",
    description="一个简单的博客平台后端 API",
    version="1.0.0"
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
app.include_router(dev.router)
app.include_router(conversations.router)
app.include_router(agents.router)
app.include_router(ai_providers.router, prefix="/api")

# 根路径欢迎信息
@app.get("/")
async def root():
    """API根路径"""
    return {
        "message": "欢迎使用博客平台 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
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