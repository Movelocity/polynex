#!/usr/bin/env python3
import json
import sqlite3
import sys
import os
from datetime import datetime
import time
from typing import List, Dict, Any

# 使用nanoid生成ID
try:
    from nanoid import generate as nanoid_generate
except ImportError:
    print("Installing nanoid package...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "nanoid"])
    from nanoid import generate as nanoid_generate

def generate_message_id() -> str:
    """生成消息ID，使用nanoid保持与应用其他部分一致"""
    return nanoid_generate(size=21)  # nanoid默认长度

def distribute_timestamps(start_time: float, end_time: float, count: int) -> List[float]:
    """在开始和结束时间之间均匀分配时间戳"""
    if count <= 1:
        return [start_time]
    
    # 计算时间间隔
    interval = (end_time - start_time) / (count - 1) if count > 1 else 0
    
    # 生成均匀分布的时间戳
    timestamps = [start_time + i * interval for i in range(count)]
    return timestamps

def migrate_conversation_messages(db_path: str) -> None:
    """将conversations表中的消息历史迁移到messages表"""
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return
    
    # 连接到SQLite数据库
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 检查messages表是否存在，如果不存在则创建
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        msg_id TEXT PRIMARY KEY,
        conv_id TEXT NOT NULL,
        role TEXT NOT NULL,
        sender TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        content TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conv_id) REFERENCES conversations(id)
    )
    """)
    
    # 获取所有对话
    cursor.execute("SELECT id, user_id, agent_id, messages, create_time, update_time FROM conversations")
    conversations = cursor.fetchall()
    
    total_conversations = len(conversations)
    processed_conversations = 0
    total_messages_migrated = 0
    
    for conv in conversations:
        processed_conversations += 1
        print(f"处理对话 {processed_conversations}/{total_conversations}: {conv['id']}")
        
        try:
            # 解析消息JSON数组
            messages = json.loads(conv['messages'])
            if not isinstance(messages, list):
                print(f"警告: 对话 {conv['id']} 的消息不是数组格式，跳过")
                continue
            
            # 获取对话的创建和更新时间
            create_time = datetime.fromisoformat(conv['create_time'].replace('Z', '+00:00')) if 'Z' in conv['create_time'] else datetime.fromisoformat(conv['create_time'])
            update_time = datetime.fromisoformat(conv['update_time'].replace('Z', '+00:00')) if 'Z' in conv['update_time'] else datetime.fromisoformat(conv['update_time'])
            
            # 将datetime转换为timestamp
            create_timestamp = create_time.timestamp()
            update_timestamp = update_time.timestamp()
            
            # 为消息均匀分配时间戳
            message_count = len(messages)
            timestamps = distribute_timestamps(create_timestamp, update_timestamp, message_count)
            
            # 遍历消息数组中的每条消息
            for i, msg in enumerate(messages):
                # 生成新的消息ID
                new_msg_id = generate_message_id()
                
                # 确定发送者
                msg_role = msg.get('role', 'user')
                if msg_role == 'user':
                    sender_id = conv['user_id']
                elif msg_role == 'assistant':
                    sender_id = conv['agent_id'] if conv['agent_id'] else 'system'
                else:
                    sender_id = 'system'
                
                # 获取分配的时间戳并转换为ISO格式
                timestamp = datetime.fromtimestamp(timestamps[i]).isoformat()
                
                # 插入到messages表
                cursor.execute("""
                INSERT INTO messages (
                    msg_id, 
                    conv_id, 
                    role, 
                    sender, 
                    type, 
                    content,
                    status,
                    create_time, 
                    update_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    new_msg_id,
                    conv['id'],
                    msg_role,
                    sender_id,
                    'text',  # 目前只有text类型
                    msg.get('content', ''),
                    'active',  # 所有消息状态设为active
                    timestamp,
                    timestamp  # 修改日期与创建日期保持一致
                ))
                
                total_messages_migrated += 1
            
            # 每处理10个对话提交一次事务
            if processed_conversations % 10 == 0:
                conn.commit()
                print(f"已提交 {processed_conversations} 个对话的事务")
        
        except Exception as e:
            print(f"处理对话 {conv['id']} 时出错: {str(e)}")
    
    # 提交剩余事务
    conn.commit()
    
    # 验证迁移结果
    cursor.execute("SELECT COUNT(*) AS total_messages FROM messages")
    total_messages = cursor.fetchone()[0]
    
    cursor.execute("""
    SELECT COUNT(*) FROM (
        SELECT conv_id, COUNT(*) FROM messages GROUP BY conv_id
    )
    """)
    conversations_with_messages = cursor.fetchone()[0]
    
    print("\n迁移完成!")
    print(f"总共迁移了 {total_messages_migrated} 条消息")
    print(f"messages表中共有 {total_messages} 条消息")
    print(f"共有 {conversations_with_messages} 个对话包含消息")
    
    # 关闭数据库连接
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("用法: python migrate_conversations_to_messages.py <sqlite数据库路径>")
        sys.exit(1)
    
    db_path = sys.argv[1]
    migrate_conversation_messages(db_path)