from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.orm import Session
import logging

from models.database import get_db
from fields.schemas import AgentSummary, AgentDetail, AgentCreate, AgentUpdate
from services import get_agent_service_singleton, AgentService
from libs.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agents", tags=["AI代理管理"])


@router.post("/agents", response_model=AgentSummary, summary="创建AI代理")
async def create_agent(
    agent_data: AgentCreate,
    current_user_id: str = Depends(get_current_user_id),
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    创建新的AI代理
    
    需要用户登录权限。创建一个新的AI代理配置，包括模型选择、预设消息、应用配置等。
    
    - **agent_data**: 代理创建数据，包含名称、描述、模型配置等信息
    - **返回**: 创建成功的代理摘要信息
    """
    try:
        agent = await agent_service.create_agent(
            db,
            agent_data,
            current_user_id
        )
        
        return AgentSummary(
            id=agent.agent_id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider=agent.provider,
            model=agent.model,
            name=agent.app_preset.get('name', 'Unnamed Agent'),
            description=agent.app_preset.get('description', ''),
            avatar=agent.avatar,
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


@router.get("/agents", response_model=List[AgentSummary], summary="获取AI代理列表")
async def get_agents(
    include_public: bool = True,
    limit: int = 20,
    offset: int = 0,
    current_user_id: str = Depends(get_current_user_id),
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    获取AI代理列表
    
    需要用户登录权限。获取当前用户的代理列表，可选择是否包含公开代理。
    
    - **include_public**: 是否包含公开的代理（默认: true）
    - **limit**: 限制返回数量（默认: 20）
    - **offset**: 偏移量，用于分页（默认: 0）
    - **返回**: 代理摘要信息列表
    """
    try:
        agents = await agent_service.get_user_agents(
            db,
            current_user_id,
            include_public,
            limit,
            offset
        )
        
        return [
            AgentSummary(
                id=agent.agent_id,
                agent_id=agent.agent_id,
                user_id=agent.user_id,
                provider=agent.provider,
                model=agent.model,
                name=agent.app_preset.get('name', 'Unnamed Agent'),
                description=agent.app_preset.get('description', ''),
                avatar=agent.avatar,
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


@router.get("/agents/{agent_id}", response_model=AgentDetail, summary="获取AI代理详情")
async def get_agent(
    agent_id: str,
    current_user_id: str = Depends(get_current_user_id),
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    获取指定AI代理的详细信息
    
    需要用户登录权限。获取指定代理的完整配置信息，包括预设消息、模型参数等。
    
    - **agent_id**: 代理ID
    - **返回**: 代理的详细配置信息
    """
    try:
        agent = await agent_service.get_agent(
            db,
            agent_id,
            current_user_id
        )
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return AgentDetail(
            id=agent.agent_id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider=agent.provider,
            model=agent.model,
            top_p=agent.top_p,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            preset_messages=agent.preset_messages,
            app_preset=agent.app_preset,
            avatar=agent.avatar,
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


@router.put("/agents/{agent_id}", response_model=AgentDetail, summary="更新AI代理")
async def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    current_user_id: str = Depends(get_current_user_id),
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    更新AI代理
    
    需要用户登录权限。更新指定代理的配置信息。只有代理的创建者可以更新代理。
    
    - **agent_id**: 代理ID
    - **agent_update**: 代理更新数据
    - **返回**: 更新后的代理详细信息
    """
    try:
        agent = await agent_service.update_agent(
            db,
            agent_id,
            agent_update,
            current_user_id
        )
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        return AgentDetail(
            id=agent.agent_id,
            agent_id=agent.agent_id,
            user_id=agent.user_id,
            provider=agent.provider,
            model=agent.model,
            top_p=agent.top_p,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            preset_messages=agent.preset_messages,
            app_preset=agent.app_preset,
            avatar=agent.avatar,
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


@router.delete("/agents/{agent_id}", summary="删除AI代理")
async def delete_agent(
    agent_id: str,
    current_user_id: str = Depends(get_current_user_id),
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    删除AI代理
    
    需要用户登录权限。删除指定的AI代理。只有代理的创建者可以删除代理。
    
    - **agent_id**: 代理ID
    - **返回**: 删除成功消息
    """
    try:
        success = await agent_service.delete_agent(
            db,
            agent_id,
            current_user_id
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


@router.get("/public", response_model=List[AgentSummary], summary="获取公开AI代理列表")
async def get_public_agents(
    limit: int = 20,
    offset: int = 0,
    agent_service: AgentService = Depends(get_agent_service_singleton),
    db: Session = Depends(get_db)
):
    """
    获取公开的AI代理列表
    
    **无需认证**。获取所有公开可用的AI代理列表，供未登录用户浏览。
    
    - **limit**: 限制返回数量（默认: 20）
    - **offset**: 偏移量，用于分页（默认: 0）
    - **返回**: 公开代理的摘要信息列表
    """
    try:
        agents = await agent_service.get_public_agents(
            db,
            limit,
            offset
        )
        
        return [
            AgentSummary(
                id=agent.agent_id,
                agent_id=agent.agent_id,
                user_id=agent.user_id,
                provider=agent.provider,
                model=agent.model,
                name=agent.app_preset.get('name', 'Unnamed Agent'),
                description=agent.app_preset.get('description', ''),
                avatar=agent.avatar,
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