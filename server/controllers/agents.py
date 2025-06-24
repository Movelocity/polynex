from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from models.database import get_db
from core import UserService
from fields.schemas import AgentSummary, AgentDetail, AgentCreate, AgentUpdate
from services.conversation_service import ConversationService
from libs.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()

# 全局会话服务实例
conversation_service = ConversationService()


@router.post("/agents", response_model=AgentSummary)
async def create_agent(
    agent_data: AgentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建新的AI代理"""
    try:
        agent = await conversation_service.create_agent(
            agent_data=agent_data,
            user_id=current_user_id,
            db=db
        )
        
        return AgentSummary(
            id=agent.id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider_config_id=agent.provider_config_id,
            name=agent.app_preset.get('name', 'Unnamed Agent'),
            description=agent.app_preset.get('description', ''),
            is_public=agent.is_public,
            is_default=agent.is_default,
            create_time=agent.create_time.isoformat() + 'Z',
            update_time=agent.update_time.isoformat() + 'Z'
        )
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent: {str(e)}"
        )


@router.get("/agents", response_model=List[AgentSummary])
async def get_agents(
    include_public: bool = True,
    limit: int = 20,
    offset: int = 0,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取AI代理列表"""
    try:
        agents = await conversation_service.get_user_agents(
            user_id=current_user_id,
            include_public=include_public,
            limit=limit,
            offset=offset,
            db=db
        )
        
        return [
            AgentSummary(
                id=agent.id,
                agent_id=agent.agent_id,
                user_id=agent.user_id,
                provider_config_id=agent.provider_config_id,
                name=agent.app_preset.get('name', 'Unnamed Agent'),
                description=agent.app_preset.get('description', ''),
                is_public=agent.is_public,
                is_default=agent.is_default,
                create_time=agent.create_time.isoformat() + 'Z',
                update_time=agent.update_time.isoformat() + 'Z'
            )
            for agent in agents
        ]
    except Exception as e:
        logger.error(f"Error getting agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agents: {str(e)}"
        )


@router.get("/agents/{agent_id}", response_model=AgentDetail)
async def get_agent(
    agent_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取指定AI代理的详细信息"""
    try:
        agent = await conversation_service.get_agent(
            agent_id=agent_id,
            user_id=current_user_id,
            db=db
        )
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return AgentDetail(
            id=agent.id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider_config_id=agent.provider_config_id,
            model=agent.model,
            top_p=agent.top_p,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            preset_messages=agent.preset_messages,
            app_preset=agent.app_preset,
            is_public=agent.is_public,
            is_default=agent.is_default,
            create_time=agent.create_time.isoformat() + 'Z',
            update_time=agent.update_time.isoformat() + 'Z'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent {agent_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent: {str(e)}"
        )


@router.put("/agents/{agent_id}", response_model=AgentDetail)
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """更新AI代理"""
    try:
        agent = await conversation_service.update_agent(
            agent_id=agent_id,
            agent_update=agent_update,
            user_id=current_user_id,
            db=db
        )
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return AgentDetail(
            id=agent.id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider_config_id=agent.provider_config_id,
            model=agent.model,
            top_p=agent.top_p,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            preset_messages=agent.preset_messages,
            app_preset=agent.app_preset,
            is_public=agent.is_public,
            is_default=agent.is_default,
            create_time=agent.create_time.isoformat() + 'Z',
            update_time=agent.update_time.isoformat() + 'Z'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent {agent_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update agent: {str(e)}"
        )


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除AI代理"""
    try:
        success = await conversation_service.delete_agent(
            agent_id=agent_id,
            user_id=current_user_id,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return {"message": "Agent deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent {agent_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete agent: {str(e)}"
        )


@router.get("/agents/public/list", response_model=List[AgentSummary])
async def get_public_agents(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取公开的AI代理列表（无需认证）"""
    try:
        agents = await conversation_service.get_public_agents(
            limit=limit,
            offset=offset,
            db=db
        )
        
        return [
            AgentSummary(
                id=agent.id,
                agent_id=agent.agent_id,
                user_id=agent.user_id,
                provider_config_id=agent.provider_config_id,
                name=agent.app_preset.get('name', 'Unnamed Agent'),
                description=agent.app_preset.get('description', ''),
                is_public=agent.is_public,
                is_default=agent.is_default,
                create_time=agent.create_time.isoformat() + 'Z',
                update_time=agent.update_time.isoformat() + 'Z'
            )
            for agent in agents
        ]
    except Exception as e:
        logger.error(f"Error getting public agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get public agents: {str(e)}"
        ) 