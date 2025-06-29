import asyncio
import json
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from decimal import Decimal
import logging

from models.database import LLMRequestLog

logger = logging.getLogger(__name__)

class LLMRequestLogService:
    """LLM请求日志服务"""
    
    def __init__(self):
        # 异步写入队列，避免阻塞主流程
        self._log_queue = asyncio.Queue()
        self._worker_task = None
        self._running = False
    
    async def start(self):
        """启动日志服务"""
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._log_worker())
            logger.info("LLM request log service started")
    
    async def stop(self):
        """停止日志服务"""
        if self._running:
            self._running = False
            if self._worker_task:
                await self._worker_task
            logger.info("LLM request log service stopped")
    
    async def _log_worker(self):
        """日志写入工作线程"""
        while self._running:
            try:
                # 等待日志任务
                log_task = await asyncio.wait_for(self._log_queue.get(), timeout=1.0)
                await self._process_log_task(log_task)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in log worker: {str(e)}")
    
    async def _process_log_task(self, log_task: Dict[str, Any]):
        """处理日志任务"""
        try:
            action = log_task.get("action")
            if action == "create":
                await self._create_log_sync(log_task["data"], log_task["db"])
            elif action == "update":
                await self._update_log_sync(
                    log_task["log_id"], 
                    log_task["data"], 
                    log_task["db"]
                )
        except Exception as e:
            logger.error(f"Error processing log task: {str(e)}")
    
    def create_log_async(
        self,
        user_id: str,
        provider_config_id: str,
        model: str,
        request_messages: List[Dict[str, str]],
        db: Session,
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        request_params: Optional[Dict[str, Any]] = None,
        extra_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        异步创建LLM请求日志
        
        Returns:
            str: 日志ID
        """
        log_id = str(uuid.uuid4())
        
        # 手动序列化request_messages为JSON字符串，确保中文不被转义
        request_messages_json = json.dumps(request_messages, ensure_ascii=False, separators=(',', ':'))
        
        log_data = {
            "id": log_id,
            "user_id": user_id,
            "conversation_id": conversation_id,
            "agent_id": agent_id,
            "provider_config_id": provider_config_id,
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            "request_messages": request_messages_json,  # 保存JSON字符串
            "request_params": request_params,
            "start_time": datetime.now(),
            "status": "pending",
            "extra_metadata": extra_metadata
        }
        
        # 加入异步队列
        try:
            self._log_queue.put_nowait({
                "action": "create",
                "data": log_data,
                "db": db
            })
        except asyncio.QueueFull:
            logger.warning("Log queue is full, dropping log entry")
        
        return log_id
    
    def update_log_async(
        self,
        log_id: str,
        db: Session,
        response_content: Optional[str] = None,
        finish_reason: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        estimated_cost: Optional[float] = None,
        status: str = "success",
        error_message: Optional[str] = None,
        end_time: Optional[datetime] = None
    ):
        """
        异步更新LLM请求日志
        """
        update_data = {
            "response_content": response_content,
            "finish_reason": finish_reason,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "estimated_cost": Decimal(str(estimated_cost)) if estimated_cost else None,
            "status": status,
            "error_message": error_message,
            "end_time": end_time or datetime.now()
        }
        
        # 计算持续时间
        if end_time:
            # 这里需要查询start_time，但为了异步性能，我们在worker中处理
            pass
        
        try:
            self._log_queue.put_nowait({
                "action": "update",
                "log_id": log_id,
                "data": update_data,
                "db": db
            })
        except asyncio.QueueFull:
            logger.warning("Log queue is full, dropping log update")
    
    async def _create_log_sync(self, log_data: Dict[str, Any], db: Session):
        """同步创建日志记录"""
        try:
            log_entry = LLMRequestLog(**log_data)
            db.add(log_entry)
            db.commit()
            logger.debug(f"Created LLM request log: {log_data['id']}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating LLM request log: {str(e)}")
    
    async def _update_log_sync(
        self, 
        log_id: str, 
        update_data: Dict[str, Any], 
        db: Session
    ):
        """同步更新日志记录"""
        try:
            log_entry = db.query(LLMRequestLog).filter(
                LLMRequestLog.id == log_id
            ).first()
            
            if log_entry:
                # 计算持续时间
                if update_data.get("end_time") and log_entry.start_time:
                    duration = update_data["end_time"] - log_entry.start_time
                    update_data["duration_ms"] = int(duration.total_seconds() * 1000)
                
                # 更新字段
                for key, value in update_data.items():
                    if value is not None and hasattr(log_entry, key):
                        setattr(log_entry, key, value)
                
                db.commit()
                logger.debug(f"Updated LLM request log: {log_id}")
            else:
                logger.warning(f"LLM request log not found: {log_id}")
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating LLM request log: {str(e)}")
    
    def get_logs(
        self,
        db: Session,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[LLMRequestLog]:
        """
        查询LLM请求日志
        """
        try:
            query = db.query(LLMRequestLog)
            
            if user_id:
                query = query.filter(LLMRequestLog.user_id == user_id)
            
            if conversation_id:
                query = query.filter(LLMRequestLog.conversation_id == conversation_id)
            
            logs = query.order_by(
                LLMRequestLog.start_time.desc()
            ).offset(offset).limit(limit).all()
            
            # 手动解析request_messages字段（如果需要在这里处理的话）
            # 注意：实际的JSON解析在LLMRequestLog.to_dict()方法中进行
            
            return logs
            
        except Exception as e:
            logger.error(f"Error querying LLM request logs: {str(e)}")
            return []
    
    def get_usage_statistics(
        self,
        db: Session,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        获取使用统计信息
        """
        try:
            query = db.query(LLMRequestLog)
            
            if user_id:
                query = query.filter(LLMRequestLog.user_id == user_id)
            
            if start_date:
                query = query.filter(LLMRequestLog.start_time >= start_date)
            
            if end_date:
                query = query.filter(LLMRequestLog.start_time <= end_date)
            
            # 基础统计
            total_requests = query.count()
            successful_requests = query.filter(LLMRequestLog.status == "success").count()
            
            # Token统计
            from sqlalchemy import func
            token_stats = query.with_entities(
                func.sum(LLMRequestLog.prompt_tokens).label("total_prompt_tokens"),
                func.sum(LLMRequestLog.completion_tokens).label("total_completion_tokens"),
                func.sum(LLMRequestLog.total_tokens).label("total_tokens"),
                func.sum(LLMRequestLog.estimated_cost).label("total_cost")
            ).first()
            
            return {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "error_requests": total_requests - successful_requests,
                "success_rate": successful_requests / total_requests if total_requests > 0 else 0,
                "total_prompt_tokens": int(token_stats.total_prompt_tokens or 0),
                "total_completion_tokens": int(token_stats.total_completion_tokens or 0),
                "total_tokens": int(token_stats.total_tokens or 0),
                "total_estimated_cost": float(token_stats.total_cost or 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting usage statistics: {str(e)}")
            return {}


# 全局服务实例
_llm_log_service: Optional[LLMRequestLogService] = None

def get_llm_log_service() -> LLMRequestLogService:
    """获取LLM请求日志服务实例"""
    global _llm_log_service
    if _llm_log_service is None:
        _llm_log_service = LLMRequestLogService()
    return _llm_log_service

# 启动服务的辅助函数
async def start_llm_log_service():
    """启动LLM日志服务"""
    service = get_llm_log_service()
    await service.start()

async def stop_llm_log_service():
    """停止LLM日志服务"""
    service = get_llm_log_service()
    await service.stop() 