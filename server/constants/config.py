import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

DEFAULT_SECRET_KEY = "your-key-here"

class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库配置
    database_url: str = "sqlite:///./polynex.db"
    
    # 并发控制配置
    max_concurrent_llm_requests: int = 10
    
    # 安全配置
    secret_key: str = DEFAULT_SECRET_KEY  # 应该从环境变量获取
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7天
    
    # 服务器配置
    host: str = "localhost"
    port: int = 8766
    debug: bool = False
    
    # 日志配置
    log_level: str = "INFO"
    log_file: Optional[str] = None
    
    # CORS配置
    # cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    cors_origin_list: list[str] = []
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# 全局设置实例
settings = Settings()
settings.cors_origin_list = [item.strip() for item in settings.cors_origins.split(',')]

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


def validate_config():
    """验证关键配置"""
    issues = []
    
    # 检查密钥安全性
    if settings.secret_key == DEFAULT_SECRET_KEY:
        issues.append("⚠️  JWT Secret Key 使用默认值 - 生产环境请更改")
    
    return issues

def print_config_status():
    """打印配置状态"""
    print("🔧 配置状态检查:")
    print(f"   数据库: {settings.database_url}")
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