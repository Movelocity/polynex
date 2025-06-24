"""
将request_messages字段从JSON类型转换为TEXT类型的数据库迁移脚本
解决中文字符Unicode转义问题

运行方式: python migrations/convert_request_messages_to_text.py
"""

import sys
import os
import json
import re
from typing import Any, Dict, List
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models.database import SessionLocal
from constants.config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def backup_database():
    """备份数据库"""
    import shutil
    
    settings = get_settings()
    if settings.database_url.startswith("sqlite:///"):
        # SQLite数据库备份
        db_file = settings.database_url.replace("sqlite:///", "")
        if db_file.startswith("./"):
            db_file = db_file[2:]
        
        if os.path.exists(db_file):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"{db_file}.backup_{timestamp}"
            shutil.copy2(db_file, backup_file)
            logger.info(f"数据库已备份到: {backup_file}")
            return backup_file
    
    return None


def decode_unicode_escapes(obj: Any) -> Any:
    """
    递归解码JSON对象中的Unicode转义字符
    
    Args:
        obj: 要处理的对象（可以是字符串、列表、字典等）
        
    Returns:
        解码后的对象
    """
    if isinstance(obj, str):
        # 使用正则表达式找到所有\uxxxx格式的Unicode转义序列
        def decode_match(match):
            return match.group(0).encode().decode('unicode_escape')
        
        # 解码Unicode转义字符
        try:
            return re.sub(r'\\u[0-9a-fA-F]{4}', decode_match, obj)
        except (UnicodeDecodeError, ValueError):
            return obj
    elif isinstance(obj, dict):
        return {key: decode_unicode_escapes(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [decode_unicode_escapes(item) for item in obj]
    else:
        return obj


def convert_request_messages_field():
    """转换request_messages字段类型并处理数据"""
    logger.info("开始转换request_messages字段...")
    
    db = SessionLocal()
    
    try:
        # 检查表是否存在
        inspector = inspect(db.bind)
        if not inspector.has_table('llm_request_logs'):
            logger.warning("表 llm_request_logs 不存在，跳过迁移")
            return
        
        # 获取现有的列信息
        columns = inspector.get_columns('llm_request_logs')
        request_messages_column = None
        for col in columns:
            if col['name'] == 'request_messages':
                request_messages_column = col
                break
        
        if not request_messages_column:
            logger.warning("字段 request_messages 不存在，跳过迁移")
            return
        
        logger.info(f"当前request_messages字段类型: {request_messages_column['type']}")
        
        # 获取所有现有记录
        result = db.execute(text("SELECT id, request_messages FROM llm_request_logs WHERE request_messages IS NOT NULL"))
        records = result.fetchall()
        
        logger.info(f"找到 {len(records)} 条记录需要处理")
        
        # 创建临时表存储转换后的数据
        temp_data = {}
        
        for record in records:
            record_id = record[0]
            json_data = record[1]
            
            try:
                # 如果是字符串，尝试解析为JSON
                if isinstance(json_data, str):
                    try:
                        parsed_data = json.loads(json_data)
                    except json.JSONDecodeError:
                        # 如果解析失败，可能已经是纯文本
                        parsed_data = json_data
                else:
                    parsed_data = json_data
                
                # 解码Unicode转义字符
                decoded_data = decode_unicode_escapes(parsed_data)
                
                # 重新序列化为JSON字符串，确保中文不被转义
                json_str = json.dumps(decoded_data, ensure_ascii=False, separators=(',', ':'))
                temp_data[record_id] = json_str
                
                logger.debug(f"处理记录 {record_id}: 原始长度 {len(str(json_data))}, 转换后长度 {len(json_str)}")
                
            except Exception as e:
                logger.error(f"处理记录 {record_id} 时出错: {str(e)}")
                # 保持原始数据
                temp_data[record_id] = str(json_data)
        
        # 简化的SQLite转换方法
        db_url = str(db.bind.url)
        
        if 'sqlite' in db_url:
            logger.info("使用简化的SQLite转换方法...")
            
            try:
                # 1. 创建新表
                db.execute(text("""
                    CREATE TABLE llm_request_logs_new (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        conversation_id TEXT,
                        agent_id TEXT,
                        provider_config_id TEXT NOT NULL,
                        model TEXT NOT NULL,
                        temperature REAL,
                        max_tokens INTEGER,
                        stream BOOLEAN DEFAULT 0,
                        request_messages TEXT NOT NULL,
                        request_params TEXT,
                        response_content TEXT,
                        finish_reason TEXT,
                        prompt_tokens INTEGER,
                        completion_tokens INTEGER,
                        total_tokens INTEGER,
                        estimated_cost NUMERIC(10, 6),
                        start_time DATETIME NOT NULL,
                        end_time DATETIME,
                        duration_ms INTEGER,
                        status TEXT NOT NULL DEFAULT 'pending',
                        error_message TEXT,
                        extra_metadata TEXT
                    )
                """))
                logger.info("创建新表结构")
                
                # 2. 复制数据到新表，同时转换request_messages字段
                for record_id, converted_json in temp_data.items():
                    # 获取原始记录的所有字段
                    original_record = db.execute(
                        text("SELECT * FROM llm_request_logs WHERE id = :id"),
                        {"id": record_id}
                    ).fetchone()
                    
                    if original_record:
                        # 插入到新表，使用转换后的request_messages
                        insert_sql = """
                            INSERT INTO llm_request_logs_new (
                                id, user_id, conversation_id, agent_id, provider_config_id,
                                model, temperature, max_tokens, stream, request_messages,
                                request_params, response_content, finish_reason,
                                prompt_tokens, completion_tokens, total_tokens, estimated_cost,
                                start_time, end_time, duration_ms, status, error_message, extra_metadata
                            ) VALUES (
                                :id, :user_id, :conversation_id, :agent_id, :provider_config_id,
                                :model, :temperature, :max_tokens, :stream, :request_messages,
                                :request_params, :response_content, :finish_reason,
                                :prompt_tokens, :completion_tokens, :total_tokens, :estimated_cost,
                                :start_time, :end_time, :duration_ms, :status, :error_message, :extra_metadata
                            )
                        """
                        
                        # 准备参数，request_messages使用转换后的值
                        params = {
                            'id': original_record[0],
                            'user_id': original_record[1],
                            'conversation_id': original_record[2],
                            'agent_id': original_record[3],
                            'provider_config_id': original_record[4],
                            'model': original_record[5],
                            'temperature': original_record[6],
                            'max_tokens': original_record[7],
                            'stream': original_record[8],
                            'request_messages': converted_json,  # 使用转换后的JSON
                            'request_params': original_record[10],
                            'response_content': original_record[11],
                            'finish_reason': original_record[12],
                            'prompt_tokens': original_record[13],
                            'completion_tokens': original_record[14],
                            'total_tokens': original_record[15],
                            'estimated_cost': original_record[16],
                            'start_time': original_record[17],
                            'end_time': original_record[18],
                            'duration_ms': original_record[19],
                            'status': original_record[20],
                            'error_message': original_record[21],
                            'extra_metadata': original_record[22]
                        }
                        
                        db.execute(text(insert_sql), params)
                
                logger.info(f"数据迁移完成，处理了 {len(temp_data)} 条记录")
                
                # 3. 删除旧表并重命名新表
                db.execute(text("DROP TABLE llm_request_logs"))
                db.execute(text("ALTER TABLE llm_request_logs_new RENAME TO llm_request_logs"))
                
                logger.info("表结构转换完成")
                
            except Exception as e:
                logger.error(f"SQLite表结构转换失败: {str(e)}")
                # 清理可能的新表
                try:
                    db.execute(text("DROP TABLE IF EXISTS llm_request_logs_new"))
                except:
                    pass
                raise
        
        else:
            # 非SQLite数据库（如PostgreSQL, MySQL）
            logger.info("检测到非SQLite数据库，使用ALTER COLUMN方法...")
            
            # 先更新所有数据
            for record_id, json_str in temp_data.items():
                db.execute(
                    text("UPDATE llm_request_logs SET request_messages = :json_str WHERE id = :record_id"),
                    {"json_str": json_str, "record_id": record_id}
                )
            
            # 然后改变列类型
            db.execute(text("ALTER TABLE llm_request_logs ALTER COLUMN request_messages TYPE TEXT"))
            logger.info("字段类型转换完成")
        
        # 提交更改
        db.commit()
        logger.info("✅ request_messages字段转换完成！")
        
        # 验证转换结果
        result = db.execute(text("SELECT id, request_messages FROM llm_request_logs LIMIT 3"))
        sample_records = result.fetchall()
        
        logger.info("验证转换结果:")
        for record in sample_records:
            record_id = record[0]
            request_messages = record[1]
            
            try:
                # 尝试解析JSON
                parsed = json.loads(request_messages)
                logger.info(f"记录 {record_id}: JSON解析成功，包含 {len(parsed)} 个消息")
                
                # 检查中文字符
                json_str = json.dumps(parsed, ensure_ascii=False)
                if '\\u' in json_str:
                    logger.warning(f"记录 {record_id}: 仍包含Unicode转义字符")
                else:
                    logger.info(f"记录 {record_id}: 中文字符显示正常")
                    
            except json.JSONDecodeError as e:
                logger.error(f"记录 {record_id}: JSON解析失败 - {str(e)}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 转换失败: {str(e)}")
        raise
    finally:
        db.close()


def rollback_migration():
    """回滚迁移（如果需要）"""
    logger.info("开始回滚迁移...")
    
    db = SessionLocal()
    
    try:
        # 检查表是否存在
        inspector = inspect(db.bind)
        if not inspector.has_table('llm_request_logs'):
            logger.warning("表 llm_request_logs 不存在，无法回滚")
            return
        
        # 对于SQLite，需要重建表
        db_url = str(db.bind.url)
        
        if 'sqlite' in db_url:
            logger.info("SQLite数据库回滚: 将TEXT字段改回JSON类型...")
            
            # 获取当前表结构
            result = db.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='llm_request_logs'"))
            create_sql = result.fetchone()[0]
            
            # 创建回滚表
            rollback_create_sql = create_sql.replace(
                'request_messages TEXT NOT NULL',
                'request_messages JSON NOT NULL'
            ).replace(
                'llm_request_logs',
                'llm_request_logs_rollback'
            )
            
            db.execute(text(rollback_create_sql))
            
            # 复制数据
            db.execute(text("""
                INSERT INTO llm_request_logs_rollback 
                SELECT * FROM llm_request_logs
            """))
            
            # 替换表
            db.execute(text("DROP TABLE llm_request_logs"))
            db.execute(text("ALTER TABLE llm_request_logs_rollback RENAME TO llm_request_logs"))
            
        else:
            # 非SQLite数据库
            db.execute(text("ALTER TABLE llm_request_logs ALTER COLUMN request_messages TYPE JSON"))
        
        db.commit()
        logger.info("✅ 回滚完成")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 回滚失败: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='request_messages字段类型转换迁移脚本')
    parser.add_argument('--rollback', action='store_true', help='回滚迁移')
    
    args = parser.parse_args()
    
    try:
        if args.rollback:
            logger.info("=== 开始回滚request_messages字段转换 ===")
            rollback_migration()
        else:
            logger.info("=== 开始转换request_messages字段类型 ===")
            
            # 备份数据库
            backup_file = backup_database()
            if backup_file:
                logger.info(f"数据库备份完成: {backup_file}")
            
            # 运行转换
            convert_request_messages_field()
        
        logger.info("=== 操作完成 ===")
        
    except KeyboardInterrupt:
        logger.info("操作被用户中断")
        sys.exit(1)
    except Exception as e:
        logger.error(f"操作失败: {str(e)}")
        sys.exit(1) 