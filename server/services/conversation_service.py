import asyncio
import json
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import Conversation, Agent, ConversationStatus, AIProvider
from fields.schemas import (
    Message, ConversationCreate, ConversationUpdate, 
    ConversationSummary, ChatRequest, MessageRole
)
from services.openai_service import OpenAIService, get_openai_service
from services.ai_provider_service import AIProviderService
from constants import get_settings
import logging

logger = logging.getLogger(__name__)

class ConversationService:
    """对话服务类"""
    
    def __init__(self):
        # 从配置获取并发限制
        settings = get_settings()
        
        # 限制同时进行的LLM请求数量（避免API限制）
        self.llm_semaphore = asyncio.Semaphore(settings.max_concurrent_llm_requests)
        
        # 每个会话的锁字典
        self.session_locks: Dict[str, asyncio.Lock] = {}
        
        # 正在进行的流式响应记录
        self.active_streams: Dict[str, bool] = {}
    
    def _get_session_lock(self, session_id: str) -> asyncio.Lock:
        """获取会话特定的锁"""
        if session_id not in self.session_locks:
            self.session_locks[session_id] = asyncio.Lock()
        return self.session_locks[session_id]
    
    async def create_conversation(
        self, 
        user_id: str, 
        conversation_data: ConversationCreate,
        db: Session
    ) -> Dict[str, Any]:
        """
        创建新对话
        
        Args:
            user_id: 用户ID
            conversation_data: 对话创建数据
            db: 数据库会话
            
        Returns:
            Dict[str, Any]: 创建的对话信息
        """
        try:
            # 生成会话ID
            session_id = str(uuid.uuid4())
            
            # 创建对话记录
            conversation = Conversation(
                session_id=session_id,
                user_id=user_id,
                agent_id=conversation_data.agent_id,
                title=conversation_data.title or "新对话",
                messages=[],
                status=ConversationStatus.ACTIVE
            )
            
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            
            return {
                "id": conversation.id,
                "sessionId": conversation.session_id,
                "userId": conversation.user_id,
                "agentId": conversation.agent_id,
                "title": conversation.title,
                "messages": [],
                "status": conversation.status.value,
                "createTime": conversation.create_time.isoformat(),
                "updateTime": conversation.update_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            db.rollback()
            raise
    
    async def get_conversations(
        self, 
        user_id: str, 
        db: Session,
        limit: int = 50,
        offset: int = 0
    ) -> List[ConversationSummary]:
        """
        获取用户的对话列表
        
        Args:
            user_id: 用户ID
            db: 数据库会话
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[ConversationSummary]: 对话摘要列表
        """
        try:
            conversations = db.query(Conversation).filter(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).order_by(Conversation.update_time.desc()).offset(offset).limit(limit).all()
            
            result = []
            for conv in conversations:
                messages = conv.messages if conv.messages else []
                result.append(ConversationSummary(
                    id=conv.id,
                    session_id=conv.session_id,
                    user_id=conv.user_id,
                    agent_id=conv.agent_id,
                    title=conv.title,
                    status=conv.status,
                    create_time=conv.create_time.isoformat(),
                    update_time=conv.update_time.isoformat(),
                    message_count=len(messages)
                ))
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting conversations: {str(e)}")
            raise
    
    async def get_conversation(
        self, 
        conversation_id: str, 
        user_id: str, 
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        获取特定对话详情
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            Optional[Dict[str, Any]]: 对话详情
        """
        try:
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).first()
            
            if not conversation:
                return None
            
            # 转换消息格式
            messages = []
            if conversation.messages:
                for msg in conversation.messages:
                    messages.append(Message(
                        role=MessageRole(msg.get('role', 'user')),
                        content=msg.get('content', ''),
                        timestamp=msg.get('timestamp'),
                        tokens=msg.get('tokens')
                    ))
            
            return {
                "id": conversation.id,
                "sessionId": conversation.session_id,
                "userId": conversation.user_id,
                "agentId": conversation.agent_id,
                "title": conversation.title,
                "messages": messages,
                "status": conversation.status.value,
                "createTime": conversation.create_time.isoformat(),
                "updateTime": conversation.update_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            raise
    
    async def update_conversation(
        self,
        conversation_id: str,
        user_id: str,
        update_data: ConversationUpdate,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        更新对话信息
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            update_data: 更新数据
            db: 数据库会话
            
        Returns:
            Optional[Dict[str, Any]]: 更新后的对话信息
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
            
            conversation.update_time = datetime.utcnow()
            
            db.commit()
            db.refresh(conversation)
            
            return await self.get_conversation(conversation_id, user_id, db)
            
        except Exception as e:
            logger.error(f"Error updating conversation: {str(e)}")
            db.rollback()
            raise
    
    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str,
        db: Session
    ) -> bool:
        """
        删除对话（软删除）
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            db: 数据库会话
            
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
            conversation.update_time = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Deleted conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            db.rollback()
            raise
    
    async def stream_chat(
        self,
        session_id: str,
        user_id: str,
        message: str,
        db: Session
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式聊天
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            message: 用户消息
            db: 数据库会话
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        session_lock = self._get_session_lock(session_id)
        
        try:
            # 获取对话记录
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.session_id == session_id,
                    Conversation.user_id == user_id,
                    Conversation.status == ConversationStatus.ACTIVE
                )
            ).first()
            
            if not conversation:
                yield {
                    "type": "error",
                    "data": {"error": "Conversation not found"}
                }
                return
            
            # 检查是否已有活跃的流
            if session_id in self.active_streams:
                yield {
                    "type": "error",
                    "data": {"error": "Another stream is active for this session"}
                }
                return
            
            # 标记流为活跃状态
            self.active_streams[session_id] = True
            
            try:
                # 准备消息历史
                messages = conversation.messages.copy() if conversation.messages else []
                
                # 添加用户消息
                user_message = {
                    "role": "user",
                    "content": message,
                    "timestamp": datetime.utcnow().isoformat()
                }
                messages.append(user_message)
                
                # 获取 Agent 配置
                openai_service = None
                if conversation.agent_id:
                    agent = db.query(Agent).filter(Agent.id == conversation.agent_id).first()
                    if agent:
                        # 使用新的供应商配置系统
                        provider_service = AIProviderService(db)
                        provider_config = provider_service.get_config_for_agent(
                            agent_id=agent.id,
                            provider_config_id=agent.provider_config_id
                        )
                        
                        if provider_config and provider_config.provider == AIProvider.OPENAI:
                            # 创建OpenAI服务实例
                            openai_service = OpenAIService(
                                provider_config=provider_config,
                                db=db
                            )
                            
                            # 使用Agent的特定配置覆盖默认值
                            model = agent.model or provider_config.default_model
                            temperature = agent.temperature if agent.temperature is not None else provider_config.default_temperature
                            max_tokens = agent.max_tokens if agent.max_tokens is not None else provider_config.default_max_tokens
                            
                            # 添加预设消息
                            if agent.preset_messages:
                                preset_msgs = [
                                    {"role": msg.get("role", "system"), "content": msg.get("content", "")}
                                    for msg in agent.preset_messages
                                ]
                                messages = preset_msgs + messages
                        else:
                            logger.warning(f"Agent {agent.id} has no valid OpenAI provider config")
                
                # 如果没有Agent配置或Agent配置无效，使用默认配置
                if not openai_service:
                    provider_service = AIProviderService(db)
                    default_config = provider_service.get_default_provider_config()
                    if not default_config:
                        default_config = provider_service.get_best_provider_config(AIProvider.OPENAI)
                    
                    if default_config:
                        openai_service = OpenAIService(
                            provider_config=default_config,
                            db=db
                        )
                        model = default_config.default_model
                        temperature = default_config.default_temperature
                        max_tokens = default_config.default_max_tokens
                    else:
                        yield {
                            "type": "error",
                            "data": {"error": "No valid AI provider configuration found. Please configure an AI provider in the admin panel."}
                        }
                        return
                
                # 限制并发请求
                async with self.llm_semaphore:
                    # 准备OpenAI消息格式
                    openai_messages = [
                        {"role": msg["role"], "content": msg["content"]}
                        for msg in messages
                        if msg.get("role") and msg.get("content")
                    ]
                    
                    assistant_response = ""
                    
                    # 流式处理，传递Agent的特定配置
                    async for chunk in openai_service.stream_chat(
                        openai_messages,
                        model=model,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ):
                        yield chunk
                        
                        # 收集助手响应内容
                        if chunk.get("type") == "content":
                            assistant_response += chunk["data"]["content"]
                        
                        # 处理完成事件
                        elif chunk.get("type") == "done":
                            # 在会话锁内更新数据库
                            async with session_lock:
                                try:
                                    # 重新获取最新的对话记录
                                    fresh_conversation = db.query(Conversation).filter(
                                        Conversation.session_id == session_id
                                    ).first()
                                    
                                    if fresh_conversation:
                                        # 更新消息历史
                                        updated_messages = fresh_conversation.messages.copy() if fresh_conversation.messages else []
                                        
                                        # 添加用户消息和助手回复
                                        updated_messages.append(user_message)
                                        updated_messages.append({
                                            "role": "assistant",
                                            "content": assistant_response,
                                            "timestamp": datetime.utcnow().isoformat(),
                                            "tokens": chunk["data"].get("token_count")
                                        })
                                        
                                        fresh_conversation.messages = updated_messages
                                        fresh_conversation.update_time = datetime.utcnow()
                                        
                                        # 自动更新标题（如果是第一次对话）
                                        if fresh_conversation.title == "新对话" and len(updated_messages) <= 2:
                                            fresh_conversation.title = message[:50] + ("..." if len(message) > 50 else "")
                                        
                                        db.commit()
                                        
                                        logger.info(f"Updated conversation {conversation.id} with new messages")
                                        
                                except Exception as e:
                                    logger.error(f"Error updating conversation in database: {str(e)}")
                                    db.rollback()
                        
                        # 处理错误
                        elif chunk.get("type") == "error":
                            logger.error(f"Stream error for session {session_id}: {chunk['data']['error']}")
                            
            finally:
                # 清理活跃流标记
                self.active_streams.pop(session_id, None)
                
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            # 清理活跃流标记
            self.active_streams.pop(session_id, None)
            
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
    
    async def update_conversation_context(
        self,
        conversation_id: str,
        user_id: str,
        messages: List[Message],
        db: Session
    ) -> bool:
        """
        更新对话上下文
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            messages: 新的消息列表
            db: 数据库会话
            
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
                    "timestamp": msg.timestamp or datetime.utcnow().isoformat(),
                    "tokens": msg.tokens
                })
            
            conversation.messages = message_data
            conversation.update_time = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Updated context for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation context: {str(e)}")
            db.rollback()
            raise


# 全局服务实例
_conversation_service: Optional[ConversationService] = None

def get_conversation_service() -> ConversationService:
    """获取对话服务实例"""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service 