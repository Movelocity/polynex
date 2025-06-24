"""
修复JSON字段中Unicode转义的中文字符数据库迁移脚本
运行方式: python migrations/fix_unicode_json_data.py
"""

import sys
import os
import json
import re
from typing import Any, Dict, List

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.database import (
    LLMRequestLog, Blog, Conversation, AIProviderConfig, Agent,
    SessionLocal, engine
)
from constants.config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


def fix_json_field(db, table_name: str, field_name: str, id_field: str = "id"):
    """
    修复指定表中JSON字段的Unicode转义问题
    
    Args:
        db: 数据库会话
        table_name: 表名
        field_name: JSON字段名
        id_field: ID字段名
    """
    logger.info(f"开始修复表 {table_name} 的字段 {field_name}")
    
    # 查询所有记录
    result = db.execute(text(f"SELECT {id_field}, {field_name} FROM {table_name} WHERE {field_name} IS NOT NULL"))
    records = result.fetchall()
    
    updated_count = 0
    
    for record in records:
        record_id = record[0]
        json_data = record[1]
        
        if not json_data:
            continue
            
        try:
            # 尝试解析JSON数据
            if isinstance(json_data, str):
                parsed_data = json.loads(json_data)
            else:
                parsed_data = json_data
            
            # 解码Unicode转义字符
            decoded_data = decode_unicode_escapes(parsed_data)
            
            # 检查是否有变化
            original_json = json.dumps(parsed_data, ensure_ascii=False, separators=(',', ':'))
            decoded_json = json.dumps(decoded_data, ensure_ascii=False, separators=(',', ':'))
            
            if original_json != decoded_json:
                # 更新数据库
                update_query = text(f"UPDATE {table_name} SET {field_name} = :json_data WHERE {id_field} = :record_id")
                db.execute(update_query, {
                    'json_data': decoded_json,
                    'record_id': record_id
                })
                updated_count += 1
                logger.debug(f"更新记录 {record_id}: {field_name}")
                
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            logger.warning(f"处理记录 {record_id} 时出错: {str(e)}")
            continue
    
    logger.info(f"表 {table_name} 字段 {field_name} 修复完成，共更新 {updated_count} 条记录")
    return updated_count


def run_migration():
    """运行迁移脚本"""
    logger.info("开始修复JSON字段中的Unicode转义字符...")
    
    db = SessionLocal()
    total_updated = 0
    
    try:
        # 需要修复的表和字段映射
        tables_to_fix = [
            ("llm_request_logs", "request_messages"),
            ("llm_request_logs", "request_params"),
            ("llm_request_logs", "extra_metadata"),
            ("conversations", "messages"),
            ("ai_provider_configs", "proxy"),
            ("ai_provider_configs", "models"),
            ("ai_provider_configs", "extra_config"),
            ("agents", "preset_messages"),
            ("agents", "app_preset"),
            ("blogs", "tags"),
        ]
        
        for table_name, field_name in tables_to_fix:
            try:
                updated_count = fix_json_field(db, table_name, field_name)
                total_updated += updated_count
            except Exception as e:
                logger.error(f"修复表 {table_name} 字段 {field_name} 时出错: {str(e)}")
                continue
        
        # 提交所有更改
        db.commit()
        logger.info(f"✅ 迁移完成！总共更新了 {total_updated} 个字段")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 迁移失败: {str(e)}")
        raise
    finally:
        db.close()


def backup_database():
    """备份数据库"""
    import shutil
    from datetime import datetime
    
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


if __name__ == "__main__":
    try:
        logger.info("=== 开始修复JSON字段Unicode转义字符 ===")
        
        # 备份数据库
        backup_file = backup_database()
        if backup_file:
            logger.info(f"数据库备份完成: {backup_file}")
        
        # 运行迁移
        run_migration()
        
        logger.info("=== 修复完成 ===")
        
    except KeyboardInterrupt:
        logger.info("迁移被用户中断")
        sys.exit(1)
    except Exception as e:
        logger.error(f"迁移失败: {str(e)}")
        sys.exit(1) 