import os
from typing import Optional
from pydantic_settings import BaseSettings
import logging

class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库配置
    database_url: str = "sqlite:///./blog_platform.db"
    
    # OpenAI 配置
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_default_model: str = "gpt-3.5-turbo"
    openai_default_temperature: float = 0.7
    openai_default_max_tokens: int = 2000
    
    # 并发控制配置
    max_concurrent_llm_requests: int = 10
    
    # 安全配置
    secret_key: str = "your-secret-key-here"  # 应该从环境变量获取
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7天
    
    # 服务器配置
    host: str = "0.0.0.0"
    port: int = 8765
    debug: bool = False
    
    # 日志配置
    log_level: str = "INFO"
    log_file: Optional[str] = None
    
    # CORS配置
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        env_prefix = "BLOG_"

# 全局设置实例
settings = Settings()

def get_settings() -> Settings:
    """获取应用设置"""
    return settings

def configure_logging():
    """配置日志"""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # 配置根日志器
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format=log_format,
        handlers=[
            logging.StreamHandler(),  # 控制台输出
        ]
    )
    
    # 如果指定了日志文件，添加文件处理器
    if settings.log_file:
        file_handler = logging.FileHandler(settings.log_file, encoding='utf-8')
        file_handler.setFormatter(logging.Formatter(log_format))
        logging.getLogger().addHandler(file_handler)
    
    # 设置第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)

def get_openai_config() -> dict:
    """获取OpenAI配置"""
    return {
        "api_key": settings.openai_api_key or os.getenv("OPENAI_API_KEY"),
        "base_url": settings.openai_base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "default_model": settings.openai_default_model,
        "default_temperature": settings.openai_default_temperature,
        "default_max_tokens": settings.openai_default_max_tokens,
    }

def validate_config():
    """验证关键配置"""
    issues = []
    
    # 检查OpenAI配置
    openai_config = get_openai_config()
    if not openai_config["api_key"]:
        issues.append("⚠️  OpenAI API Key 未配置 - 对话功能将无法使用")
    
    # 检查密钥安全性
    if settings.secret_key == "your-secret-key-here":
        issues.append("⚠️  JWT Secret Key 使用默认值 - 生产环境请更改")
    
    return issues

def print_config_status():
    """打印配置状态"""
    print("🔧 配置状态检查:")
    print(f"   数据库: {settings.database_url}")
    print(f"   OpenAI API: {'✅ 已配置' if get_openai_config()['api_key'] else '❌ 未配置'}")
    print(f"   并发限制: {settings.max_concurrent_llm_requests} 个请求")
    print(f"   服务地址: {settings.host}:{settings.port}")
    print(f"   日志级别: {settings.log_level}")
    
    # 显示配置问题
    issues = validate_config()
    if issues:
        print("\n⚠️  配置警告:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("✅ 所有关键配置正常")
    
    print("=" * 50) 