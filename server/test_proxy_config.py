#!/usr/bin/env python3
"""
代理配置功能测试脚本

演示如何使用新的代理配置格式，以及如何测试代理连接。
"""

import asyncio
import json
import sys
import os

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

from services.openai_service import OpenAIService
from models.database import AIProviderConfig, AIProviderType

async def test_proxy_configuration():
    """测试代理配置功能"""
    
    print("=== 代理配置功能测试 ===\n")
    
    # 示例1：创建不带代理的配置
    print("1. 测试不带代理的配置:")
    config_without_proxy = AIProviderConfig(
        id="test-1",
        name="测试配置-无代理",
        provider_type=AIProviderType.OPENAI,
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key-123",
        proxy=None,
        models=["gpt-3.5-turbo"],
        default_model="gpt-3.5-turbo",
        default_temperature=0.7,
        default_max_tokens=2000,
        is_active=True,
        is_default=False,
        priority=0,
        extra_config={}
    )
    
    try:
        async with OpenAIService(provider_config=config_without_proxy) as service:
            print(f"  ✓ 服务创建成功: {service.config.name}")
            proxy_test = await service.test_proxy_connection()
            print(f"  ✓ 代理测试结果: {proxy_test} (无代理配置)")
    except Exception as e:
        print(f"  ✗ 错误: {e}")
    
    print()
    
    # 示例2：创建带有HTTP代理的配置
    print("2. 测试带有HTTP代理的配置:")
    config_with_http_proxy = AIProviderConfig(
        id="test-2",
        name="测试配置-HTTP代理",
        provider_type=AIProviderType.OPENAI,
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key-123",
        proxy={
            "url": "http://127.0.0.1:7890",
            "username": "",
            "password": ""
        },
        models=["gpt-3.5-turbo"],
        default_model="gpt-3.5-turbo",
        default_temperature=0.7,
        default_max_tokens=2000,
        is_active=True,
        is_default=False,
        priority=0,
        extra_config={}
    )
    
    try:
        async with OpenAIService(provider_config=config_with_http_proxy) as service:
            print(f"  ✓ 服务创建成功: {service.config.name}")
            print(f"  → 代理URL: {service.config.proxy['url']}")
            
            # 注意：这个测试可能会失败，因为本地可能没有运行代理服务
            proxy_test = await service.test_proxy_connection()
            print(f"  → 代理连接测试: {'通过' if proxy_test else '失败'}")
            
    except Exception as e:
        print(f"  ✗ 错误: {e}")
    
    print()
    
    # 示例3：创建带有认证的代理配置
    print("3. 测试带有用户认证的代理配置:")
    config_with_auth_proxy = AIProviderConfig(
        id="test-3",
        name="测试配置-认证代理",
        provider_type=AIProviderType.OPENAI,
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key-123",
        proxy={
            "url": "http://proxy.example.com:8080",
            "username": "proxyuser",
            "password": "proxypass"
        },
        models=["gpt-3.5-turbo"],
        default_model="gpt-3.5-turbo",
        default_temperature=0.7,
        default_max_tokens=2000,
        is_active=True,
        is_default=False,
        priority=0,
        extra_config={}
    )
    
    try:
        async with OpenAIService(provider_config=config_with_auth_proxy) as service:
            print(f"  ✓ 服务创建成功: {service.config.name}")
            print(f"  → 代理URL: {service.config.proxy['url']}")
            print(f"  → 代理用户: {service.config.proxy['username']}")
            
            # 注意：这个测试可能会失败，因为代理服务器不存在
            proxy_test = await service.test_proxy_connection()
            print(f"  → 代理连接测试: {'通过' if proxy_test else '失败'}")
            
    except Exception as e:
        print(f"  ✗ 错误: {e}")
    
    print()
    
    # 示例4：测试无效代理配置
    print("4. 测试无效代理配置:")
    config_with_invalid_proxy = AIProviderConfig(
        id="test-4",
        name="测试配置-无效代理",
        provider_type=AIProviderType.OPENAI,
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key-123",
        proxy={
            "url": "",  # 空URL
            "username": "",
            "password": ""
        },
        models=["gpt-3.5-turbo"],
        default_model="gpt-3.5-turbo",
        default_temperature=0.7,
        default_max_tokens=2000,
        is_active=True,
        is_default=False,
        priority=0,
        extra_config={}
    )
    
    try:
        async with OpenAIService(provider_config=config_with_invalid_proxy) as service:
            print(f"  ✗ 预期应该失败，但服务创建成功了")
    except Exception as e:
        print(f"  ✓ 预期的错误: {e}")
    
    print()

def demonstrate_proxy_config_format():
    """演示代理配置格式"""
    
    print("=== 代理配置格式示例 ===\n")
    
    examples = [
        {
            "name": "HTTP代理（无认证）",
            "config": {
                "url": "http://127.0.0.1:7890",
                "username": "",
                "password": ""
            }
        },
        {
            "name": "HTTPS代理（无认证）",
            "config": {
                "url": "https://proxy.example.com:8080",
                "username": "",
                "password": ""
            }
        },
        {
            "name": "HTTP代理（带认证）",
            "config": {
                "url": "http://proxy.company.com:3128",
                "username": "myuser",
                "password": "mypassword"
            }
        },
        {
            "name": "SOCKS5代理",
            "config": {
                "url": "socks5://127.0.0.1:1080",
                "username": "",
                "password": ""
            }
        }
    ]
    
    for example in examples:
        print(f"{example['name']}:")
        print(f"  {json.dumps(example['config'], indent=2, ensure_ascii=False)}")
        print()

def show_migration_info():
    """显示迁移信息"""
    
    print("=== 数据迁移信息 ===\n")
    
    print("旧格式 (已废弃):")
    old_format = {
        "host": "127.0.0.1",
        "port": 7890,
        "username": "user",
        "password": "pass"
    }
    print(f"  {json.dumps(old_format, indent=2, ensure_ascii=False)}")
    
    print("\n新格式 (推荐):")
    new_format = {
        "url": "http://127.0.0.1:7890",
        "username": "user", 
        "password": "pass"
    }
    print(f"  {json.dumps(new_format, indent=2, ensure_ascii=False)}")
    
    print("\n迁移命令:")
    print("  python migrations/migrate_proxy_config_format.py")
    
    print("\n回滚命令 (如需要):")
    print("  python migrations/migrate_proxy_config_format.py --rollback")
    
    print()

async def main():
    """主函数"""
    
    print("代理配置功能测试和演示\n")
    print("=" * 50)
    print()
    
    # 显示配置格式
    demonstrate_proxy_config_format()
    
    # 显示迁移信息
    show_migration_info()
    
    # 测试代理功能
    await test_proxy_configuration()
    
    print("=== 测试完成 ===\n")
    
    print("注意事项:")
    print("1. 代理测试可能会失败，这是正常的（如果本地没有运行相应的代理服务）")
    print("2. 实际使用时，请确保代理服务器可访问")
    print("3. 代理配置会在初始化OpenAI服务时进行验证")
    print("4. 如果代理配置无效，服务初始化会失败并抛出异常")
    print("5. 可以使用 test_proxy_connection() 方法单独测试代理连接")

if __name__ == "__main__":
    asyncio.run(main()) 