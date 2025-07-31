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
    DISCONNECTED = "disconnected"  # 客户端断开连接但任务继续运行

class StreamTask:
    def __init__(self, task_id: str, user_id: str, message: str, agent_id: str, 
                 conversation_id: Optional[str] = None, title: Optional[str] = None,
                 provider_service: AIProviderService = None):
        self.task_id = task_id
        self.user_id = user_id
        self.message = message
        self.agent_id = agent_id
        self.conversation_id = conversation_id
        self.title = title
        # 移除长时间持有的数据库会话，改为按需获取
        self.provider_service = provider_service
        
        self.state = TaskState.CREATED
        self.result_queue = asyncio.Queue()
        self.created_at = datetime.now()
        self.started_at = None
        self.finished_at = None
        self.conversation = None
        self.error = None
        self.cancel_requested = False  # 用于请求中止任务
    
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
    
    def set_disconnected(self):
        """设置任务为断开连接状态（但仍在后台运行）仅代表请求者离开，不代表任务不要了"""
        self.state = TaskState.DISCONNECTED
    
    def request_cancel(self):
        """请求取消任务"""
        self.cancel_requested = True
    
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
    
    def disconnect_task(self, task_id: str) -> bool:
        """
        断开任务连接但保持任务继续运行
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功断开连接
        """
        task = self.get_task(task_id)
        if task and task.state == TaskState.RUNNING:
            task.set_disconnected()
            logger.info(f"Task {task_id} disconnected but continues running")
            return True
        return False
    
    # async def abort_task(self, task_id: str) -> bool:
    #     """
    #     中止任务执行
        
    #     Args:
    #         task_id: 任务ID
            
    #     Returns:
    #         bool: 是否成功中止任务
    #     """
    #     task = self.get_task(task_id)
    #     if not task:
    #         return False
            
    #     # 请求取消任务
    #     task.request_cancel()
        
    #     # 向队列添加取消消息
    #     await task.put_result({
    #         "type": "error",
    #         "data": {
    #             "error": "Task aborted by user",
    #             "timestamp": datetime.now().isoformat()
    #         }
    #     })
        
    #     logger.info(f"Task {task_id} aborted")
    #     return True
    
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
            # 直接执行流处理，不再创建单独的任务
            await self._execute_stream_task(task)
            task.set_finished()
        except asyncio.CancelledError:
            logger.info(f"Task {task.task_id} was cancelled")
            task.set_failed("Task was cancelled")
        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {str(e)}")
            task.set_failed(str(e))
            await task.put_result({
                "type": "error",
                "data": {"error": str(e), "timestamp": datetime.now().isoformat()}
            })
        finally:
            # 如果任务已完成，则延迟删除任务
            if task.state in [TaskState.FINISHED, TaskState.FAILED]:
                await asyncio.sleep(60)
                self.remove_task(task.task_id)
    
    async def _execute_stream_task(self, task: StreamTask):
        conversation = None
        provider_stream = None
        provider = None
        
        try:
            # 检查是否请求取消
            if task.cancel_requested:
                logger.info(f"Task {task.task_id} cancelled before execution")
                return
                
            # 使用临时数据库会话获取agent信息
            from models.database import DatabaseManager
            
            with DatabaseManager() as db:
                agent_srv = get_agent_service_singleton()
                agent = await agent_srv.get_agent(db, task.agent_id, task.user_id)
                
                if not agent:
                    await task.put_result({
                        "type": "error",
                        "data": {"error": f"未找到 ID 为 {task.agent_id} 的 Agent"}
                    })
                    return
                
                provider = task.provider_service.get_provider_by_name(db, agent.provider)
                if not provider:
                    await task.put_result({
                        "type": "error",
                        "data": {"error": f"Agent provider '{agent.provider}' not found or not supported"}
                    })
                    return
            
            # 使用临时数据库会话处理对话
            conversation_srv = get_conversation_service_singleton()
            
            with DatabaseManager() as db:
                if task.conversation_id:
                    conversation = await conversation_srv.get_conversation(
                        db, task.conversation_id, task.user_id
                    )
                    if not conversation or conversation.status != ConversationStatus.ACTIVE:
                        await task.put_result({
                            "type": "error",
                            "data": {"error": "会话不存在或已失效"}
                        })
                        return
                    else:
                        await task.put_result({
                            "type": "conversation",
                            "data": {
                                "conversation_id": conversation.id,
                                "title": conversation.title,
                                "timestamp": datetime.now().isoformat()
                            }
                        })
                else:
                    conversation = await conversation_srv.create_conversation(
                        user_id=task.user_id,
                        agent_id=task.agent_id,
                        title=task.title if task.title else "新对话",
                        db=db
                    )
                    
                    logger.info(f"用户 {task.user_id} 创建了会话 {conversation.id}")
                    
                    await task.put_result({
                        "type": "conversation",
                        "data": {
                            "conversation_id": conversation.id,
                            "title": conversation.title,
                            "timestamp": datetime.now().isoformat()
                        }
                    })
            
            task.conversation = conversation
            # 获取历史消息记录
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
            
            # 使用临时数据库会话保存用户消息
            with DatabaseManager() as db:
                await conversation_srv.add_messages_to_conversation(
                    db=db,
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
            # tool_id
            # tool_data
            has_done = False

            # 检查是否请求取消
            if task.cancel_requested:
                logger.info(f"Task {task.task_id} cancelled before API call")
                return

            # 启动流式聊天
            provider_stream = provider.stream_chat(
                openai_messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            async for chunk in provider_stream:
                # 检查是否请求取消，如果是则断开 SSE 请求并退出流式处理
                if task.cancel_requested:
                    logger.info(f"Task {task.task_id} cancelled during streaming")
                    if provider:
                        await provider.close()
                    break
                    
                if chunk.get("type") == "content":
                    assistant_response += chunk["data"].get("content", "")
                    assistant_reasoning += chunk["data"].get("reasoning_content", "")

                elif chunk.get("type") == "error":
                    logger.error(f"会话 {conversation.id} 流式处理错误: {chunk['data']['error']}")
                
                elif chunk.get("type") == "done":
                    has_done = True
                
                # 即使断开连接也要继续处理，在后台继续完成任务
                await task.put_result(chunk)
            
            # 如果流没有正常结束，发送完成消息
            if not has_done:
                done_message = {
                    "type": "done",
                    "data": {
                        "finish_reason": "cancelled" if task.cancel_requested else "completed",
                        "full_response": assistant_response,
                        "full_reasoning": assistant_reasoning,
                        "timestamp": datetime.now().isoformat(),
                    }
                }
                await task.put_result(done_message)

            # 即使客户端断开连接，也保存回复到数据库
            if assistant_response or assistant_reasoning:
                assistant_message = {
                    "role": "assistant",
                    "content": assistant_response,
                    "reasoning_content": assistant_reasoning,
                    "timestamp": datetime.now().isoformat(),
                    "tokens": chunk["data"].get("token_count") if 'chunk' in locals() else None
                }
                # 使用临时数据库会话保存助手回复
                with DatabaseManager() as db:
                    await conversation_srv.add_messages_to_conversation(
                        db=db,
                        conversation_id=conversation.id,
                        user_id=task.user_id,
                        messages=[assistant_message],
                    )
                    
                    logger.info(f"会话 {conversation.id} 保存AI回复成功")
                        
        except asyncio.CancelledError:
            logger.info(f"Task {task.task_id} streaming was cancelled")
            if provider:
                await provider.close()
            raise
        except Exception as e:
            logger.error(f"Error in _execute_stream_task: {str(e)}")
            await task.put_result({
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            })
            # 确保关闭provider连接
            if provider:
                await provider.close()

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
        # self.active_streams: Dict[str, str] = {}  # 修改为存储 session_id -> task_id 的映射
        self.active_tasks: Dict[str, str] = {} # task_id -> conversation_id
        
        # 初始化流处理池
        self.stream_pool = StreamPool(max_workers=settings.max_concurrent_llm_requests)
        
        # 启动流处理池的任务
        self._pool_start_task = None
    
    async def _ensure_pool_started(self):
        """确保流处理池已启动"""
        if not self.stream_pool.running and self._pool_start_task is None:
            self._pool_start_task = asyncio.create_task(self.stream_pool.start())
            await self._pool_start_task
    
    # def _get_session_lock(self, session_id: str) -> asyncio.Lock:
    #     """获取会话特定的锁"""
    #     if session_id not in self.session_locks:
    #         self.session_locks[session_id] = asyncio.Lock()
    #     return self.session_locks[session_id]

    def is_active_session(self, conversation_id: str) -> bool:
        """检查会话是否存在后台任务"""
        return conversation_id in self.active_tasks.values()
    
    async def disconnect_stream(self, task_id: str) -> bool:
        """
        断开客户端连接但保持任务继续运行
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功断开连接
        """
        match = self.active_tasks.get(task_id, None)
        if not match:
            return False
        return self.stream_pool.disconnect_task(task_id)
    
    async def abort_stream(self, task_id: str) -> bool:
        """
        中止流式任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功中止任务
        """
        if task_id in self.active_tasks:
            self.stream_pool.get_task(task_id).request_cancel()
            self.active_tasks.pop(task_id, None)
            return True
        return False

    async def stream_chat(
        self,
        user_id: str,
        message: str,
        agent_id: str,
        conversation_id: Optional[str] = None,
        title: Optional[str] = None,
        db: Session = None,
        provider_service: AIProviderService = None,
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
        task_id = None
        # conversation = None
        # session_id = None
        
        try:
            # 确保流处理池已启动
            await self._ensure_pool_started()
            
            # 创建流任务（不再传递数据库会话，改为按需获取）
            task_id = str(uuid.uuid4())
            task = StreamTask(
                task_id=task_id,
                user_id=user_id,
                message=message,
                agent_id=agent_id,
                conversation_id=conversation_id,
                title=title,
                provider_service=provider_service
            )
            
            # 提交任务到流池
            await self.stream_pool.submit_task(task)

            self.active_tasks[task_id] = conversation_id  # maybe None
            
            # 流式返回任务结果
            while True:
                try:
                    # 等待结果，超时后检查任务状态
                    result = await asyncio.wait_for(task.get_result(), timeout=30.0)
                    
                    # 如果收到会话创建事件，记录会话ID
                    if result.get("type") == "conversation":
                        result['data']['task_id'] = task_id
                        self.active_tasks[task_id] = result['data']['conversation_id']
                    
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
                    
        except asyncio.CancelledError:
            # 客户端断开连接，但保持任务继续运行
            if task_id:
                self.stream_pool.disconnect_task(task_id)
            logger.info(f"Client connection cancelled for task {task_id}, but task continues running")
            # 重新抛出异常，让FastAPI处理连接关闭
            raise
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
            # 如果任务完成或失败，从活跃流中移除
            self.active_tasks.pop(task_id, None)

_chat_service_singleton = None

def get_chat_service_singleton():
    global _chat_service_singleton
    if _chat_service_singleton is None:
        _chat_service_singleton = ChatService()
    return _chat_service_singleton
