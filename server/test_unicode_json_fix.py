"""
测试UnicodeJSON类型是否正确处理中文字符
"""

import sys
import os
import json
from typing import Dict, Any

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import SessionLocal, LLMRequestLog
from services.llm_request_log_service import get_llm_log_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_unicode_json_storage():
    """测试中文字符在JSON字段中的存储和读取"""
    logger.info("=== 测试UnicodeJSON类型中文字符处理 ===")
    
    db = SessionLocal()
    log_service = get_llm_log_service()
    
    try:
        # 测试数据，包含中文字符
        test_messages = [
            {
                "role": "user",
                "content": "你好，我想了解人工智能的发展历程。请详细介绍一下AI技术的演进过程。"
            },
            {
                "role": "assistant", 
                "content": "您好！我很乐意为您介绍人工智能的发展历程。人工智能（AI）的发展可以分为以下几个重要阶段：\n\n1. **早期理论阶段（1940s-1950s）**\n   - 图灵测试的提出\n   - 神经网络理论的初步建立\n\n2. **专家系统时代（1960s-1980s）**\n   - 基于规则的推理系统\n   - 知识表示和推理算法的发展"
            }
        ]
        
        test_metadata = {
            "测试目的": "验证中文字符正常存储",
            "包含内容": ["中文对话", "技术术语", "特殊符号"],
            "用户名": "张三",
            "项目名称": "人工智能聊天系统"
        }
        
        # 创建测试日志记录
        logger.info("创建包含中文的测试日志记录...")
        log_id = log_service.create_log_async(
            user_id="test-user-123",
            provider_config_id="test-provider-123", 
            model="gpt-4",
            request_messages=test_messages,
            db=db,
            conversation_id="test-conversation-123",
            extra_metadata=test_metadata
        )
        
        # 等待异步写入完成（简单延时）
        import time
        time.sleep(2)
        
        # 从数据库读取记录验证
        logger.info("从数据库读取记录进行验证...")
        log_record = db.query(LLMRequestLog).filter(LLMRequestLog.id == log_id).first()
        
        if log_record:
            logger.info("✅ 成功创建测试记录")
            
            # 检查request_messages字段
            logger.info("检查request_messages字段...")
            messages = log_record.request_messages
            logger.info(f"存储的消息数量: {len(messages)}")
            
            for i, msg in enumerate(messages):
                logger.info(f"消息 {i+1}:")
                logger.info(f"  角色: {msg['role']}")
                logger.info(f"  内容: {msg['content'][:50]}...")
                
                # 验证中文字符是否正常显示
                if "你好" in msg['content'] or "人工智能" in msg['content']:
                    logger.info("  ✅ 中文字符显示正常")
                elif "\\u" in msg['content']:
                    logger.warning("  ❌ 检测到Unicode转义字符")
                    logger.warning(f"  完整内容: {msg['content']}")
            
            # 检查extra_metadata字段
            logger.info("检查extra_metadata字段...")
            metadata = log_record.extra_metadata
            if metadata:
                logger.info(f"元数据内容: {json.dumps(metadata, ensure_ascii=False, indent=2)}")
                
                # 验证中文字符是否正常显示
                if "测试目的" in metadata and "中文对话" in str(metadata):
                    logger.info("  ✅ 元数据中文字符显示正常")
                elif "\\u" in str(metadata):
                    logger.warning("  ❌ 元数据中检测到Unicode转义字符")
            
            # 测试to_dict方法
            logger.info("测试to_dict方法...")
            record_dict = log_record.to_dict()
            
            messages_json = json.dumps(record_dict['request_messages'], ensure_ascii=False)
            metadata_json = json.dumps(record_dict['extra_metadata'], ensure_ascii=False)
            
            logger.info("to_dict输出的JSON格式:")
            logger.info(f"request_messages: {messages_json[:100]}...")
            logger.info(f"extra_metadata: {metadata_json}")
            
            if "\\u" not in messages_json and "\\u" not in metadata_json:
                logger.info("✅ to_dict方法输出的JSON中文字符正常")
            else:
                logger.warning("❌ to_dict方法输出的JSON中仍有Unicode转义字符")
            
        else:
            logger.error("❌ 未找到测试记录")
        
        # 清理测试数据
        if log_record:
            db.delete(log_record)
            db.commit()
            logger.info("🗑️ 清理测试数据完成")
            
    except Exception as e:
        logger.error(f"❌ 测试过程中出错: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def check_existing_data():
    """检查现有数据中的中文字符显示情况"""
    logger.info("=== 检查现有数据中的中文字符 ===")
    
    db = SessionLocal()
    
    try:
        # 查询最近的几条LLM日志记录
        recent_logs = db.query(LLMRequestLog).order_by(
            LLMRequestLog.start_time.desc()
        ).limit(5).all()
        
        if not recent_logs:
            logger.info("数据库中暂无LLM请求日志记录")
            return
        
        logger.info(f"找到 {len(recent_logs)} 条最近的日志记录")
        
        for i, log in enumerate(recent_logs, 1):
            logger.info(f"\n记录 {i} (ID: {log.id}):")
            
            # 检查request_messages
            if log.request_messages:
                messages_str = json.dumps(log.request_messages, ensure_ascii=False)
                if any(ord(c) > 127 for c in messages_str):  # 包含非ASCII字符
                    logger.info(f"  请求消息包含中文: {messages_str[:100]}...")
                    if "\\u" in messages_str:
                        logger.warning("  ❌ 检测到Unicode转义字符")
                    else:
                        logger.info("  ✅ 中文字符显示正常")
            
            # 检查extra_metadata
            if log.extra_metadata:
                metadata_str = json.dumps(log.extra_metadata, ensure_ascii=False)
                if any(ord(c) > 127 for c in metadata_str):  # 包含非ASCII字符
                    logger.info(f"  元数据包含中文: {metadata_str}")
                    if "\\u" in metadata_str:
                        logger.warning("  ❌ 元数据中检测到Unicode转义字符")
                    else:
                        logger.info("  ✅ 元数据中文字符显示正常")
        
    except Exception as e:
        logger.error(f"❌ 检查现有数据时出错: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        # 先检查现有数据
        check_existing_data()
        
        print("\n" + "="*50 + "\n")
        
        # 再进行新数据测试
        test_unicode_json_storage()
        
        logger.info("\n=== 测试完成 ===")
        logger.info("如果看到 ✅ 标记，说明中文字符处理正常")
        logger.info("如果看到 ❌ 标记，说明仍有Unicode转义问题")
        
    except Exception as e:
        logger.error(f"测试失败: {str(e)}")
        sys.exit(1) 