#!/usr/bin/env python3
"""
数据库迁移：从app_preset中提取avatar字段到顶层

这个迁移脚本将：
1. 为agents表添加avatar字段（如果不存在）
2. 将app_preset中的avatar数据迁移到新的avatar字段
3. 从app_preset中移除avatar字段

使用方法：
    python extract_avatar_from_app_preset.py
"""

import sqlite3
import json
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def migrate_database(db_path: str = "./blog_platform.db"):
    """执行数据库迁移"""
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()
    
    try:
        print("开始执行avatar字段提取迁移...")
        
        # 1. 检查avatar字段是否已存在
        cursor.execute("PRAGMA table_info(agents)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'avatar' not in columns:
            print("1. 为agents表添加avatar字段...")
            cursor.execute("""
                ALTER TABLE agents ADD COLUMN avatar TEXT
            """)
        else:
            print("1. avatar字段已存在，跳过添加")
        
        # 2. 查询所有需要迁移的agents
        print("2. 查询需要迁移的agents...")
        cursor.execute("""
            SELECT id, app_preset, avatar FROM agents
        """)
        agents = cursor.fetchall()
        
        migrated_count = 0
        
        # 3. 逐个迁移avatar数据
        for agent_id, app_preset_json, current_avatar in agents:
            try:
                # 解析app_preset
                app_preset = json.loads(app_preset_json) if app_preset_json else {}
                
                # 检查是否有avatar字段需要迁移
                if 'avatar' in app_preset:
                    avatar_data = app_preset['avatar']
                    
                    # 如果当前avatar字段为空或null，则迁移
                    if not current_avatar:
                        # 将avatar数据序列化为JSON字符串
                        avatar_json = json.dumps(avatar_data, ensure_ascii=False, separators=(',', ':'))
                        
                        # 更新avatar字段
                        cursor.execute("""
                            UPDATE agents SET avatar = ? WHERE id = ?
                        """, (avatar_json, agent_id))
                        
                        print(f"   迁移agent {agent_id}的avatar数据: {avatar_data}")
                        migrated_count += 1
                    
                    # 从app_preset中移除avatar字段
                    del app_preset['avatar']
                    
                    # 更新app_preset
                    updated_app_preset = json.dumps(app_preset, ensure_ascii=False, separators=(',', ':'))
                    cursor.execute("""
                        UPDATE agents SET app_preset = ? WHERE id = ?
                    """, (updated_app_preset, agent_id))
                    
                    print(f"   从agent {agent_id}的app_preset中移除avatar字段")
                
            except json.JSONDecodeError as e:
                print(f"   警告：解析agent {agent_id}的app_preset失败: {e}")
                continue
            except Exception as e:
                print(f"   错误：迁移agent {agent_id}失败: {e}")
                continue
        
        # 4. 提交事务
        conn.commit()
        
        print(f"迁移完成!")
        print(f"- 总共处理了 {len(agents)} 个agents")
        print(f"- 成功迁移了 {migrated_count} 个agents的avatar数据")
        
    except Exception as e:
        print(f"迁移失败: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def verify_migration(db_path: str = "./blog_platform.db"):
    """验证迁移结果"""
    print("\n验证迁移结果...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查avatar字段
        cursor.execute("PRAGMA table_info(agents)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'avatar' in columns:
            print("✓ avatar字段已存在")
        else:
            print("✗ avatar字段不存在")
            return False
        
        # 检查有avatar数据的agents
        cursor.execute("""
            SELECT COUNT(*) FROM agents WHERE avatar IS NOT NULL AND avatar != ''
        """)
        avatar_count = cursor.fetchone()[0]
        print(f"✓ 有 {avatar_count} 个agents包含avatar数据")
        
        # 检查app_preset中是否还有avatar字段
        cursor.execute("""
            SELECT id, app_preset FROM agents WHERE app_preset LIKE '%"avatar"%'
        """)
        remaining_avatars = cursor.fetchall()
        
        if remaining_avatars:
            print(f"✗ 仍有 {len(remaining_avatars)} 个agents的app_preset中包含avatar字段")
            for agent_id, app_preset in remaining_avatars[:3]:  # 只显示前3个
                print(f"   Agent {agent_id}: {app_preset}")
        else:
            print("✓ 所有app_preset中的avatar字段已清理")
        
        return True
        
    except Exception as e:
        print(f"验证失败: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    # 检查命令行参数
    db_path = sys.argv[1] if len(sys.argv) > 1 else "./blog_platform.db"
    
    print("Avatar字段提取迁移脚本")
    print("=" * 50)
    print(f"数据库路径: {db_path}")
    
    # 执行迁移
    migrate_database(db_path)
    
    # 验证迁移
    verify_migration(db_path)
    
    print("\n迁移完成!") 