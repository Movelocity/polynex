from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import logging

from models.database import get_db
from core import UserService
from fields.schemas import ConversationSummary, ConversationDetail, ChatRequest, Message
from services.conversation_service import ConversationService
from libs.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()

# 全局会话服务实例
conversation_service = ConversationService()


class SessionCreateRequest(BaseModel):
    agent_id: Optional[str] = None


@router.post("/conversations", response_model=ConversationSummary)
async def create_conversation(
    request: SessionCreateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建新的对话会话"""
    try:
        conversation = await conversation_service.create_conversation(
            user_id=current_user_id,
            agent_id=request.agent_id,
            db=db
        )
        
        return ConversationSummary(
            id=conversation.id,
            session_id=conversation.session_id,
            user_id=conversation.user_id,
            agent_id=conversation.agent_id,
            title=conversation.title,
            message_count=len(conversation.messages),
            status=conversation.status,
            create_time=conversation.create_time.isoformat() + 'Z',
            update_time=conversation.update_time.isoformat() + 'Z'
        )
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    limit: int = 20,
    offset: int = 0,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取用户的对话会话列表"""
    try:
        conversations = await conversation_service.get_user_conversations(
            user_id=current_user_id,
            limit=limit,
            offset=offset,
            db=db
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


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取指定对话的详细信息"""
    try:
        conversation = await conversation_service.get_conversation(
            conversation_id=conversation_id,
            user_id=current_user_id,
            db=db
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


@router.post("/conversations/{conversation_id}/chat")
async def chat_with_conversation(
    conversation_id: str,
    chat_request: ChatRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """在指定对话中发送消息"""
    try:
        if chat_request.stream:
            # 流式响应
            async def generate():
                async for chunk in conversation_service.chat_stream(
                    conversation_id=conversation_id,
                    user_message=chat_request.message,
                    user_id=current_user_id,
                    db=db
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            # 非流式响应
            response = await conversation_service.chat(
                conversation_id=conversation_id,
                user_message=chat_request.message,
                user_id=current_user_id,
                db=db
            )
            
            return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat for conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    title_data: Dict[str, str],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
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
            conversation_id=conversation_id,
            title=title,
            user_id=current_user_id,
            db=db
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


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除对话"""
    try:
        success = await conversation_service.delete_conversation(
            conversation_id=conversation_id,
            user_id=current_user_id,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        ) 