#!/usr/bin/env python3
"""
AI供应商配置数据库初始化脚本

用于创建AI供应商配置表并添加示例配置
"""

import os
import sys
from sqlalchemy.orm import Session

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import Base, engine, SessionLocal, AIProvider
from services.ai_provider_service import AIProviderService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """创建所有数据库表"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {str(e)}")
        raise

def add_sample_provider_configs(db: Session):
    """添加示例AI供应商配置"""
    try:
        provider_service = AIProviderService(db)
        
        # 检查是否已有配置
        existing_configs = provider_service.list_provider_configs()
        if existing_configs:
            logger.info(f"Found {len(existing_configs)} existing provider configs, skipping sample creation")
            return
        
        logger.info("Adding sample AI provider configurations...")
        
        # OpenAI 官方配置
        openai_config = provider_service.create_provider_config(
            name="OpenAI Official",
            provider=AIProvider.OPENAI,
            base_url="https://api.openai.com/v1",
            api_key="YOUR_OPENAI_API_KEY_HERE",  # 需要用户填入真实API密钥
            models=[
                "gpt-4",
                "gpt-4-turbo-preview", 
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-16k"
            ],
            default_model="gpt-3.5-turbo",
            default_temperature=0.7,
            default_max_tokens=2000,
            is_active=False,  # 默认不激活，需要用户配置真实API密钥后激活
            is_default=True,
            priority=100,
            rate_limit_per_minute=60,
            description="OpenAI官方API配置，需要配置真实的API密钥"
        )
        
        logger.info(f"✅ Created OpenAI config: {openai_config.name}")
        
        # 示例自定义配置（用于代理或其他兼容OpenAI的服务）
        custom_config = provider_service.create_provider_config(
            name="Custom OpenAI Compatible",
            provider=AIProvider.CUSTOM,
            base_url="https://your-proxy-url.com/v1",
            api_key="YOUR_CUSTOM_API_KEY_HERE",
            models=["gpt-3.5-turbo", "gpt-4"],
            default_model="gpt-3.5-turbo",
            default_temperature=0.7,
            default_max_tokens=2000,
            is_active=False,
            is_default=False,
            priority=50,
            description="自定义OpenAI兼容服务配置示例"
        )
        
        logger.info(f"✅ Created custom config: {custom_config.name}")
        
        logger.info("✅ Sample AI provider configurations added successfully!")
        logger.info("⚠️  Please update the API keys and activate the configurations in the admin panel.")
        
    except Exception as e:
        logger.error(f"❌ Failed to add sample configs: {str(e)}")
        raise

def print_usage_instructions():
    """打印使用说明"""
    print("\n" + "="*60)
    print("🎉 AI供应商配置系统初始化完成!")
    print("="*60)
    print("\n📝 接下来的步骤:")
    print("1. 启动服务器：python main.py")
    print("2. 使用管理员账户登录")
    print("3. 访问 /api/ai-providers 管理供应商配置")
    print("4. 更新API密钥并激活配置")
    print("\n🔧 API接口:")
    print("- GET    /api/ai-providers                    - 列出所有配置")
    print("- POST   /api/ai-providers                    - 创建新配置")
    print("- GET    /api/ai-providers/{id}               - 获取特定配置")
    print("- PUT    /api/ai-providers/{id}               - 更新配置")
    print("- DELETE /api/ai-providers/{id}               - 删除配置")
    print("- POST   /api/ai-providers/{id}/test          - 测试配置")
    print("- GET    /api/ai-providers/default/current    - 获取当前默认配置")
    print("\n⚠️  注意事项:")
    print("- 只有管理员可以管理供应商配置")
    print("- 请妥善保管API密钥")
    print("- 建议为不同用途创建不同的配置")
    print("="*60)

def main():
    """主函数"""
    logger.info("🚀 Starting AI Provider Configuration Initialization...")
    
    try:
        # 创建数据库表
        create_tables()
        
        # 添加示例配置
        db = SessionLocal()
        try:
            add_sample_provider_configs(db)
        finally:
            db.close()
        
        # 打印使用说明
        print_usage_instructions()
        
    except Exception as e:
        logger.error(f"❌ Initialization failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 