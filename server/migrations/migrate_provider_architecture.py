"""
数据库迁移脚本：AI Provider架构重构
从旧的provider_config_id架构迁移到新的provider名称架构

执行命令：python migrations/migrate_provider_architecture.py
"""
import sys 
sys.path.append("..")

import sqlite3
import json
import uuid
from datetime import datetime
from typing import Dict, Any

def migrate_database(db_path: str = "./blog_platform.db"):
    """
    执行数据库迁移
    
    Args:
        db_path: 数据库文件路径
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("开始数据库迁移...")
        
        # 1. 首先检查是否已经迁移过
        cursor.execute("PRAGMA table_info(ai_provider_configs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'provider_type' in columns:
            print("数据库已经迁移过，跳过迁移。")
            return
        
        # 2. 备份原表
        print("1. 备份原表...")
        cursor.execute("""
            CREATE TABLE ai_provider_configs_backup AS 
            SELECT * FROM ai_provider_configs
        """)
        
        cursor.execute("""
            CREATE TABLE agents_backup AS 
            SELECT * FROM agents
        """)
        
        # 3. 删除原表
        print("2. 删除原表...")
        cursor.execute("DROP TABLE ai_provider_configs")
        cursor.execute("DROP TABLE agents")
        
        # 4. 创建新的ai_provider_configs表
        print("3. 创建新的ai_provider_configs表...")
        cursor.execute("""
            CREATE TABLE ai_provider_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL UNIQUE,
                provider_type TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                proxy TEXT,
                models TEXT NOT NULL,
                default_model TEXT,
                default_temperature REAL DEFAULT 0.7,
                default_max_tokens INTEGER DEFAULT 2000,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                is_default BOOLEAN NOT NULL DEFAULT 0,
                priority INTEGER NOT NULL DEFAULT 0,
                rate_limit_per_minute INTEGER,
                extra_config TEXT NOT NULL,
                description TEXT,
                create_time TEXT NOT NULL,
                update_time TEXT NOT NULL
            )
        """)
        
        # 5. 创建新的agents表
        print("4. 创建新的agents表...")
        cursor.execute("""
            CREATE TABLE agents (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                top_p REAL,
                temperature REAL,
                max_tokens INTEGER,
                preset_messages TEXT NOT NULL,
                app_preset TEXT NOT NULL,
                is_public BOOLEAN NOT NULL DEFAULT 0,
                is_default BOOLEAN NOT NULL DEFAULT 0,
                create_time TEXT NOT NULL,
                update_time TEXT NOT NULL
            )
        """)
        
        # 6. 迁移ai_provider_configs数据
        print("5. 迁移ai_provider_configs数据...")
        cursor.execute("SELECT * FROM ai_provider_configs_backup")
        old_configs = cursor.fetchall()
        
        config_mapping = {}  # 旧ID -> 新provider名称的映射
        
        for config in old_configs:
            old_id, name, old_provider, base_url, api_key, models, default_model, \
            default_temperature, default_max_tokens, is_active, is_default, priority, \
            rate_limit_per_minute, extra_config, description, create_time, update_time = config
            
            # 生成新的provider名称（基于name，确保唯一性）
            provider_name = name.lower().replace(" ", "-").replace("账户", "").replace("配置", "")
            if not provider_name:
                provider_name = f"provider-{old_id[:8]}"
            
            # 确保provider名称唯一
            base_provider_name = provider_name
            counter = 1
            while provider_name in [mapping[1] for mapping in config_mapping.values()]:
                provider_name = f"{base_provider_name}-{counter}"
                counter += 1
            
            config_mapping[old_id] = provider_name
            
            # 插入新记录
            cursor.execute("""
                INSERT INTO ai_provider_configs (
                    id, name, provider, provider_type, base_url, api_key, proxy,
                    models, default_model, default_temperature, default_max_tokens,
                    is_active, is_default, priority, rate_limit_per_minute,
                    extra_config, description, create_time, update_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                old_id, name, provider_name, old_provider, base_url, api_key, None,
                models, default_model, default_temperature, default_max_tokens,
                is_active, is_default, priority, rate_limit_per_minute,
                extra_config, description, create_time, update_time
            ))
        
        # 7. 迁移agents数据
        print("6. 迁移agents数据...")
        cursor.execute("SELECT * FROM agents_backup")
        old_agents = cursor.fetchall()
        
        for agent in old_agents:
            agent_id, agent_uid, user_id, provider_config_id, model, top_p, temperature, \
            max_tokens, preset_messages, app_preset, is_public, is_default, create_time, update_time = agent
            
            # 查找对应的provider名称
            provider_name = None
            if provider_config_id and provider_config_id in config_mapping:
                provider_name = config_mapping[provider_config_id]
            else:
                # 如果没有找到，使用默认配置
                cursor.execute("SELECT provider FROM ai_provider_configs WHERE is_default = 1 LIMIT 1")
                result = cursor.fetchone()
                if result:
                    provider_name = result[0]
                else:
                    # 如果没有默认配置，使用第一个配置
                    cursor.execute("SELECT provider FROM ai_provider_configs ORDER BY create_time LIMIT 1")
                    result = cursor.fetchone()
                    if result:
                        provider_name = result[0]
                    else:
                        # 如果没有任何配置，创建一个默认配置
                        default_provider = "default-openai"
                        cursor.execute("""
                            INSERT INTO ai_provider_configs (
                                id, name, provider, provider_type, base_url, api_key, proxy,
                                models, default_model, default_temperature, default_max_tokens,
                                is_active, is_default, priority, rate_limit_per_minute,
                                extra_config, description, create_time, update_time
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            str(uuid.uuid4()), "默认OpenAI配置", default_provider, "openai",
                            "https://api.openai.com/v1", "your-api-key-here", None,
                            '["gpt-3.5-turbo", "gpt-4"]', "gpt-3.5-turbo", 0.7, 2000,
                            1, 1, 0, None, '{}', "默认创建的配置，请更新API密钥",
                            datetime.utcnow().isoformat(), datetime.utcnow().isoformat()
                        ))
                        provider_name = default_provider
            
            # 确保model不为空
            if not model:
                model = "gpt-3.5-turbo"  # 默认模型
            
            # 插入新的agent记录
            cursor.execute("""
                INSERT INTO agents (
                    id, agent_id, user_id, provider, model, top_p, temperature,
                    max_tokens, preset_messages, app_preset, is_public, is_default,
                    create_time, update_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, agent_uid, user_id, provider_name, model, top_p, temperature,
                max_tokens, preset_messages, app_preset, is_public, is_default,
                create_time, update_time
            ))
        
        # 8. 删除备份表（可选，保留备份表以防需要回滚）
        print("7. 保留备份表（ai_provider_configs_backup 和 agents_backup）以防需要回滚...")
        
        # 提交更改
        conn.commit()
        print("✅ 数据库迁移完成！")
        
        # 输出迁移报告
        cursor.execute("SELECT COUNT(*) FROM ai_provider_configs")
        provider_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM agents")
        agent_count = cursor.fetchone()[0]
        
        print(f"迁移统计：")
        print(f"  - AI Provider配置: {provider_count} 条")
        print(f"  - Agent: {agent_count} 条")
        print(f"  - 配置映射关系:")
        for old_id, new_name in config_mapping.items():
            print(f"    {old_id[:8]} -> {new_name}")
        
        print("\n⚠️  重要提醒：")
        print("1. 请检查所有AI Provider配置的API密钥是否正确")
        print("2. 请验证Agent的provider和model配置")
        print("3. 备份表已保留，如需回滚请手动操作")
        
    except Exception as e:
        print(f"❌ 迁移失败: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database() 