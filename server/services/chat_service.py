import asyncio
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session

from models.database import Conversation, ConversationStatus, AIProviderType
from services.openai_service import OpenAIService
from services.ai_provider_service import AIProviderService
from services.agent_service import AgentService
from services.conversation_service import ConversationService
from constants import get_settings
import logging

logger = logging.getLogger(__name__)

class ChatService:
    """实时对话服务类"""
    
    def __init__(self):
        # 从配置获取并发限制
        settings = get_settings()
        
        # 限制同时进行的LLM请求数量（避免API限制）
        self.llm_semaphore = asyncio.Semaphore(settings.max_concurrent_llm_requests)
        
        # 每个会话的锁字典
        self.session_locks: Dict[str, asyncio.Lock] = {}
        
        # 正在进行的流式响应记录
        self.active_streams: Dict[str, bool] = {}
        
        # 依赖服务实例
        self.agent_service = AgentService()
        self.conversation_service = ConversationService()
    
    def _get_session_lock(self, session_id: str) -> asyncio.Lock:
        """获取会话特定的锁"""
        if session_id not in self.session_locks:
            self.session_locks[session_id] = asyncio.Lock()
        return self.session_locks[session_id]
    
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
            # 创建对话记录
            conversation = await self.conversation_service.create_conversation(
                user_id=user_id,
                agent_id=agent_id,
                title=title,
                db=db
            )
            
            logger.info(f"Created conversation {conversation.id} for user {user_id}")
            
            # 发送对话创建完成事件
            yield {
                "type": "conversation_created",
                "data": {
                    "conversation_id": conversation.id,
                    "session_id": conversation.session_id,
                    "title": conversation.title,
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            # 如果有初始消息，进行流式处理
            if initial_message:
                async for chunk in self.stream_chat(
                    conversation_id=conversation.id,
                    user_id=user_id,
                    message=initial_message,
                    db=db
                ):
                    yield chunk
            
        except Exception as e:
            logger.error(f"Error in stream_create_conversation: {str(e)}")
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
    
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
            conversation = await self.conversation_service.get_conversation(
                conversation_id, user_id, db
            )
            
            if not conversation or conversation.status != ConversationStatus.ACTIVE:
                yield {
                    "type": "error",
                    "data": {"error": "Conversation not found or inactive"}
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
                    "timestamp": datetime.now().isoformat()
                }
                messages.append(user_message)
                
                # 获取AI服务配置
                openai_service, model, temperature, max_tokens = await self._get_ai_service_config(
                    conversation, user_id, messages, db
                )
                
                if not openai_service:
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
                    
                    # 流式处理
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
                                    # 构建要添加的消息
                                    messages_to_add = [user_message]
                                    
                                    if assistant_response:
                                        assistant_message = {
                                            "role": "assistant",
                                            "content": assistant_response,
                                            "timestamp": datetime.utcnow().isoformat(),
                                            "tokens": chunk["data"].get("token_count")
                                        }
                                        messages_to_add.append(assistant_message)
                                    
                                    # 调用conversation service更新对话
                                    await self.conversation_service.add_messages_to_conversation(
                                        conversation_id=conversation_id,
                                        user_id=user_id,
                                        messages=messages_to_add,
                                        db=db,
                                        auto_update_title=True
                                    )
                                    
                                    logger.info(f"Updated conversation {conversation_id} with new messages")
                                    
                                except Exception as e:
                                    logger.error(f"Error updating conversation in database: {str(e)}")
                        
                        # 处理错误
                        elif chunk.get("type") == "error":
                            logger.error(f"Stream error for conversation {conversation_id}: {chunk['data']['error']}")
                            # 仍然保存用户消息，即使AI回复失败
                            async with session_lock:
                                try:
                                    await self.conversation_service.add_messages_to_conversation(
                                        conversation_id=conversation_id,
                                        user_id=user_id,
                                        messages=[user_message],
                                        db=db,
                                        auto_update_title=True
                                    )
                                except Exception as e:
                                    logger.error(f"Error saving user message after stream error: {str(e)}")
                            
            finally:
                # 清理活跃流标记
                self.active_streams.pop(conversation.session_id, None)
                
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            # 清理活跃流标记
            try:
                conv = await self.conversation_service.get_conversation(conversation_id, user_id, db)
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
    
    async def _get_ai_service_config(
        self,
        conversation: Conversation,
        user_id: str,
        messages: List[Dict[str, Any]],
        db: Session
    ) -> tuple[Optional[OpenAIService], Optional[str], Optional[float], Optional[int]]:
        """
        获取AI服务配置
        
        Args:
            conversation: 对话对象
            user_id: 用户ID
            messages: 消息历史（会被修改以添加预设消息）
            db: 数据库会话
            
        Returns:
            tuple: (openai_service, model, temperature, max_tokens)
        """
        openai_service = None
        model = None
        temperature = None
        max_tokens = None
        
        # 获取Agent配置
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
                    
                    # 添加预设消息到消息历史开头
                    if agent.preset_messages:
                        preset_msgs = [
                            {"role": msg.get("role", "system"), "content": msg.get("content", "")}
                            for msg in agent.preset_messages
                        ]
                        # 将预设消息插入到消息列表的开头
                        messages[:-1] = preset_msgs + messages[:-1]  # 保留最后一条用户消息
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
        
        return openai_service, model, temperature, max_tokens