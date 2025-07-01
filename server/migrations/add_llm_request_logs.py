"""
添加LLM请求日志表的数据库迁移脚本
运行方式: python migrations/add_llm_request_logs.py
"""

import sys
import os
sys.path.append("..")

from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, Integer, DateTime, JSON, Boolean, Float, Numeric, ForeignKey, text
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from server.constants import get_settings

def run_migration():
    """运行迁移"""
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    # 创建元数据
    metadata = MetaData()
    
    # 先确保基础表结构存在
    try:
        # 如果基础表不存在，先创建基础表（不包含外键）
        from models.database import create_tables
        print("📋 确保基础表结构存在...")
        create_tables()
        print("✅ 基础表结构检查完成")
    except Exception as e:
        print(f"⚠️ 基础表创建警告: {str(e)}")
    
    # 定义LLM请求日志表（暂时不使用外键）
    llm_request_logs = Table(
        'llm_request_logs',
        metadata,
        Column('id', String, primary_key=True, default=lambda: str(uuid.uuid4())),
        
        # 关联信息（暂时不使用外键约束）
        Column('user_id', String, nullable=False, index=True),
        Column('conversation_id', String, nullable=True, index=True),
        Column('agent_id', String, nullable=True),
        Column('provider_config_id', String, nullable=False),
        
        # 请求参数
        Column('model', String, nullable=False),
        Column('temperature', Float, nullable=True),
        Column('max_tokens', Integer, nullable=True),
        Column('stream', Boolean, default=False),
        
        # 请求内容 (JSON)
        Column('request_params', JSON, nullable=True),
        
        # 响应内容
        Column('response_content', Text, nullable=True),
        Column('finish_reason', String, nullable=True),
        
        # 计费信息
        Column('prompt_tokens', Integer, nullable=True),
        Column('completion_tokens', Integer, nullable=True),
        Column('total_tokens', Integer, nullable=True),
        Column('estimated_cost', Numeric(precision=10, scale=6), nullable=True),
        
        # 性能信息
        Column('start_time', DateTime, nullable=False, default=datetime.utcnow),
        Column('end_time', DateTime, nullable=True),
        Column('duration_ms', Integer, nullable=True),
        
        # 状态和错误信息
        Column('status', String, nullable=False, default="pending"),
        Column('error_message', Text, nullable=True),
        
        # 额外信息
        Column('extra_metadata', JSON, nullable=True),
    )
    
    try:
        # 检查表是否已存在
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if inspector.has_table('llm_request_logs'):
            print("❌ 表 'llm_request_logs' 已存在，跳过创建")
            return
    except:
        pass  # 表不存在，继续创建
    
    try:
        # 创建表
        metadata.create_all(engine, tables=[llm_request_logs])
        print("✅ 成功创建 LLM 请求日志表")
        
        # 创建索引以提高查询性能
        with engine.connect() as conn:
            # 用户ID和时间索引
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_llm_logs_user_time 
                ON llm_request_logs(user_id, start_time DESC)
            """))
            
            # 对话ID索引
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_llm_logs_conversation 
                ON llm_request_logs(conversation_id, start_time DESC)
            """))
            
            # 状态索引
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_llm_logs_status 
                ON llm_request_logs(status)
            """))
            
            # 模型和供应商索引
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_llm_logs_model_provider 
                ON llm_request_logs(model, provider_config_id)
            """))
            
            conn.commit()
            print("✅ 成功创建索引")
            
    except Exception as e:
        print(f"❌ 创建表失败: {str(e)}")
        raise

def rollback_migration():
    """回滚迁移"""
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    try:
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS llm_request_logs"))
            conn.commit()
        print("✅ 成功删除 LLM 请求日志表")
    except Exception as e:
        print(f"❌ 删除表失败: {str(e)}")
        raise

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='LLM请求日志表迁移脚本')
    parser.add_argument('--rollback', action='store_true', help='回滚迁移')
    
    args = parser.parse_args()
    
    if args.rollback:
        print("🔄 回滚 LLM 请求日志表...")
        rollback_migration()
    else:
        print("🚀 创建 LLM 请求日志表...")
        run_migration()
    
    print("✨ 迁移完成!") 