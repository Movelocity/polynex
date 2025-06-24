import asyncio
import json
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import Conversation, ConversationStatus, AIProviderType
from models.database import Agent
from fields.schemas import (
    Message, ConversationCreate, ConversationUpdate, 
    ConversationSummary, ChatRequest, MessageRole,
    AgentCreate, AgentUpdate
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
                agent = db.query(Agent).filter(Agent.id == conversation.agent_id).first()
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
                    agent = db.query(Agent).filter(Agent.id == conversation.agent_id).first()
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

    # ===== Agent相关方法 =====
    
    async def create_agent(
        self,
        agent_data: AgentCreate,
        user_id: str,
        db: Session
    ) -> Agent:
        """
        创建新的AI代理
        
        Args:
            agent_data: Agent创建数据
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            Agent: 创建的Agent对象
            
        Raises:
            ValueError: 当Agent ID已存在或供应商不存在时
        """
        try:
            # 检查agent_id是否已存在
            existing = db.query(Agent).filter(
                Agent.agent_id == agent_data.agent_id
            ).first()
            if existing:
                raise ValueError(f"Agent ID '{agent_data.agent_id}' already exists")
            
            # 验证供应商是否存在
            provider_service = AIProviderService(db)
            provider_config = provider_service.get_provider_config_by_name(agent_data.provider)
            if not provider_config:
                raise ValueError(f"Provider '{agent_data.provider}' not found")
            
            # 验证模型是否在供应商支持的模型列表中
            if agent_data.model and provider_config.models and agent_data.model not in provider_config.models:
                raise ValueError(f"Model '{agent_data.model}' is not supported by provider '{agent_data.provider}'")
            
            # 如果设置为默认agent，需要先取消其他默认agent
            if agent_data.is_default:
                db.query(Agent).filter(
                    Agent.is_default == True,
                    Agent.user_id == user_id
                ).update({"is_default": False})
            
            # 创建Agent
            agent = Agent(
                agent_id=agent_data.agent_id,
                user_id=user_id,
                provider=agent_data.provider,
                model=agent_data.model,
                top_p=agent_data.top_p,
                temperature=agent_data.temperature,
                max_tokens=agent_data.max_tokens,
                preset_messages=agent_data.preset_messages,
                app_preset=agent_data.app_preset,
                is_public=agent_data.is_public,
                is_default=agent_data.is_default
            )
            
            db.add(agent)
            db.commit()
            db.refresh(agent)
            
            logger.info(f"Created agent {agent.agent_id} for user {user_id}")
            return agent
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating agent: {str(e)}")
            raise
    
    async def get_user_agents(
        self,
        user_id: str,
        db: Session,
        include_public: bool = True,
        limit: int = 20,
        offset: int = 0
    ) -> List[Agent]:
        """
        获取用户的Agent列表
        
        Args:
            user_id: 用户ID
            include_public: 是否包含公开的Agent
            limit: 限制数量
            offset: 偏移量
            db: 数据库会话
            
        Returns:
            List[Agent]: Agent列表
        """
        try:
            query = db.query(Agent)
            
            if include_public:
                query = query.filter(
                    (Agent.user_id == user_id) | (Agent.is_public == True)
                )
            else:
                query = query.filter(Agent.user_id == user_id)
            
            agents = query.order_by(
                Agent.is_default.desc(),
                Agent.create_time.desc()
            ).offset(offset).limit(limit).all()
            
            return agents
            
        except Exception as e:
            logger.error(f"Error getting user agents: {str(e)}")
            raise
    
    async def get_public_agents(
        self,
        db: Session,
        limit: int = 20,
        offset: int = 0
    ) -> List[Agent]:
        """
        获取公开的Agent列表
        
        Args:
            limit: 限制数量
            offset: 偏移量
            db: 数据库会话
            
        Returns:
            List[Agent]: 公开的Agent列表
        """
        try:
            agents = db.query(Agent).filter(
                Agent.is_public == True
            ).order_by(
                Agent.create_time.desc()
            ).offset(offset).limit(limit).all()
            
            return agents
            
        except Exception as e:
            logger.error(f"Error getting public agents: {str(e)}")
            raise
    
    async def get_agent(
        self,
        agent_id: str,
        user_id: str,
        db: Session
    ) -> Optional[Agent]:
        """
        获取指定的Agent
        
        Args:
            agent_id: Agent ID
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            Optional[Agent]: Agent对象或None
        """
        try:
            # 可以获取自己的或公开的Agent
            agent = db.query(Agent).filter(
                and_(
                    Agent.agent_id == agent_id,
                    (Agent.user_id == user_id) | (Agent.is_public == True)
                )
            ).first()
            
            return agent
            
        except Exception as e:
            logger.error(f"Error getting agent {agent_id}: {str(e)}")
            raise
    
    async def update_agent(
        self,
        agent_id: str,
        agent_update: AgentUpdate,
        user_id: str,
        db: Session
    ) -> Optional[Agent]:
        """
        更新Agent
        
        Args:
            agent_id: Agent ID
            agent_update: 更新数据
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            Optional[Agent]: 更新后的Agent对象或None
            
        Raises:
            ValueError: 当供应商不存在时
        """
        try:
            # 只能更新自己的Agent
            agent = db.query(Agent).filter(
                and_(
                    Agent.agent_id == agent_id,
                    Agent.user_id == user_id
                )
            ).first()
            
            if not agent:
                return None
            
            # 如果更新了供应商，验证供应商是否存在
            if agent_update.provider and agent_update.provider != agent.provider:
                provider_service = AIProviderService(db)
                provider_config = provider_service.get_provider_config_by_name(agent_update.provider)
                if not provider_config:
                    raise ValueError(f"Provider '{agent_update.provider}' not found")
                
                # 验证模型是否在新供应商支持的模型列表中
                model_to_check = agent_update.model or agent.model
                if model_to_check and provider_config.models and model_to_check not in provider_config.models:
                    raise ValueError(f"Model '{model_to_check}' is not supported by provider '{agent_update.provider}'")
            
            # 如果设置为默认agent，需要先取消其他默认agent
            if agent_update.is_default:
                db.query(Agent).filter(
                    Agent.is_default == True,
                    Agent.user_id == user_id,
                    Agent.id != agent.id
                ).update({"is_default": False})
            
            # 更新字段
            update_data = agent_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            
            agent.update_time = datetime.utcnow()
            db.commit()
            db.refresh(agent)
            
            logger.info(f"Updated agent {agent_id}")
            return agent
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating agent {agent_id}: {str(e)}")
            raise
    
    async def delete_agent(
        self,
        agent_id: str,
        user_id: str,
        db: Session
    ) -> bool:
        """
        删除Agent
        
        Args:
            agent_id: Agent ID
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            bool: 是否成功删除
        """
        try:
            # 只能删除自己的Agent
            agent = db.query(Agent).filter(
                and_(
                    Agent.agent_id == agent_id,
                    Agent.user_id == user_id
                )
            ).first()
            
            if not agent:
                return False
            
            db.delete(agent)
            db.commit()
            
            logger.info(f"Deleted agent {agent_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting agent {agent_id}: {str(e)}")
            raise


# 全局服务实例
_conversation_service: Optional[ConversationService] = None

def get_conversation_service() -> ConversationService:
    """获取对话服务实例"""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service 