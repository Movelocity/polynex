import asyncio
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session

from models.database import ConversationStatus
from services.ai_provider_service import AIProviderService
from services.conversation_service import get_conversation_service_singleton
from services.agent_service import get_agent_service_singleton
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
        
    
    def _get_session_lock(self, session_id: str) -> asyncio.Lock:
        """获取会话特定的锁"""
        if session_id not in self.session_locks:
            self.session_locks[session_id] = asyncio.Lock()
        return self.session_locks[session_id]

    async def stream_chat(
        self,
        user_id: str,
        message: str,
        agent_id: str,
        conversation_id: Optional[str] = None,
        title: Optional[str] = None,
        db: Session = None,
        provider_service: AIProviderService = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式聊天 - 核心功能
        
        Args:
            user_id: 用户ID
            message: 用户消息
            agent_id: Agent ID
            conversation_id: 对话ID（为空时自动创建）
            title: 对话标题（仅在创建新对话时使用）
            db: 数据库会话
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        conversation = None
        session_lock = None
        
        try:
            # 首先获取 Agent
            agent_srv = get_agent_service_singleton()
            agent = await agent_srv.get_agent(db, agent_id, user_id)
            conversation_srv = get_conversation_service_singleton()
            if not agent:
                yield {
                    "type": "error",
                    "data": {"error": f"未找到 ID 为 {agent_id} 的 Agent"}
                }
                return
            
            # 获取或创建对话
            if conversation_id:
                 # 获取现有对话
                conversation = await conversation_srv.get_conversation(
                    db, conversation_id, user_id
                )
                
                if not conversation or conversation.status != ConversationStatus.ACTIVE:
                    yield {
                        "type": "error",
                        "data": {"error": "会话不存在或已失效"}
                    }
                    return
            else:
                # 创建新对话
                conversation_srv = get_conversation_service_singleton()
                conversation = await conversation_srv.create_conversation(
                    user_id=user_id,
                    agent_id=agent_id,
                    title=title if title else "新对话",
                    db=db
                )
                
                logger.info(f"用户 {user_id} 创建了会话 {conversation.id}")
                
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
            
            # 准备消息历史
            messages = conversation.messages.copy() if conversation.messages else []
            
            # 添加用户消息
            user_message = {
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            }
            messages.append(user_message)
            
            # 获取Agent对应的AI服务
            provider = provider_service.get_provider_by_name(db, agent.provider)
            
            if not provider:
                yield {
                    "type": "error",
                    "data": {"error": f"Agent provider '{agent.provider}' not found or not supported"}
                }
                return
            
            # 使用Agent的特定配置覆盖默认值
            model = agent.model
            temperature = agent.temperature
            max_tokens = agent.max_tokens
            
            # 添加预设消息到消息历史开头
            if agent.preset_messages:
                preset_msgs = [
                    {"role": msg.get("role", "system"), "content": msg.get("content", "")}
                    for msg in agent.preset_messages
                ]
                # 将预设消息插入到消息列表的开头
                messages[:-1] = preset_msgs + messages[:-1]  # 保留最后一条用户消息
            
            # 第一次存储：保存用户消息
            async with session_lock:
                try:
                    await conversation_srv.add_messages_to_conversation(
                        conversation_id=conversation.id,
                        user_id=user_id,
                        messages=[user_message],
                        db=db
                    )
                    logger.info(f"Saved user message to conversation {conversation.id}")
                except Exception as e:
                    logger.error(f"Error saving user message: {str(e)}")
                    yield {
                        "type": "error",
                        "data": {"error": f"Failed to save user message: {str(e)}"}
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
                async for chunk in provider.stream_chat(
                    openai_messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens
                ):
                    yield chunk
                    
                    # 收集助手响应内容
                    if chunk.get("type") == "content":
                        assistant_response += chunk["data"]["content"]

                    # 处理错误
                    elif chunk.get("type") == "error":
                        logger.error(f"会话 {conversation.id} 流式处理错误: {chunk['data']['error']}")

                # 处理完成事件 - 第二次存储：保存AI回复
                async with session_lock:
                    try:
                        if assistant_response:
                            assistant_message = {
                                "role": "assistant",
                                "content": assistant_response,
                                "timestamp": datetime.now().isoformat(),
                                "tokens": chunk["data"].get("token_count")
                            }
                            
                            await conversation_srv.add_messages_to_conversation(
                                db=db,
                                conversation_id=conversation.id,
                                user_id=user_id,
                                messages=[assistant_message],
                            )
                            
                            logger.info(f"会话 {conversation.id} 保存AI回复成功")
                            
                    except Exception as e:
                        logger.error(f"保存AI回复失败: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        finally:
            # 清理活跃流标记
            if conversation and conversation.session_id:
                self.active_streams.pop(conversation.session_id, None)

_chat_service_singleton = None

def get_chat_service_singleton():
    global _chat_service_singleton
    if _chat_service_singleton is None:
        _chat_service_singleton = ChatService()
    return _chat_service_singleton
