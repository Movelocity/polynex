#!/usr/bin/env python3
"""
测试新的数据库系统：ConversationRecord和Message表以及线程锁机制
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加server目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

import logging
import threading
import time
from datetime import datetime

from models.database import (
    engine, create_tables, get_db_session, db_write_lock,
    ConversationRecord, Message, ConversationStatus
)
from services.conversation_service import get_conversation_service_singleton

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_database_connection():
    """测试数据库连接"""
    logger.info("测试数据库连接...")
    try:
        db = get_db_session()
        # 简单查询测试
        result = db.execute("SELECT 1")
        logger.info("数据库连接成功")
        db.close()
        return True
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return False

def test_table_creation():
    """测试表创建"""
    logger.info("测试表创建...")
    try:
        create_tables()
        logger.info("表创建成功")
        
        # 验证表是否存在
        db = get_db_session()
        try:
            # 检查conversation表
            result = db.execute("SELECT COUNT(*) FROM conversation")
            logger.info(f"conversation表记录数: {result.scalar()}")
            
            # 检查messages表
            result = db.execute("SELECT COUNT(*) FROM messages")
            logger.info(f"messages表记录数: {result.scalar()}")
            
            return True
        finally:
            db.close()
    except Exception as e:
        logger.error(f"表创建失败: {e}")
        return False

def test_write_lock():
    """测试写锁机制"""
    logger.info("测试写锁机制...")
    
    results = []
    
    def write_operation(thread_id, delay):
        """模拟写操作"""
        start_time = time.time()
        logger.info(f"线程 {thread_id} 开始等待锁...")
        
        with db_write_lock():
            acquired_time = time.time()
            logger.info(f"线程 {thread_id} 获得锁 (等待时间: {acquired_time - start_time:.2f}s)")
            
            # 模拟数据库写操作
            time.sleep(delay)
            
            db = get_db_session()
            try:
                conv = ConversationRecord(
                    user_id=f"test_user_{thread_id}",
                    title=f"测试对话 {thread_id}",
                    msg_count=0,
                    status=ConversationStatus.ACTIVE
                )
                db.add(conv)
                db.commit()
                db.refresh(conv)
                
                results.append({
                    'thread_id': thread_id,
                    'conv_id': conv.conv_id,
                    'wait_time': acquired_time - start_time,
                    'total_time': time.time() - start_time
                })
                
                logger.info(f"线程 {thread_id} 完成写操作 (总时间: {time.time() - start_time:.2f}s)")
            finally:
                db.close()
    
    # 启动多个线程同时进行写操作
    threads = []
    for i in range(3):
        t = threading.Thread(target=write_operation, args=(i, 0.5))
        threads.append(t)
        t.start()
    
    # 等待所有线程完成
    for t in threads:
        t.join()
    
    logger.info("写锁测试完成")
    for result in results:
        logger.info(f"线程 {result['thread_id']}: 等待时间 {result['wait_time']:.2f}s, 总时间 {result['total_time']:.2f}s")
    
    return len(results) == 3

async def test_conversation_service():
    """测试ConversationService"""
    logger.info("测试ConversationService...")
    
    service = get_conversation_service_singleton()
    db = get_db_session()
    
    try:
        # 测试创建对话
        logger.info("1. 测试创建对话...")
        conversation = await service.create_conversation(
            db=db,
            user_id="test_user_service",
            agent_id="test_agent",
            title="服务测试对话"
        )
        conv_id = conversation.conv_id
        logger.info(f"创建对话成功: {conv_id}")
        
        # 测试添加消息
        logger.info("2. 测试添加消息...")
        messages = [
            {
                "role": "user",
                "content": "你好，这是一条测试消息",
                "sender": "test_user_service",
                "type": "text"
            },
            {
                "role": "assistant", 
                "content": "你好！我是AI助手，很高兴为您服务。",
                "sender": "test_agent",
                "type": "text"
            }
        ]
        
        success = await service.add_messages_to_conversation(
            db=db,
            conversation_id=conv_id,
            user_id="test_user_service",
            messages=messages
        )
        logger.info(f"添加消息结果: {success}")
        
        # 测试获取对话
        logger.info("3. 测试获取对话...")
        conversation_data = await service.get_conversation(
            db=db,
            conversation_id=conv_id,
            user_id="test_user_service"
        )
        
        if conversation_data:
            conv = conversation_data['conversation']
            msgs = conversation_data['messages']
            logger.info(f"获取对话成功: 标题={conv.title}, 消息数={len(msgs)}")
            
            # 测试获取用户对话列表
            logger.info("4. 测试获取用户对话列表...")
            conversations = await service.get_user_conversations(
                db=db,
                user_id="test_user_service"
            )
            logger.info(f"用户对话数量: {len(conversations)}")
            
            # 测试搜索对话
            logger.info("5. 测试搜索对话...")
            search_result = await service.search_conversations(
                db=db,
                user_id="test_user_service",
                query="测试"
            )
            logger.info(f"搜索结果数量: {search_result['total_count']}")
            
            return True
        else:
            logger.error("获取对话失败")
            return False
            
    except Exception as e:
        logger.error(f"ConversationService测试失败: {e}")
        return False
    finally:
        db.close()

async def main():
    """主测试函数"""
    logger.info("=" * 50)
    logger.info("开始测试新的数据库系统")
    logger.info("=" * 50)
    
    tests = [
        ("数据库连接", test_database_connection),
        ("表创建", test_table_creation),
        ("写锁机制", test_write_lock),
        ("ConversationService", test_conversation_service),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results[test_name] = result
            logger.info(f"{test_name}: {'✅ 通过' if result else '❌ 失败'}")
        except Exception as e:
            logger.error(f"{test_name}: ❌ 异常 - {e}")
            results[test_name] = False
    
    # 输出总结
    logger.info("\n" + "=" * 50)
    logger.info("测试总结:")
    logger.info("=" * 50)
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"  {test_name}: {status}")
    
    logger.info(f"\n总体结果: {passed}/{total} 个测试通过")
    
    if passed == total:
        logger.info("🎉 所有测试通过！新的数据库系统工作正常。")
    else:
        logger.warning("⚠️ 部分测试失败，请检查问题。")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(main())