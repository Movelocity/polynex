import asyncio
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import Conversation, ConversationStatus
from fields.schemas import (Message, ConversationUpdate)
import logging

logger = logging.getLogger(__name__)

def filter_messages(conversations: List[Conversation], query: str) -> List[Dict[str, Any]]:
    """
    对话搜索辅助函数，用于搜索对话标题和消息内容
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
        
        # 然后搜索所有消息
        if conversation.messages:
            for message in conversation.messages:
                content = message.get('content', '')
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
                    role = message.get('role', 'unknown')
                    role_label = {'user': '[用户]', 'assistant': '[助手]', 'system': '[系统]'}.get(role, f'[{role}]')
                    first_match_context = f"{role_label} {context}"
        
        # 如果有匹配，添加到结果中
        if match_count > 0:
            search_results.append({
                'id': conversation.id,
                'session_id': conversation.session_id,
                'title': conversation.title,
                'match_count': match_count,
                'context': first_match_context or '',
                'create_time': conversation.create_time.isoformat() + 'Z',
                'update_time': conversation.update_time.isoformat() + 'Z'
            })
    
    # 按匹配次数和更新时间排序
    search_results.sort(key=lambda x: (-x['match_count'], x['update_time']), reverse=True)
    return search_results

class ConversationService:
    """对话记录管理服务类"""
    
    async def create_conversation(
        self, 
        db: Session,
        user_id: str, 
        agent_id: Optional[str] = None,
        title: Optional[str] = None
    ) -> Conversation:
        """
        创建新对话记录
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            agent_id: Agent ID
            title: 对话标题
            
        Returns:
            Conversation: 创建的对话记录
        """
        try:
            # 生成会话ID
            session_id = str(uuid.uuid4())
            
            # 创建对话记录
            conversation = Conversation(
                session_id=session_id,
                user_id=user_id,
                agent_id=agent_id,
                title=title or "新对话",
                messages=[],
                status=ConversationStatus.ACTIVE
            )
            
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            return conversation
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            db.rollback()
            raise
    
    async def get_user_conversations(
        self, 
        db: Session,
        user_id: str, 
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """
        获取用户的对话列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[Conversation]: 对话列表
        """
        try:
            conversations = db.query(Conversation).filter(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).order_by(Conversation.update_time.desc()).offset(offset).limit(limit).all()
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting conversations: {str(e)}")
            raise
    
    async def get_conversation(
        self, 
        db: Session,
        conversation_id: str, 
        user_id: str
    ) -> Optional[Conversation]:
        """
        获取特定对话详情
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            Optional[Conversation]: 对话详情
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).first()
            
            return conversation
            
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
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            conversation.title = title
            conversation.update_time = datetime.now()
            
            db.commit()
            
            logger.info(f"Updated title for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation title: {str(e)}")
            db.rollback()
            raise
    
    async def delete_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """
        删除对话（软删除）
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            bool: 是否成功删除
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            conversation.status = ConversationStatus.DELETED
            conversation.update_time = datetime.now()
            
            db.commit()
            
            logger.info(f"Deleted conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            db.rollback()
            raise
    
    async def update_conversation(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        update_data: ConversationUpdate
    ) -> Optional[Conversation]:
        """
        更新对话信息
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            update_data: 更新数据
            
        Returns:
            Optional[Conversation]: 更新后的对话信息
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
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
            
            db.commit()
            db.refresh(conversation)
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error updating conversation: {str(e)}")
            db.rollback()
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
            messages: 要添加的消息列表
            
        Returns:
            bool: 是否成功添加
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 更新消息历史
            updated_messages = conversation.messages.copy() if conversation.messages else []
            updated_messages.extend(messages)
            
            conversation.messages = updated_messages
            conversation.update_time = datetime.now()
            
            # 自动更新标题
            if conversation.title == "新对话":
                for msg in reversed(updated_messages):
                    if msg.get("role") == "user":
                        content = msg.get("content", "")
                        if content:
                            conversation.title = content[:50] + ("..." if len(content) > 50 else "")
                            break
            
            db.commit()
            
            logger.info(f"Conversation {conversation_id} 增加了 {len(messages)} 条消息")
            return True
            
        except Exception as e:
            logger.error(f"Error adding messages to conversation: {str(e)}")
            db.rollback()
            raise
    
    async def update_conversation_messages(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        messages: List[Dict[str, Any]]
    ) -> bool:
        """
        更新对话的完整消息列表
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 新的消息列表
            
        Returns:
            bool: 是否成功更新
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            conversation.messages = messages
            conversation.update_time = datetime.now()
            
            db.commit()
            
            logger.info(f"Updated messages for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation messages: {str(e)}")
            db.rollback()
            raise
    
    async def update_conversation_context(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        messages: List[Message]
    ) -> bool:
        """
        更新对话上下文
        
        Args:
            db: 数据库会话
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 新的消息列表
            
        Returns:
            bool: 是否成功更新
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            ).first()
            
            if not conversation:
                return False
            
            # 转换消息格式
            message_data = []
            for msg in messages:
                message_data.append({
                    "role": msg.role.value,
                    "content": msg.content,
                    "timestamp": msg.timestamp or datetime.now().isoformat(),
                    "tokens": msg.tokens
                })
            
            conversation.messages = message_data
            conversation.update_time = datetime.now()
            
            db.commit()
            
            logger.info(f"Updated context for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation context: {str(e)}")
            db.rollback()
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
            conversations = db.query(Conversation).filter(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).order_by(Conversation.update_time.desc()).all()
            
            # 进行搜索
            search_results = filter_messages(conversations, query)
            
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

_conversation_service = None
# 单例获取函数
def get_conversation_service_singleton() -> ConversationService:
    """获取对话服务单例"""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
