import asyncio
import uuid
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.orm import Session
from enum import Enum

from models.database import ConversationStatus
from services.ai_provider_service import AIProviderService
from services.conversation_service import get_conversation_service_singleton
from services.agent_service import get_agent_service_singleton
from constants import get_settings
import logging

logger = logging.getLogger(__name__)

class TaskState(Enum):
    CREATED = "created"
    RUNNING = "running"
    FINISHED = "finished"
    FAILED = "failed"

class StreamTask:
    def __init__(self, task_id: str, user_id: str, message: str, agent_id: str, 
                 conversation_id: Optional[str] = None, title: Optional[str] = None,
                 db: Session = None, provider_service: AIProviderService = None):
        self.task_id = task_id
        self.user_id = user_id
        self.message = message
        self.agent_id = agent_id
        self.conversation_id = conversation_id
        self.title = title
        self.db = db
        self.provider_service = provider_service
        
        self.state = TaskState.CREATED
        self.result_queue = asyncio.Queue()
        self.created_at = datetime.now()
        self.started_at = None
        self.finished_at = None
        self.conversation = None
        self.error = None
    
    def set_running(self):
        self.state = TaskState.RUNNING
        self.started_at = datetime.now()
    
    def set_finished(self):
        self.state = TaskState.FINISHED
        self.finished_at = datetime.now()
    
    def set_failed(self, error: str):
        self.state = TaskState.FAILED
        self.error = error
        self.finished_at = datetime.now()
    
    async def put_result(self, data: Dict[str, Any]):
        await self.result_queue.put(data)
    
    async def get_result(self):
        return await self.result_queue.get()
    
    def has_results(self) -> bool:
        return not self.result_queue.empty()
    
    def clear_queue(self):
        while not self.result_queue.empty():
            try:
                self.result_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

class StreamPool:
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.tasks: Dict[str, StreamTask] = {}
        self.task_queue = asyncio.Queue()
        self.workers = []
        self.running = False
    
    async def start(self):
        if self.running:
            return
        self.running = True
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        logger.info(f"StreamPool started with {self.max_workers} workers")
    
    async def stop(self):
        if not self.running:
            return
        self.running = False
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        logger.info("StreamPool stopped")
    
    async def submit_task(self, task: StreamTask) -> str:
        self.tasks[task.task_id] = task
        await self.task_queue.put(task.task_id)
        logger.info(f"Task {task.task_id} submitted to pool")
        return task.task_id
    
    def get_task(self, task_id: str) -> Optional[StreamTask]:
        return self.tasks.get(task_id)
    
    def remove_task(self, task_id: str):
        task = self.tasks.pop(task_id, None)
        if task:
            task.clear_queue()
            logger.info(f"Task {task_id} removed from pool")
    
    async def _worker(self, worker_name: str):
        logger.info(f"StreamPool worker {worker_name} started")
        try:
            while self.running:
                try:
                    task_id = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                    task = self.tasks.get(task_id)
                    if task:
                        await self._process_task(task, worker_name)
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Worker {worker_name} error: {str(e)}")
        except asyncio.CancelledError:
            pass
        finally:
            logger.info(f"StreamPool worker {worker_name} stopped")
    
    async def _process_task(self, task: StreamTask, worker_name: str):
        logger.info(f"Worker {worker_name} processing task {task.task_id}")
        try:
            task.set_running()
            await self._execute_stream_task(task)
            task.set_finished()
        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {str(e)}")
            task.set_failed(str(e))
            await task.put_result({
                "type": "error",
                "data": {"error": str(e), "timestamp": datetime.now().isoformat()}
            })
        finally:
            await asyncio.sleep(60)
            self.remove_task(task.task_id)
    
    async def _execute_stream_task(self, task: StreamTask):
        conversation = None
        
        try:
            agent_srv = get_agent_service_singleton()
            agent = await agent_srv.get_agent(task.db, task.agent_id, task.user_id)
            
            if not agent:
                await task.put_result({
                    "type": "error",
                    "data": {"error": f"未找到 ID 为 {task.agent_id} 的 Agent"}
                })
                return
            
            provider = task.provider_service.get_provider_by_name(task.db, agent.provider)
            if not provider:
                await task.put_result({
                    "type": "error",
                    "data": {"error": f"Agent provider '{agent.provider}' not found or not supported"}
                })
                return
            
            conversation_srv = get_conversation_service_singleton()
            
            if task.conversation_id:
                conversation = await conversation_srv.get_conversation(
                    task.db, task.conversation_id, task.user_id
                )
                if not conversation or conversation.status != ConversationStatus.ACTIVE:
                    await task.put_result({
                        "type": "error",
                        "data": {"error": "会话不存在或已失效"}
                    })
                    return
            else:
                conversation = await conversation_srv.create_conversation(
                    user_id=task.user_id,
                    agent_id=task.agent_id,
                    title=task.title if task.title else "新对话",
                    db=task.db
                )
                
                logger.info(f"用户 {task.user_id} 创建了会话 {conversation.id}")
                
                await task.put_result({
                    "type": "conversation_created",
                    "data": {
                        "conversation_id": conversation.id,
                        "session_id": conversation.session_id,
                        "title": conversation.title,
                        "timestamp": datetime.now().isoformat()
                    }
                })
            
            task.conversation = conversation
            messages = conversation.messages.copy() if conversation.messages else []
            is_new_conversation = len(messages) == 0

            if agent.preset_messages:
                preset_msgs = [
                    {"role": msg.get("role", "system"), "content": msg.get("content", "")}
                    for msg in agent.preset_messages
                ]
                messages = preset_msgs + messages

            model = agent.model
            temperature = agent.temperature
            max_tokens = agent.max_tokens
            
            save_messages = []
            if agent.app_preset.get("send_greetings_to_ai", False) and is_new_conversation:
                welcome_msg = {
                    "role": "assistant",
                    "content": agent.app_preset.get("greetings", ""),
                    "timestamp": datetime.now().isoformat()
                }
                messages.append(welcome_msg)
                save_messages.append(welcome_msg)

            user_message = {
                "role": "user",
                "content": task.message,
                "timestamp": datetime.now().isoformat()
            }
            messages.append(user_message)
            save_messages.append(user_message)
            
            await conversation_srv.add_messages_to_conversation(
                db=task.db,
                conversation_id=conversation.id,
                user_id=task.user_id,
                messages=save_messages,
            )
            logger.info(f"Saved user message to conversation {conversation.id}")
            
            openai_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in messages
                if msg.get("role") and msg.get("content")
            ]
            
            assistant_response = ""
            assistant_reasoning = ""
            has_done = False

            async for chunk in provider.stream_chat(
                openai_messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            ):
                if chunk.get("type") == "content":
                    assistant_response += chunk["data"].get("content", "")
                    assistant_reasoning += chunk["data"].get("reasoning_content", "")

                elif chunk.get("type") == "error":
                    logger.error(f"会话 {conversation.id} 流式处理错误: {chunk['data']['error']}")
                
                elif chunk.get("type") == "done":
                    has_done = True
                
                await task.put_result(chunk)
            
            if not has_done:
                await task.put_result({
                    "type": "done",
                    "data": {
                        "finish_reason": "completed",
                        "full_response": assistant_response,
                        "full_reasoning": assistant_reasoning,
                        "timestamp": datetime.now().isoformat(),
                    }
                })

            if assistant_response:
                assistant_message = {
                    "role": "assistant",
                    "content": assistant_response,
                    "reasoning_content": assistant_reasoning,
                    "timestamp": datetime.now().isoformat(),
                    "tokens": chunk["data"].get("token_count") if 'chunk' in locals() else None
                }
                
                await conversation_srv.add_messages_to_conversation(
                    db=task.db,
                    conversation_id=conversation.id,
                    user_id=task.user_id,
                    messages=[assistant_message],
                )
                
                logger.info(f"会话 {conversation.id} 保存AI回复成功")
                        
        except Exception as e:
            logger.error(f"Error in _execute_stream_task: {str(e)}")
            await task.put_result({
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            })

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
        
        # 初始化流处理池
        self.stream_pool = StreamPool(max_workers=settings.max_concurrent_llm_requests)
        
        # 启动流处理池的任务
        self._pool_start_task = None
        
    async def _ensure_pool_started(self):
        """确保流处理池已启动"""
        if not self.stream_pool.running and self._pool_start_task is None:
            self._pool_start_task = asyncio.create_task(self.stream_pool.start())
            await self._pool_start_task
    
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
        流式聊天 - 使用流池处理
        
        Args:
            user_id: 用户ID
            message: 用户消息
            agent_id: Agent ID
            conversation_id: 对话ID（为空时自动创建）
            title: 对话标题（仅在创建新对话时使用）
            db: 数据库会话
            provider_service: AI提供者服务
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        try:
            # 确保流处理池已启动
            await self._ensure_pool_started()
            
            # 创建流任务
            task_id = str(uuid.uuid4())
            task = StreamTask(
                task_id=task_id,
                user_id=user_id,
                message=message,
                agent_id=agent_id,
                conversation_id=conversation_id,
                title=title,
                db=db,
                provider_service=provider_service
            )
            
            # 提交任务到流池
            await self.stream_pool.submit_task(task)
            
            # 流式返回任务结果
            while True:
                try:
                    # 等待结果，超时后检查任务状态
                    result = await asyncio.wait_for(task.get_result(), timeout=30.0)
                    yield result
                    
                    # 如果收到完成或错误信息，结束流
                    if result.get("type") in ["done", "error"]:
                        break
                        
                except asyncio.TimeoutError:
                    # 检查任务状态
                    if task.state in [TaskState.FINISHED, TaskState.FAILED]:
                        break
                    # 如果任务还在运行但没有新结果，继续等待
                    continue
                    
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            }

_chat_service_singleton = None

def get_chat_service_singleton():
    global _chat_service_singleton
    if _chat_service_singleton is None:
        _chat_service_singleton = ChatService()
    return _chat_service_singleton
