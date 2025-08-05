import asyncio
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_

from models.database import ConversationRecord, Message, ConversationStatus, db_write_lock, get_db_session
from fields.schemas import (Message as MessageSchema, ConversationUpdate)
import logging

logger = logging.getLogger(__name__)

def filter_messages(db: Session, conversations: List[ConversationRecord], query: str) -> List[Dict[str, Any]]:
    """
    对话搜索辅助函数，用于搜索对话标题和消息内容
    使用新的ConversationRecord和Message表结构
    """
    search_results = []
    query_lower = query.lower()
    
    for conversation in conversations:
        match_count = 0
        first_match_context = None
        
        # 首先搜索对话标题
        title_lower = conversation.title.lower()
        title_matches = title_lower.count(query_lower)
        if title_matches > 0:
            match_count += title_matches
            # 如果标题中有匹配，使用标题作为context
            match_index = title_lower.find(query_lower)
            start_index = max(0, match_index - 60)
            end_index = min(len(conversation.title), match_index + len(query) + 60)
            
            context = conversation.title[start_index:end_index]
            if start_index > 0:
                context = "..." + context
            if end_index < len(conversation.title):
                context = context + "..."
            
            first_match_context = f"[标题] {context}"
        
        # 然后搜索该对话的所有消息
        messages = db.query(Message).filter(
            and_(
                Message.conv_id == conversation.conv_id,
                Message.status == "active"
            )
        ).order_by(Message.create_time).all()
        
        for message in messages:
            content = message.content or ''
            if not content:
                continue
            
            content_lower = content.lower()
            
            # 计算匹配次数
            message_matches = content_lower.count(query_lower)
            match_count += message_matches
            
            # 如果还没有找到首次匹配的context，且当前消息包含关键词
            if first_match_context is None and query_lower in content_lower:
                # 找到首次匹配的位置
                match_index = content_lower.find(query_lower)
                
                # 提取前后各60个字符（总共120个字符）
                start_index = max(0, match_index - 60)
                end_index = min(len(content), match_index + len(query) + 60)
                
                context = content[start_index:end_index]
                
                # 如果从头开始截取，不添加省略号；否则添加省略号
                if start_index > 0:
                    context = "..." + context
                if end_index < len(content):
                    context = context + "..."
                
                # 标识消息角色
                role_label = {'user': '[用户]', 'assistant': '[助手]', 'admin': '[管理员]'}.get(message.role, f'[{message.role}]')
                first_match_context = f"{role_label} {context}"
        
        # 如果有匹配，添加到结果中
        if match_count > 0:
            search_results.append({
                'id': conversation.conv_id,
                'conv_id': conversation.conv_id,
                'title': conversation.title,
                'match_count': match_count,
                'context': first_match_context or '',
                'create_time': conversation.create_time.isoformat() + 'Z',
                'update_time': conversation.update_time.isoformat() + 'Z',
                'msg_count': conversation.msg_count
            })
    
    # 按匹配次数和更新时间排序
    search_results.sort(key=lambda x: (-x['match_count'], x['update_time']), reverse=True)
    return search_results

class ConversationService:
    """对话记录管理服务类 - 使用新的ConversationRecord和Message表结构"""
    
    async def create_conversation(
        self, 
        db: Session,
        user_id: str, 
        agent_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> ConversationRecord:
        """
        创建新对话记录
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            agent_id: Agent ID (存储在第一条消息的sender字段中)
            title: 对话标题
            
        Returns:
            ConversationRecord: 创建的对话记录
        """
        def _create_conversation_op(db_session: Session):
            # 创建对话记录
            conversation = ConversationRecord(
                user_id=user_id,
                # agent_id=agent_id,
                title=title or "新对话",
                msg_count=0,
                status=ConversationStatus.ACTIVE
            )
            
            db_session.add(conversation)
            db_session.commit()
            db_session.refresh(conversation)
            
            logger.info(f"Created conversation {conversation.conv_id} for user {user_id}")
            return conversation
        
        try:
            with db_write_lock():
                return _create_conversation_op(db)
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            raise
    
    async def get_user_conversations(
        self, 
        db: Session,
        user_id: str, 
        limit: int = 50,
        offset: int = 0
    ) -> List[ConversationRecord]:
        """
        获取用户的对话列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[ConversationRecord]: 对话列表
        """
        try:
            conversations = db.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.user_id == user_id,
                    ConversationRecord.status != ConversationStatus.DELETED
                )
            ).order_by(ConversationRecord.update_time.desc()).offset(offset).limit(limit).all()
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting conversations: {str(e)}")
            raise
    
    async def get_conversation(
        self, 
        db: Session,
        conversation_id: str, 
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取特定对话详情，包括所有消息
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            Optional[Dict]: 对话详情和消息列表
        """
        try:
            # 获取对话基本信息
            conversation = db.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id,
                    ConversationRecord.status != ConversationStatus.DELETED
                )
            ).first()
            
            if not conversation:
                return None
            
            # 获取所有消息
            messages = db.query(Message).filter(
                and_(
                    Message.conv_id == conversation_id,
                    Message.status == "active"
                )
            ).order_by(Message.create_time).all()
            
            # 构建返回数据
            return {
                'conversation': conversation,
                'messages': messages,
                'conv_id': conversation.conv_id,
                'user_id': conversation.user_id,
                # 'agent_id': conversation.agent_id,
                'title': conversation.title,
                'msg_count': conversation.msg_count,
                'status': conversation.status,
                'create_time': conversation.create_time,
                'update_time': conversation.update_time
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            raise
    
    async def update_conversation_title(
        self,
        db: Session,
        conversation_id: str,
        title: str,
        user_id: str
    ) -> bool:
        """
        更新对话标题
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            title: 新标题
            user_id: 用户ID
            
        Returns:
            bool: 是否更新成功
        """
        def _update_title_op(db_session: Session):
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            conversation.title = title
            conversation.update_time = datetime.now()
            
            db_session.commit()
            
            logger.info(f"Updated title for conversation {conversation_id}")
            return True
        
        try:
            with db_write_lock():
                return _update_title_op(db)
        except Exception as e:
            logger.error(f"Error updating conversation title: {str(e)}")
            raise
    
    async def delete_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """
        删除对话（软删除）- 同时软删除所有相关消息
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            bool: 是否成功删除
        """
        def _delete_conversation_op(db_session: Session):
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 软删除对话
            conversation.status = ConversationStatus.DELETED
            conversation.update_time = datetime.now()
            
            # 软删除所有相关消息
            db_session.query(Message).filter(
                Message.conv_id == conversation_id
            ).update({
                'status': 'deleted',
                'update_time': datetime.now()
            })
            
            db_session.commit()
            
            logger.info(f"Deleted conversation {conversation_id} and all its messages")
            return True
        
        try:
            with db_write_lock():
                return _delete_conversation_op(db)
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            raise
    
    async def update_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        update_data: ConversationUpdate
    ) -> Optional[ConversationRecord]:
        """
        更新对话信息
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            update_data: 更新数据
            
        Returns:
            Optional[ConversationRecord]: 更新后的对话信息
        """
        def _update_conversation_op(db_session: Session):
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return None
            
            # 更新字段
            if update_data.title is not None:
                conversation.title = update_data.title
            if update_data.agent_id is not None:
                conversation.agent_id = update_data.agent_id
            if update_data.status is not None:
                conversation.status = ConversationStatus(update_data.status)
            
            conversation.update_time = datetime.now()
            
            db_session.commit()
            db_session.refresh(conversation)
            
            return conversation
        
        try:
            with db_write_lock():
                return _update_conversation_op(db)
        except Exception as e:
            logger.error(f"Error updating conversation: {str(e)}")
            raise
    
    async def add_messages_to_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        messages: List[Dict[str, Any]]
    ) -> bool:
        """
        向对话添加消息
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 要添加的消息列表，格式：[{"role": "user", "content": "...", "sender": "user_id", "type": "text"}]
            
        Returns:
            bool: 是否成功添加
        """
        def _add_messages_op(db_session: Session):
            # 验证对话存在且属于用户
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 添加消息
            new_message_count = 0
            auto_title_content = None
            
            for msg_data in messages:
                message = Message(
                    conv_id=conversation_id,
                    role=msg_data.get("role", "user"),
                    sender=msg_data.get("sender", user_id),
                    type=msg_data.get("type", "text"),
                    status="active",
                    content=msg_data.get("content", "")
                )
                
                db_session.add(message)
                new_message_count += 1
                
                # 收集用于自动生成标题的内容
                if (conversation.title == "新对话" and 
                    msg_data.get("role") == "user" and 
                    auto_title_content is None):
                    auto_title_content = msg_data.get("content", "")
            
            # 更新对话记录
            conversation.msg_count += new_message_count
            conversation.update_time = datetime.now()
            
            # 自动更新标题
            if conversation.title == "新对话" and auto_title_content:
                conversation.title = auto_title_content[:50] + ("..." if len(auto_title_content) > 50 else "")
            
            db_session.commit()
            
            logger.info(f"Conversation {conversation_id} 增加了 {new_message_count} 条消息")
            return True
        
        try:
            with db_write_lock():
                return _add_messages_op(db)
        except Exception as e:
            logger.error(f"Error adding messages to conversation: {str(e)}")
            raise
    
    async def update_conversation_messages(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        messages: List[Dict[str, Any]]
    ) -> bool:
        """
        更新对话的完整消息列表（删除旧消息，添加新消息）
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 新的消息列表
            
        Returns:
            bool: 是否成功更新
        """
        def _update_messages_op(db_session: Session):
            # 验证对话存在且属于用户
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 软删除所有现有消息
            db_session.query(Message).filter(
                Message.conv_id == conversation_id
            ).update({
                'status': 'deleted',
                'update_time': datetime.now()
            })
            
            # 添加新消息
            new_message_count = 0
            for msg_data in messages:
                message = Message(
                    conv_id=conversation_id,
                    role=msg_data.get("role", "user"),
                    sender=msg_data.get("sender", user_id),
                    type=msg_data.get("type", "text"),
                    status="active",
                    content=msg_data.get("content", "")
                )
                
                db_session.add(message)
                new_message_count += 1
            
            # 更新对话记录
            conversation.msg_count = new_message_count
            conversation.update_time = datetime.now()
            
            db_session.commit()
            
            logger.info(f"Updated messages for conversation {conversation_id} - {new_message_count} messages")
            return True
        
        try:
            with db_write_lock():
                return _update_messages_op(db)
        except Exception as e:
            logger.error(f"Error updating conversation messages: {str(e)}")
            raise
    
    async def update_conversation_context(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        messages: List[MessageSchema]
    ) -> bool:
        """
        更新对话上下文（从MessageSchema转换）
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 新的消息列表（MessageSchema对象）
            
        Returns:
            bool: 是否成功更新
        """
        def _update_context_op(db_session: Session):
            # 验证对话存在且属于用户
            conversation = db_session.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 软删除所有现有消息
            db_session.query(Message).filter(
                Message.conv_id == conversation_id
            ).update({
                'status': 'deleted',
                'update_time': datetime.now()
            })
            
            # 转换并添加新消息
            new_message_count = 0
            for msg in messages:
                message = Message(
                    conv_id=conversation_id,
                    role=msg.role.value if hasattr(msg.role, 'value') else str(msg.role),
                    sender=user_id,  # 默认发送者为用户
                    type="text",
                    status="active",
                    content=msg.content
                )
                
                db_session.add(message)
                new_message_count += 1
            
            # 更新对话记录
            conversation.msg_count = new_message_count
            conversation.update_time = datetime.now()
            
            db_session.commit()
            
            logger.info(f"Updated context for conversation {conversation_id} - {new_message_count} messages")
            return True
        
        try:
            with db_write_lock():
                return _update_context_op(db)
        except Exception as e:
            logger.error(f"Error updating conversation context: {str(e)}")
            raise

    async def search_conversations(
        self,
        db: Session,
        user_id: str,
        query: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        搜索对话
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            query: 搜索关键词
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            Dict[str, Any]: 搜索结果
        """
        try:
            # 查询所有对话
            conversations = db.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.user_id == user_id,
                    ConversationRecord.status != ConversationStatus.DELETED
                )
            ).order_by(ConversationRecord.update_time.desc()).all()
            
            # 进行搜索
            search_results = filter_messages(db, conversations, query)
            
            # 分页处理
            total_count = len(search_results)
            paginated_results = search_results[offset:offset + limit]
            
            return {
                'results': paginated_results,
                'total_count': total_count,
                'page': offset // limit + 1,
                'page_size': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
            
        except Exception as e:
            logger.error(f"Error searching conversations: {str(e)}")
            raise
    
    async def get_conversation_messages(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Message]:
        """
        获取对话的消息列表
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[Message]: 消息列表
        """
        try:
            # 验证对话存在且属于用户
            conversation = db.query(ConversationRecord).filter(
                and_(
                    ConversationRecord.conv_id == conversation_id,
                    ConversationRecord.user_id == user_id,
                    ConversationRecord.status != ConversationStatus.DELETED
                )
            ).first()
            
            if not conversation:
                return []
            
            # 获取消息
            messages = db.query(Message).filter(
                and_(
                    Message.conv_id == conversation_id,
                    Message.status == "active"
                )
            ).order_by(Message.create_time).offset(offset).limit(limit).all()
            
            return messages
            
        except Exception as e:
            logger.error(f"Error getting conversation messages: {str(e)}")
            raise

_conversation_service = None
# 单例获取函数
def get_conversation_service_singleton() -> ConversationService:
    """获取对话服务单例"""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
