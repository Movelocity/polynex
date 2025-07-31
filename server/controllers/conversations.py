from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import logging

from models.database import get_db
from fields.schemas import (
    ConversationSummary, ConversationDetail, ChatRequest, Message, 
    ConversationContextUpdate, SearchRequest, SearchResponse, ConversationSearchResult,
    SessionCreateRequest, StreamActionRequest
)
from services import (
    get_conversation_service_singleton, ChatService, 
    get_chat_service_singleton, ConversationService,
    get_ai_provider_service_singleton, AIProviderService
)
from libs.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/conversations", tags=["对话管理"])


@router.post("/chat")
async def chat(
    chat_request: ChatRequest,
    current_user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service_singleton),
    provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """在指定对话中发送消息（仅支持流式响应）"""
    try:
        # 只支持流式响应
        async def generate():
            # 发送初始心跳
            yield "event: heartbeat\ndata: {\"type\": \"heartbeat\"}\n\n"
            
            has_done = False
            
            async for chunk in chat_service.stream_chat(
                conversation_id=chat_request.conversationId,
                agent_id=chat_request.agentId,
                user_id=current_user_id,
                message=chat_request.message,
                provider_service=provider_service
            ):
                # 根据chunk类型发送不同的事件
                chunk_type = chunk.get("type", "data")
                if chunk_type == 'done':
                    has_done = True
                yield f"event: {chunk_type}\ndata: {json.dumps(chunk)}\n\n"
            
            # 补充发送完成事件
            if not has_done:
                yield "event: done\ndata: {\"type\": \"done\", \"data\": {\"content\": \"\"}}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat for conversation {chat_request.conversationId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.post("/disconnect")
async def disconnect_stream(
    request: StreamActionRequest,
    current_user_id: str = Depends(get_current_user_id),  # 登录token自动验证
    chat_service: ChatService = Depends(get_chat_service_singleton)
):
    """
    断开流式连接但保持后台任务继续运行
    
    客户端可以调用此接口来安全断开连接，同时保持AI生成继续运行，
    生成的内容会保存到数据库中，但不会再发送到客户端
    """
    try:
        success = await chat_service.disconnect_stream(request.task_id)
        
        if success:
            return {"message": "Stream disconnected successfully, task continues running in background"}
        else:
            return {"message": "No active stream found for the session ID"}
    except Exception as e:
        logger.error(f"Error disconnecting stream for session {request.task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect stream: {str(e)}"
        )


@router.post("/abort")
async def abort_stream(
    request: StreamActionRequest,
    current_user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service_singleton)
):
    """
    中止流式任务
    
    客户端可以调用此接口来立即停止AI生成，取消API请求
    """
    try:
        success = await chat_service.abort_stream(request.task_id)
        
        if success:
            return {"message": "Stream task aborted successfully"}
        else:
            return {"message": "No active stream found for the session ID"}
    except Exception as e:
        logger.error(f"Error aborting stream for session {request.task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to abort stream: {str(e)}"
        )

@router.get("/is_active_session")
async def is_active_session(
    task_id: str,
    chat_service: ChatService = Depends(get_chat_service_singleton)
):
    """检查会话是否存在后台任务"""
    return chat_service.is_active_session(task_id)


@router.get("", response_model=List[ConversationSummary])
async def get_conversations(
    limit: int = 20,
    offset: int = 0,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service: ConversationService = Depends(get_conversation_service_singleton)
):
    """获取用户的对话会话列表"""
    try:
        conversations = await conversation_service.get_user_conversations(
            db,
            current_user_id,
            limit,
            offset
        )
        
        return [
            ConversationSummary(
                id=conv.id,
                session_id=conv.session_id,
                user_id=conv.user_id,
                agent_id=conv.agent_id,
                title=conv.title,
                message_count=len(conv.messages),
                status=conv.status,
                create_time=conv.create_time.isoformat() + 'Z',
                update_time=conv.update_time.isoformat() + 'Z'
            )
            for conv in conversations
        ]
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}"
        )


@router.get("/search/conversations", response_model=SearchResponse)
async def search_conversations(
    query: str,
    limit: int = 20,
    offset: int = 0,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service: ConversationService = Depends(get_conversation_service_singleton)
):
    """搜索用户的对话"""
    try:
        if not query or not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query cannot be empty"
            )
        
        # 限制查询长度，防止过长的搜索词
        if len(query) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query too long (max 100 characters)"
            )
        
        result = await conversation_service.search_conversations(
            db,
            current_user_id,
            query.strip(),
            limit,
            offset
        )
        
        search_results = [
            ConversationSearchResult(**item) for item in result['results']
        ]
        
        return SearchResponse(
            results=search_results,
            total_count=result['total_count'],
            query=query.strip()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search conversations: {str(e)}"
        )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service = Depends(get_conversation_service_singleton)
):
    """获取指定对话的详细信息"""
    try:
        conversation = await conversation_service.get_conversation(
            db,
            conversation_id,
            current_user_id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return ConversationDetail(
            id=conversation.id,
            session_id=conversation.session_id,
            user_id=conversation.user_id,
            agent_id=conversation.agent_id,
            title=conversation.title,
            messages=[Message(**msg) for msg in conversation.messages],
            status=conversation.status,
            create_time=conversation.create_time.isoformat() + 'Z',
            update_time=conversation.update_time.isoformat() + 'Z'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )


@router.put("/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    title_data: Dict[str, str],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service: ConversationService = Depends(get_conversation_service_singleton)
):
    """更新对话标题"""
    try:
        title = title_data.get("title")
        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title is required"
            )
        
        success = await conversation_service.update_conversation_title(
            db,
            conversation_id,
            title,
            current_user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {"message": "Title updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating title for conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update title: {str(e)}"
        )


@router.put("/{conversation_id}/context")
async def update_conversation_context(
    conversation_id: str,
    context_data: ConversationContextUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service: ConversationService = Depends(get_conversation_service_singleton)
):
    """更新对话上下文"""
    try:
        success = await conversation_service.update_conversation_context(
            db,
            conversation_id,
            current_user_id,
            context_data.messages
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {"message": "Context updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating context for conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update context: {str(e)}"
        )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    conversation_service: ConversationService = Depends(get_conversation_service_singleton)
):
    """删除对话"""
    try:
        success = await conversation_service.delete_conversation(
            db,
            conversation_id,
            current_user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="聊天记录不存在"
            )
        
        return {"message": f"聊天记录 {conversation_id} 已删除"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除聊天记录 {conversation_id} 失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除聊天记录 {conversation_id} 失败: {str(e)}"
        )