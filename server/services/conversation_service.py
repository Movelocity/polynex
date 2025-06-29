import asyncio
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import Conversation, ConversationStatus, AIProviderType
from fields.schemas import (Message, ConversationUpdate)
from services.openai_service import OpenAIService
from services.ai_provider_service import AIProviderService
from services.agent_service import AgentService
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
        
        # Agent服务实例
        self.agent_service = AgentService()
    
    def _get_session_lock(self, session_id: str) -> asyncio.Lock:
        """获取会话特定的锁"""
        if session_id not in self.session_locks:
            self.session_locks[session_id] = asyncio.Lock()
        return self.session_locks[session_id]
    
    async def create_conversation(
        self, 
        user_id: str, 
        agent_id: Optional[str] = None,
        title: Optional[str] = None,
        initial_message: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        创建新对话
        
        Args:
            user_id: 用户ID
            agent_id: Agent ID
            title: 对话标题
            initial_message: 初始消息
            db: 数据库会话
            
        Returns:
            Dict[str, Any]: 创建的对话信息，包含AI回复（如果有初始消息）
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
            
            # 如果有初始消息，处理AI回复
            if initial_message:
                try:
                    # 生成AI回复（_generate_ai_response内部会处理消息历史）
                    ai_response = await self._generate_ai_response(
                        conversation, initial_message, db
                    )
                    
                    # 准备消息列表
                    user_message = {
                        "role": "user",
                        "content": initial_message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    messages = [user_message]
                    
                    if ai_response:
                        assistant_message = {
                            "role": "assistant",
                            "content": ai_response,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        messages.append(assistant_message)
                    
                    # 更新对话的消息记录
                    conversation.messages = messages
                    
                    # 如果标题是默认的，用第一条消息生成标题
                    if conversation.title == "新对话":
                        conversation.title = initial_message[:50] + ("..." if len(initial_message) > 50 else "")
                    
                    conversation.update_time = datetime.utcnow()
                    db.commit()
                    db.refresh(conversation)
                        
                except Exception as e:
                    logger.error(f"Error generating AI response: {str(e)}")
                    # 即使AI回复失败，也要保存用户消息
                    user_message = {
                        "role": "user",
                        "content": initial_message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    conversation.messages = [user_message]
                    conversation.update_time = datetime.utcnow()
                    db.commit()
                    db.refresh(conversation)
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            db.rollback()
            raise
    
    async def _generate_ai_response(
        self,
        conversation: Conversation,
        user_message: str,
        db: Session
    ) -> Optional[str]:
        """
        生成AI回复
        
        Args:
            conversation: 对话对象
            user_message: 用户消息
            db: 数据库会话
            
        Returns:
            Optional[str]: AI回复内容
        """
        try:
            # 准备消息历史，包含之前的对话
            messages = conversation.messages.copy() if conversation.messages else []
            
            # 添加当前用户消息
            current_user_message = {
                "role": "user", 
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            }
            messages.append(current_user_message)
            
            # 获取 Agent 配置
            openai_service = None
            if conversation.agent_id:
                agent = await self.agent_service.get_agent_by_id(conversation.agent_id, conversation.user_id, db)
                if agent:
                    # 使用新的供应商配置系统
                    provider_service = AIProviderService(db)
                    provider_config = provider_service.get_provider_config_by_name(agent.provider)
                    
                    if provider_config and provider_config.provider_type in [AIProviderType.OPENAI, AIProviderType.CUSTOM]:
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
                        logger.warning(f"Agent {agent.id} uses provider '{agent.provider}' which is not found or not OpenAI-compatible")
            
            # 如果没有Agent配置或Agent配置无效，使用默认配置
            if not openai_service:
                provider_service = AIProviderService(db)
                default_config = provider_service.get_default_provider_config()
                if not default_config:
                    default_config = provider_service.get_best_provider_config(AIProviderType.OPENAI)
                
                if default_config:
                    openai_service = OpenAIService(
                        provider_config=default_config,
                        db=db
                    )
                    model = default_config.default_model
                    temperature = default_config.default_temperature
                    max_tokens = default_config.default_max_tokens
                else:
                    logger.error("No valid AI provider configuration found")
                    return None
            
            # 限制并发请求
            async with self.llm_semaphore:
                # 准备OpenAI消息格式（只保留role和content）
                openai_messages = [
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                    for msg in messages
                    if msg.get("role") and msg.get("content")
                ]
                
                # 调用AI服务获取回复
                response = await openai_service.chat_completion(
                    openai_messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    user_id=conversation.user_id,
                    conversation_id=conversation.id,
                    agent_id=conversation.agent_id
                )
                
                return response.get("content")
                
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return None
    
    async def get_user_conversations(
        self, 
        user_id: str, 
        limit: int = 50,
        offset: int = 0,
        db: Session = None
    ) -> List[Conversation]:
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
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error getting conversations: {str(e)}")
            raise
    
    async def get_conversation(
        self, 
        conversation_id: str, 
        user_id: str, 
        db: Session
    ) -> Optional[Conversation]:
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
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            raise
    
    async def update_conversation_title(
        self,
        conversation_id: str,
        title: str,
        user_id: str,
        db: Session
    ) -> bool:
        """
        更新对话标题
        
        Args:
            conversation_id: 对话ID
            title: 新标题
            user_id: 用户ID
            db: 数据库会话
            
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
            conversation.update_time = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Updated title for conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation title: {str(e)}")
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
    
    async def chat(
        self,
        conversation_id: str,
        user_message: str,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        发送聊天消息并获取回复
        
        Args:
            conversation_id: 对话ID
            user_message: 用户消息
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            Dict[str, Any]: 聊天响应
        """
        try:
            # 获取对话
            conversation = await self.get_conversation(conversation_id, user_id, db)
            if not conversation:
                raise Exception("Conversation not found")
            
            # 获取会话锁，防止并发修改
            session_lock = self._get_session_lock(conversation.session_id)
            
            async with session_lock:
                # 重新获取最新的对话状态
                fresh_conversation = db.query(Conversation).filter(
                    Conversation.id == conversation_id
                ).first()
                
                if not fresh_conversation:
                    raise Exception("Conversation not found")
                
                # 生成AI回复
                ai_response = await self._generate_ai_response(
                    fresh_conversation, user_message, db
                )
                
                if not ai_response:
                    raise Exception("Failed to generate AI response")
                
                # 更新对话消息（_generate_ai_response已经包含了历史消息+用户消息，我们只需要添加AI回复）
                updated_messages = fresh_conversation.messages.copy() if fresh_conversation.messages else []
                
                # 添加用户消息
                user_msg = {
                    "role": "user",
                    "content": user_message,
                    "timestamp": datetime.utcnow().isoformat()
                }
                updated_messages.append(user_msg)
                
                # 添加AI回复
                assistant_msg = {
                    "role": "assistant",
                    "content": ai_response,
                    "timestamp": datetime.utcnow().isoformat()
                }
                updated_messages.append(assistant_msg)
                
                fresh_conversation.messages = updated_messages
                fresh_conversation.update_time = datetime.utcnow()
                
                # 自动更新标题（如果是第一次对话）
                if fresh_conversation.title == "新对话" and len(updated_messages) <= 2:
                    fresh_conversation.title = user_message[:50] + ("..." if len(user_message) > 50 else "")
                
                db.commit()
                
                logger.info(f"Updated conversation {conversation_id} with new messages")
                
                return {
                    "response": ai_response,
                    "conversation_id": conversation_id
                }
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            db.rollback()
            raise
    
    async def sendMessage(
        self,
        conversation_id: str,
        request: Dict[str, str]
    ) -> Dict[str, str]:
        """
        发送消息的别名方法，为了兼容前端调用
        """
        # 这个方法应该委托给chat方法
        return await self.chat(
            conversation_id=conversation_id,
            user_message=request["message"],
            user_id="",  # 需要从上下文获取
            db=None  # 需要从上下文获取
        )
    
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
    
    async def stream_chat(
        self,
        conversation_id: str,
        user_id: str,
        message: str,
        db: Session
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式聊天
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            message: 用户消息
            db: 数据库会话
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        try:
            # 获取对话记录
            conversation = db.query(Conversation).filter(
                and_(
                    Conversation.id == conversation_id,
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
            
            session_lock = self._get_session_lock(conversation.session_id)
            
            # 检查是否已有活跃的流
            if conversation.session_id in self.active_streams:
                yield {
                    "type": "error",
                    "data": {"error": "Another stream is active for this session"}
                }
                return
            
            # 标记流为活跃状态
            self.active_streams[conversation.session_id] = True
            
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
                    agent = await self.agent_service.get_agent_by_id(conversation.agent_id, user_id, db)
                    if agent:
                        # 使用新的供应商配置系统
                        provider_service = AIProviderService(db)
                        provider_config = provider_service.get_provider_config_by_name(agent.provider)
                        
                        if provider_config and provider_config.provider_type in [AIProviderType.OPENAI, AIProviderType.CUSTOM]:
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
                            logger.warning(f"Agent {agent.id} uses provider '{agent.provider}' which is not found or not OpenAI-compatible")
                
                # 如果没有Agent配置或Agent配置无效，使用默认配置
                if not openai_service:
                    provider_service = AIProviderService(db)
                    default_config = provider_service.get_default_provider_config()
                    if not default_config:
                        default_config = provider_service.get_best_provider_config(AIProviderType.OPENAI)
                    
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
                        max_tokens=max_tokens,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        agent_id=conversation.agent_id
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
                                        Conversation.id == conversation_id
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
                            logger.error(f"Stream error for conversation {conversation_id}: {chunk['data']['error']}")
                            
            finally:
                # 清理活跃流标记
                self.active_streams.pop(conversation.session_id, None)
                
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            # 清理活跃流标记（需要先获取conversation来得到session_id）
            try:
                conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conv:
                    self.active_streams.pop(conv.session_id, None)
            except:
                pass
            
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

    async def search_conversations(
        self,
        user_id: str,
        query: str,
        db: Session,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        搜索用户的对话
        
        Args:
            user_id: 用户ID
            query: 搜索关键词
            db: 数据库会话
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            Dict[str, Any]: 搜索结果，包含结果列表和总数
        """
        try:
            # 获取用户的所有对话
            conversations = db.query(Conversation).filter(
                and_(
                    Conversation.user_id == user_id,
                    Conversation.status != ConversationStatus.DELETED
                )
            ).order_by(Conversation.update_time.desc()).all()
            
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
            
            # 分页
            total_count = len(search_results)
            paginated_results = search_results[offset:offset + limit]
            
            return {
                'results': paginated_results,
                'total_count': total_count,
                'query': query
            }
            
        except Exception as e:
            logger.error(f"Error searching conversations: {str(e)}")
            raise

    async def stream_create_conversation(
        self, 
        user_id: str, 
        agent_id: Optional[str] = None,
        title: Optional[str] = None,
        initial_message: Optional[str] = None,
        db: Session = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式创建新对话并处理初始消息
        
        Args:
            user_id: 用户ID
            agent_id: Agent ID
            title: 对话标题
            initial_message: 初始消息
            db: 数据库会话
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        try:
            # 先创建基本的对话记录
            session_id = str(uuid.uuid4())
            
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
            
            # 发送对话创建完成事件
            yield {
                "type": "conversation_created",
                "data": {
                    "conversation_id": conversation.id,
                    "session_id": conversation.session_id,
                    "title": conversation.title,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # 如果有初始消息，进行流式处理
            if initial_message:
                # 获取会话锁
                session_lock = self._get_session_lock(conversation.session_id)
                
                # 检查是否已有活跃的流
                if conversation.session_id in self.active_streams:
                    yield {
                        "type": "error",
                        "data": {"error": "Another stream is active for this session"}
                    }
                    return
                
                # 标记流为活跃状态
                self.active_streams[conversation.session_id] = True
                
                try:
                    # 准备消息历史
                    messages = []
                    
                    # 添加用户消息
                    user_message = {
                        "role": "user",
                        "content": initial_message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    messages.append(user_message)
                    
                    # 获取 Agent 配置
                    openai_service = None
                    model = None
                    temperature = None
                    max_tokens = None
                    
                    if conversation.agent_id:
                        agent = await self.agent_service.get_agent_by_id(conversation.agent_id, user_id, db)
                        if agent:
                            # 供应商配置系统
                            provider_service = AIProviderService(db)
                            provider_config = provider_service.get_provider_config_by_name(agent.provider)
                            
                            if provider_config and provider_config.provider_type in [AIProviderType.OPENAI, AIProviderType.CUSTOM]:
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
                                logger.warning(f"Agent {agent.id} uses provider '{agent.provider}' which is not found or not OpenAI-compatible")
                    
                    # 如果没有Agent配置或Agent配置无效，使用默认配置
                    if not openai_service:
                        provider_service = AIProviderService(db)
                        default_config = provider_service.get_default_provider_config()
                        if not default_config:
                            default_config = provider_service.get_best_provider_config(AIProviderType.OPENAI)
                        
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
                                "data": {"error": "No valid AI provider configuration found"}
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
                            max_tokens=max_tokens,
                            user_id=user_id,
                            conversation_id=conversation.id,
                            agent_id=conversation.agent_id
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
                                            Conversation.id == conversation.id
                                        ).first()
                                        
                                        if fresh_conversation:
                                            # 构建完整的消息列表
                                            updated_messages = []
                                            updated_messages.append(user_message)
                                            
                                            if assistant_response:
                                                assistant_message = {
                                                    "role": "assistant",
                                                    "content": assistant_response,
                                                    "timestamp": datetime.utcnow().isoformat()
                                                }
                                                updated_messages.append(assistant_message)
                                            
                                            fresh_conversation.messages = updated_messages
                                            
                                            # 自动更新标题（如果是默认标题）
                                            if fresh_conversation.title == "新对话":
                                                fresh_conversation.title = initial_message[:50] + ("..." if len(initial_message) > 50 else "")
                                            
                                            fresh_conversation.update_time = datetime.utcnow()
                                            db.commit()
                                            
                                            logger.info(f"Updated conversation {conversation.id} with initial message and AI response")
                                            
                                    except Exception as e:
                                        logger.error(f"Error updating conversation in stream: {str(e)}")
                                        db.rollback()
                            
                            # 处理错误
                            elif chunk.get("type") == "error":
                                logger.error(f"Stream error for new conversation {conversation.id}: {chunk['data']['error']}")
                                # 仍然保存用户消息，即使AI回复失败
                                async with session_lock:
                                    try:
                                        fresh_conversation = db.query(Conversation).filter(
                                            Conversation.id == conversation.id
                                        ).first()
                                        if fresh_conversation:
                                            fresh_conversation.messages = [user_message]
                                            if fresh_conversation.title == "新对话":
                                                fresh_conversation.title = initial_message[:50] + ("..." if len(initial_message) > 50 else "")
                                            fresh_conversation.update_time = datetime.utcnow()
                                            db.commit()
                                    except Exception as e:
                                        logger.error(f"Error saving user message after stream error: {str(e)}")
                                        db.rollback()
                
                finally:
                    # 清理活跃流标记
                    self.active_streams.pop(conversation.session_id, None)
            
        except Exception as e:
            logger.error(f"Error in stream_create_conversation: {str(e)}")
            db.rollback()
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
