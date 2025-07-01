#!/usr/bin/env python3
"""
数据库迁移脚本：Agent表主键迁移

将Agent表的主键从id改为agent_id，并处理相关的外键引用。

迁移步骤：
1. 检查数据一致性
2. 检查当前外键状态
3. 修改Agent表结构：删除id字段，设置agent_id为主键
4. 重新建立外键约束（如果需要）

注意：在生产环境中运行前请先备份数据库！
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.database import DatabaseManager
from constants import get_settings
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_type():
    """检测数据库类型"""
    database_url = get_settings().database_url
    if 'sqlite' in database_url:
        return 'sqlite'
    elif 'mysql' in database_url:
        return 'mysql'
    elif 'postgresql' in database_url:
        return 'postgresql'
    else:
        return 'unknown'

def check_current_state():
    """检查当前数据库状态"""
    logger.info("检查当前数据库状态...")
    db_type = get_database_type()
    logger.info(f"检测到数据库类型: {db_type}")
    
    with DatabaseManager() as db:
        # 检查agents表结构
        if db_type == 'sqlite':
            result = db.execute(text("PRAGMA table_info(agents)")).fetchall()
            columns = [row[1] for row in result]  # SQLite中列名在第二列
        else:
            result = db.execute(text("DESCRIBE agents")).fetchall()
            columns = [row[0] for row in result]
        logger.info(f"agents表当前列: {columns}")
        
        # 检查llm_request_logs表的agent_id字段引用情况
        # 先检查是否引用agents.agent_id
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM llm_request_logs l
            LEFT JOIN agents a ON l.agent_id = a.agent_id
            WHERE l.agent_id IS NOT NULL AND a.agent_id IS NULL
        """)).fetchone()
        missing_agent_id_refs = result.count
        
        # 再检查是否引用agents.id
        if 'id' in columns:
            result = db.execute(text("""
                SELECT COUNT(*) as count
                FROM llm_request_logs l
                LEFT JOIN agents a ON l.agent_id = a.id
                WHERE l.agent_id IS NOT NULL AND a.id IS NULL
            """)).fetchone()
            missing_id_refs = result.count
        else:
            missing_id_refs = 0  # id列不存在
        
        # 检查llm_request_logs中agent_id的格式
        result = db.execute(text("""
            SELECT agent_id FROM llm_request_logs 
            WHERE agent_id IS NOT NULL 
            LIMIT 5
        """)).fetchall()
        sample_agent_ids = [row.agent_id for row in result]
        logger.info(f"llm_request_logs中agent_id示例: {sample_agent_ids}")
        
        # 检查agents中id和agent_id的格式
        if 'id' in columns:
            result = db.execute(text("""
                SELECT id, agent_id FROM agents LIMIT 3
            """)).fetchall()
            logger.info("agents表中id和agent_id示例:")
            for row in result:
                logger.info(f"  id: {row.id}, agent_id: {row.agent_id}")
        else:
            result = db.execute(text("""
                SELECT agent_id FROM agents LIMIT 3
            """)).fetchall()
            logger.info("agents表中agent_id示例:")
            for row in result:
                logger.info(f"  agent_id: {row.agent_id}")
        
        logger.info(f"llm_request_logs中找不到对应agents.agent_id的记录: {missing_agent_id_refs}")
        logger.info(f"llm_request_logs中找不到对应agents.id的记录: {missing_id_refs}")
        
        return {
            'db_type': db_type,
            'columns': columns,
            'missing_agent_id_refs': missing_agent_id_refs,
            'missing_id_refs': missing_id_refs,
            'sample_agent_ids': sample_agent_ids
        }

def check_data_consistency():
    """检查数据一致性"""
    logger.info("检查数据一致性...")
    
    state = check_current_state()
    
    # 判断当前llm_request_logs.agent_id引用的是哪个字段
    if state['missing_agent_id_refs'] == 0 and state['missing_id_refs'] > 0:
        logger.info("✅ llm_request_logs.agent_id 当前引用的是 agents.agent_id")
        current_ref_type = "agent_id"
    elif state['missing_id_refs'] == 0 and state['missing_agent_id_refs'] > 0:
        logger.info("ℹ️  llm_request_logs.agent_id 当前引用的是 agents.id，需要迁移")
        current_ref_type = "id"
    elif 'id' not in state['columns']:
        logger.info("✅ agents表已经没有id列，数据库已迁移")
        current_ref_type = "agent_id"
    else:
        logger.error(f"数据状态异常: missing_agent_id_refs={state['missing_agent_id_refs']}, missing_id_refs={state['missing_id_refs']}")
        return False, None
    
    with DatabaseManager() as db:
        # 检查Agent表是否有重复的agent_id
        result = db.execute(text("""
            SELECT agent_id, COUNT(*) as count
            FROM agents
            GROUP BY agent_id
            HAVING COUNT(*) > 1
        """)).fetchall()
        
        if result:
            logger.error(f"发现重复的agent_id: {[row.agent_id for row in result]}")
            return False, None
        
        # 检查是否有agent_id为NULL的记录
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM agents
            WHERE agent_id IS NULL
        """)).fetchone()
        
        if result.count > 0:
            logger.error(f"发现 {result.count} 条Agent记录的agent_id为NULL")
            return False, None
    
    logger.info("数据一致性检查通过")
    return True, current_ref_type

def migrate_llm_request_logs():
    """迁移LLMRequestLog表中的agent_id字段（仅在需要时）"""
    logger.info("开始迁移LLMRequestLog表...")
    
    with DatabaseManager() as db:
        # 创建临时列来存储新的agent_id
        logger.info("添加临时列...")
        try:
            db.execute(text("ALTER TABLE llm_request_logs ADD COLUMN agent_id_new VARCHAR(100)"))
        except Exception as e:
            if "Duplicate column name" in str(e):
                logger.info("临时列已存在，删除后重新创建...")
                db.execute(text("ALTER TABLE llm_request_logs DROP COLUMN agent_id_new"))
                db.execute(text("ALTER TABLE llm_request_logs ADD COLUMN agent_id_new VARCHAR(100)"))
            else:
                raise
        
        # 更新临时列，将原来指向agents.id的值改为指向agents.agent_id
        logger.info("更新临时列数据...")
        result = db.execute(text("""
            UPDATE llm_request_logs 
            SET agent_id_new = (
                SELECT a.agent_id 
                FROM agents a 
                WHERE a.id = llm_request_logs.agent_id
            )
            WHERE agent_id IS NOT NULL
        """))
        logger.info(f"更新了 {result.rowcount} 条记录")
        
        # 验证更新结果
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM llm_request_logs
            WHERE agent_id IS NOT NULL AND agent_id_new IS NULL
        """)).fetchone()
        
        if result.count > 0:
            logger.error(f"有 {result.count} 条记录更新失败")
            raise Exception("LLMRequestLog迁移失败")
        
        db.commit()
        logger.info("LLMRequestLog表迁移完成")

def check_foreign_key_constraint():
    """检查并删除外键约束"""
    logger.info("检查外键约束...")
    db_type = get_database_type()
    
    with DatabaseManager() as db:
        if db_type == 'sqlite':
            # SQLite处理外键约束不同
            logger.info("SQLite数据库，检查外键约束...")
            # 获取表的创建语句来检查外键
            result = db.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='llm_request_logs'")).fetchone()
            if result and result.sql:
                create_sql = result.sql
                logger.info(f"llm_request_logs表创建语句: {create_sql}")
                if 'FOREIGN KEY' in create_sql.upper() and 'agents' in create_sql:
                    logger.info("检测到外键约束，SQLite需要重建表来修改外键")
                    return ['sqlite_fk']
                else:
                    logger.info("未检测到相关外键约束")
                    return []
            return []
        else:
            # MySQL/PostgreSQL处理方式
            result = db.execute(text("""
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'llm_request_logs'
                AND COLUMN_NAME = 'agent_id'
                AND REFERENCED_TABLE_NAME = 'agents'
            """)).fetchall()
            
            constraint_names = [row.CONSTRAINT_NAME for row in result]
            logger.info(f"找到外键约束: {constraint_names}")
            
            for constraint_name in constraint_names:
                logger.info(f"删除外键约束: {constraint_name}")
                db.execute(text(f"ALTER TABLE llm_request_logs DROP FOREIGN KEY {constraint_name}"))
            
            if constraint_names:
                db.commit()
                logger.info("外键约束删除完成")
            else:
                logger.info("未找到需要删除的外键约束")
            
            return constraint_names

def modify_agent_table():
    """修改Agent表结构"""
    logger.info("开始修改Agent表结构...")
    db_type = get_database_type()
    
    with DatabaseManager() as db:
        # 检查当前表结构
        if db_type == 'sqlite':
            result = db.execute(text("PRAGMA table_info(agents)")).fetchall()
            columns = [row[1] for row in result]
            # 检查主键
            pk_result = db.execute(text("PRAGMA table_info(agents)")).fetchall()
            primary_keys = [row[1] for row in pk_result if row[5] == 1]  # pk字段为1表示主键
        else:
            result = db.execute(text("DESCRIBE agents")).fetchall()
            columns = [row[0] for row in result]
            # 检查主键
            result = db.execute(text("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'agents'
                AND CONSTRAINT_NAME = 'PRIMARY'
            """)).fetchone()
            primary_keys = [result.COLUMN_NAME] if result else []
        
        current_primary_key = primary_keys[0] if primary_keys else None
        logger.info(f"当前主键: {current_primary_key}")
        logger.info(f"当前列: {columns}")
        
        if db_type == 'sqlite':
            # SQLite需要重建表来修改主键
            if current_primary_key != 'agent_id' or 'id' in columns:
                logger.info("SQLite数据库需要重建表来修改主键...")
                
                # 1. 创建新表
                logger.info("创建新的agents表...")
                db.execute(text("""
                    CREATE TABLE agents_new (
                        agent_id VARCHAR(100) PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        provider VARCHAR(100) NOT NULL,
                        model VARCHAR(100) NOT NULL,
                        top_p REAL,
                        temperature REAL,
                        max_tokens INTEGER,
                        preset_messages TEXT,
                        app_preset TEXT,
                        avatar TEXT,
                        is_public BOOLEAN NOT NULL DEFAULT 0,
                        is_default BOOLEAN NOT NULL DEFAULT 0,
                        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                
                # 2. 复制数据
                logger.info("复制数据到新表...")
                copy_columns = [col for col in columns if col != 'id']
                columns_str = ', '.join(copy_columns)
                db.execute(text(f"""
                    INSERT INTO agents_new ({columns_str})
                    SELECT {columns_str} FROM agents
                """))
                
                # 3. 删除旧表
                logger.info("删除旧表...")
                db.execute(text("DROP TABLE agents"))
                
                # 4. 重命名新表
                logger.info("重命名新表...")
                db.execute(text("ALTER TABLE agents_new RENAME TO agents"))
                
                db.commit()
                logger.info("SQLite表重建完成")
            else:
                logger.info("SQLite表结构已正确，无需修改")
        else:
            # MySQL/PostgreSQL处理方式
            if current_primary_key == 'id':
                # 删除原来的主键约束
                logger.info("删除原有主键约束...")
                db.execute(text("ALTER TABLE agents DROP PRIMARY KEY"))
                
                # 设置agent_id为主键
                logger.info("设置agent_id为主键...")
                db.execute(text("ALTER TABLE agents ADD PRIMARY KEY (agent_id)"))
                
                # 删除id列
                logger.info("删除id列...")
                db.execute(text("ALTER TABLE agents DROP COLUMN id"))
                
                db.commit()
                logger.info("Agent表结构修改完成")
            elif current_primary_key == 'agent_id':
                logger.info("agent_id已经是主键，检查是否需要删除id列...")
                
                if 'id' in columns:
                    logger.info("删除多余的id列...")
                    db.execute(text("ALTER TABLE agents DROP COLUMN id"))
                    db.commit()
                    logger.info("id列删除完成")
                else:
                    logger.info("id列已经不存在，无需删除")
            else:
                logger.warning(f"未预期的主键状态: {current_primary_key}")

def finalize_llm_request_logs(needs_migration=False):
    """完成LLMRequestLog表的迁移"""
    if not needs_migration:
        logger.info("LLMRequestLog表已经正确配置，无需迁移")
        return
        
    logger.info("完成LLMRequestLog表迁移...")
    
    with DatabaseManager() as db:
        # 删除旧的agent_id列
        logger.info("删除旧的agent_id列...")
        db.execute(text("ALTER TABLE llm_request_logs DROP COLUMN agent_id"))
        
        # 重命名新列
        logger.info("重命名agent_id_new列...")
        db.execute(text("ALTER TABLE llm_request_logs RENAME COLUMN agent_id_new TO agent_id"))
        
        db.commit()
        logger.info("LLMRequestLog表字段迁移完成")

def establish_foreign_key():
    """重新建立外键约束"""
    logger.info("重新建立外键约束...")
    db_type = get_database_type()
    
    with DatabaseManager() as db:
        if db_type == 'sqlite':
            # SQLite的外键支持需要启用
            db.execute(text("PRAGMA foreign_keys = ON"))
            logger.info("SQLite外键支持已启用")
            # 注意：SQLite中外键约束是在表创建时定义的，运行时添加较复杂
            # 如果需要，可以重建llm_request_logs表
        else:
            # 检查是否已存在外键约束
            result = db.execute(text("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'llm_request_logs'
                AND COLUMN_NAME = 'agent_id'
                AND REFERENCED_TABLE_NAME = 'agents'
                AND REFERENCED_COLUMN_NAME = 'agent_id'
            """)).fetchone()
            
            if result.count > 0:
                logger.info("外键约束已存在，无需重新创建")
                return
            
            # 重新建立外键约束
            logger.info("创建新的外键约束...")
            db.execute(text("""
                ALTER TABLE llm_request_logs 
                ADD CONSTRAINT fk_llm_request_logs_agent_id 
                FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
            """))
            
            db.commit()
            logger.info("外键约束创建完成")

def verify_migration():
    """验证迁移结果"""
    logger.info("验证迁移结果...")
    db_type = get_database_type()
    
    with DatabaseManager() as db:
        # 检查Agent表结构
        if db_type == 'sqlite':
            result = db.execute(text("PRAGMA table_info(agents)")).fetchall()
            columns = [row[1] for row in result]
            # 检查主键
            pk_result = db.execute(text("PRAGMA table_info(agents)")).fetchall()
            primary_keys = [row[1] for row in pk_result if row[5] == 1]
            current_primary_key = primary_keys[0] if primary_keys else None
        else:
            result = db.execute(text("DESCRIBE agents")).fetchall()
            columns = [row[0] for row in result]
            # 检查主键
            result = db.execute(text("""
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'agents'
                AND CONSTRAINT_NAME = 'PRIMARY'
            """)).fetchone()
            current_primary_key = result.COLUMN_NAME if result else None
        
        if 'id' in columns:
            logger.error("Agent表仍然包含id列")
            return False
        
        if 'agent_id' not in columns:
            logger.error("Agent表缺少agent_id列")
            return False
        
        if current_primary_key != 'agent_id':
            logger.error(f"Agent表的主键不是agent_id，而是: {current_primary_key}")
            return False
        
        # 检查数据完整性
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM llm_request_logs l
            LEFT JOIN agents a ON l.agent_id = a.agent_id
            WHERE l.agent_id IS NOT NULL AND a.agent_id IS NULL
        """)).fetchone()
        
        if result.count > 0:
            logger.error(f"发现 {result.count} 条数据完整性问题")
            return False
    
    logger.info("迁移验证通过")
    return True

def main():
    """主迁移函数"""
    logger.info("开始Agent表主键迁移...")
    
    try:
        # 1. 检查数据一致性和当前状态
        is_consistent, ref_type = check_data_consistency()
        if not is_consistent:
            logger.error("数据一致性检查失败，终止迁移")
            return False
        
        needs_data_migration = (ref_type == "id")
        logger.info(f"是否需要数据迁移: {needs_data_migration}")
        
        # 2. 迁移LLMRequestLog表（如果需要）
        if needs_data_migration:
            migrate_llm_request_logs()
        
        # 3. 检查并删除外键约束
        constraint_names = check_foreign_key_constraint()
        
        # 4. 修改Agent表结构
        modify_agent_table()
        
        # 5. 完成LLMRequestLog表迁移（如果需要）
        if needs_data_migration:
            finalize_llm_request_logs(True)
        
        # 6. 重新建立外键约束
        establish_foreign_key()
        
        # 7. 验证迁移结果
        if not verify_migration():
            logger.error("迁移验证失败")
            return False
        
        logger.info("迁移完成！")
        return True
        
    except Exception as e:
        logger.error(f"迁移过程中发生错误: {str(e)}")
        logger.error("请检查数据库状态，可能需要从备份恢复")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Agent表主键迁移工具')
    parser.add_argument('--check-only', action='store_true', help='仅检查数据一致性，不执行迁移')
    parser.add_argument('--verify-only', action='store_true', help='仅验证迁移结果')
    parser.add_argument('--status', action='store_true', help='检查当前数据库状态')
    
    args = parser.parse_args()
    
    if args.status:
        check_current_state()
        sys.exit(0)
    elif args.check_only:
        is_consistent, ref_type = check_data_consistency()
        sys.exit(0 if is_consistent else 1)
    elif args.verify_only:
        success = verify_migration()
        sys.exit(0 if success else 1)
    else:
        success = main()
        sys.exit(0 if success else 1) 