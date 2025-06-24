#!/usr/bin/env python3
"""
去除AI供应商配置中的provider字段的数据库迁移脚本

将provider字段的功能合并到name字段中，name字段将成为唯一标识符
"""

import sqlite3
import sys
import os
from datetime import datetime

def migrate_database(db_path: str = "./blog_platform.db"):
    """执行数据库迁移"""
    
    if not os.path.exists(db_path):
        print(f"❌ 数据库文件不存在: {db_path}")
        return False
    
    # 备份数据库
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"✅ 数据库已备份到: {backup_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("开始数据库迁移...")
        
        # 1. 检查数据完整性：确保name字段没有重复值
        print("1. 检查name字段唯一性...")
        cursor.execute("""
            SELECT name, COUNT(*) as count 
            FROM ai_provider_configs 
            GROUP BY name 
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        
        if duplicates:
            print("❌ 发现重复的name值:")
            for name, count in duplicates:
                print(f"  - '{name}': {count}个重复")
            print("请先解决name字段的重复问题再进行迁移")
            return False
        
        # 2. 更新agents表中的provider字段，确保它指向正确的name值
        print("2. 更新agents表中的provider引用...")
        
        # 获取所有agent记录
        cursor.execute("SELECT id, provider FROM agents")
        agents = cursor.fetchall()
        
        for agent_id, agent_provider in agents:
            # 查找对应的ai_provider_config记录
            cursor.execute("""
                SELECT name FROM ai_provider_configs 
                WHERE provider = ?
            """, (agent_provider,))
            result = cursor.fetchone()
            
            if result:
                config_name = result[0]
                # 更新agent的provider字段为对应的name值
                cursor.execute("""
                    UPDATE agents 
                    SET provider = ? 
                    WHERE id = ?
                """, (config_name, agent_id))
                print(f"  - 更新agent {agent_id}: {agent_provider} -> {config_name}")
            else:
                print(f"⚠️  警告: agent {agent_id} 引用的provider '{agent_provider}' 未找到对应配置")
        
        # 3. 备份原ai_provider_configs表
        print("3. 备份原ai_provider_configs表...")
        cursor.execute("""
            CREATE TABLE ai_provider_configs_backup AS 
            SELECT * FROM ai_provider_configs
        """)
        
        # 4. 创建新的ai_provider_configs表（去除provider字段，name字段设为unique）
        print("4. 创建新的ai_provider_configs表...")
        cursor.execute("DROP TABLE ai_provider_configs")
        
        cursor.execute("""
            CREATE TABLE ai_provider_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
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
        
        # 5. 迁移数据到新表（不包含provider字段）
        print("5. 迁移数据到新表...")
        cursor.execute("""
            INSERT INTO ai_provider_configs (
                id, name, provider_type, base_url, api_key, proxy,
                models, default_model, default_temperature, default_max_tokens,
                is_active, is_default, priority, rate_limit_per_minute,
                extra_config, description, create_time, update_time
            )
            SELECT 
                id, name, provider_type, base_url, api_key, proxy,
                models, default_model, default_temperature, default_max_tokens,
                is_active, is_default, priority, rate_limit_per_minute,
                extra_config, description, create_time, update_time
            FROM ai_provider_configs_backup
        """)
        
        # 6. 验证迁移结果
        print("6. 验证迁移结果...")
        cursor.execute("SELECT COUNT(*) FROM ai_provider_configs")
        new_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM ai_provider_configs_backup")
        old_count = cursor.fetchone()[0]
        
        if new_count != old_count:
            raise Exception(f"数据迁移失败: 原始记录数 {old_count}，迁移后记录数 {new_count}")
        
        print(f"✅ 成功迁移 {new_count} 条记录")
        
        # 7. 清理备份表
        print("7. 清理备份表...")
        cursor.execute("DROP TABLE ai_provider_configs_backup")
        
        conn.commit()
        conn.close()
        
        print("✅ 数据库迁移完成！")
        print("\n变更说明:")
        print("- 去除了ai_provider_configs表中的provider字段")
        print("- name字段现在是唯一标识符")
        print("- agents表中的provider字段现在引用ai_provider_configs.name")
        
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        
        # 恢复备份
        if os.path.exists(backup_path):
            print(f"正在从备份恢复数据库...")
            shutil.copy2(backup_path, db_path)
            print(f"✅ 数据库已从备份恢复")
        
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "./blog_platform.db"
    success = migrate_database(db_path)
    sys.exit(0 if success else 1) 