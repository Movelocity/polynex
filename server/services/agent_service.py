from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import Agent
from fields.schemas import AgentCreate, AgentUpdate

import logging

logger = logging.getLogger(__name__)

class AgentService:
    """AI代理服务类"""
    
    async def create_agent(
        self,
        db: Session,
        agent_data: AgentCreate,
        user_id: str
    ) -> Agent:
        """
        创建新的AI代理
        
        Args:
            db: 数据库会话
            agent_data: Agent创建数据
            user_id: 用户ID
            
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
            from .ai_provider_service import get_ai_provider_service_singleton
            provider_service = get_ai_provider_service_singleton()
            provider_config = provider_service.get_provider_config_by_name(db, agent_data.provider)
            if not provider_config:
                raise ValueError(f"Provider '{agent_data.provider}' not found")
            
            # 验证模型是否在供应商支持的模型列表中
            if agent_data.model and provider_config.models and agent_data.model not in provider_config.models:
                raise ValueError(f"Model '{agent_data.model}' is not supported by provider '{agent_data.provider}'")
            
            # 创建Agent
            agent = Agent(
                agent_id=agent_data.agent_id,
                creator_id=user_id,
                provider=agent_data.provider,
                model=agent_data.model,
                top_p=agent_data.top_p,
                temperature=agent_data.temperature,
                max_tokens=agent_data.max_tokens,
                preset_messages=agent_data.preset_messages,
                app_preset=agent_data.app_preset,
                avatar=agent_data.avatar,
                access_level=agent_data.access_level
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
        db: Session,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Agent]:
        """
        获取用户的Agent列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            include_public: 是否包含公开的Agent
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[Agent]: Agent列表
        """
        try:
            query = db.query(Agent)
            query = query.filter(Agent.creator_id == user_id)
            agents = query.order_by(
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
            db: 数据库会话
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            List[Agent]: 公开的Agent列表
        """
        try:
            agents = db.query(Agent).filter(
                Agent.access_level >= 3
            ).order_by(
                Agent.create_time.desc()
            ).offset(offset).limit(limit).all()
            
            return agents
            
        except Exception as e:
            logger.error(f"Error getting public agents: {str(e)}")
            raise
    
    async def get_agent(
        self,
        db: Session,
        agent_id: str,
        user_id: str
    ) -> Optional[Agent]:
        """
        获取指定的Agent
        
        Args:
            db: 数据库会话
            agent_id: Agent ID
            user_id: 用户ID
            
        Returns:
            Optional[Agent]: Agent对象或None
        """
        try:
            # 可以获取自己的或公开的Agent
            agent = db.query(Agent).filter(
                and_(
                    Agent.agent_id == agent_id,
                    (Agent.creator_id == user_id) | (Agent.access_level > 1)
                )
            ).first()
            
            return agent
            
        except Exception as e:
            logger.error(f"Error getting agent {agent_id}: {str(e)}")
            raise
    
    async def get_agent_dto(
        self,
        db: Session,
        agent_id: str,
        user_id: str
    ):
        """
        获取指定Agent的DTO
        
        Args:
            db: 数据库会话
            agent_id: Agent ID
            user_id: 用户ID
            
        Returns:
            AgentDTO: Agent DTO对象或None
        """
        from libs.dto import AgentDTO
        
        agent = await self.get_agent(db, agent_id, user_id)
        return AgentDTO.from_db_model(agent) if agent else None
    
    async def get_agent_by_agent_id(
        self,
        db: Session,
        agent_id: str,
        user_id: str
    ) -> Optional[Agent]:
        """
        通过agent_id获取指定的Agent（已移除，建议使用get_agent方法）
        
        Args:
            db: 数据库会话
            agent_id: Agent ID
            user_id: 用户ID
            
        Returns:
            Optional[Agent]: Agent对象或None
        """
        return await self.get_agent(db, agent_id, user_id)
    
    async def update_agent(
        self,
        db: Session,
        agent_id: str,
        agent_update: AgentUpdate,
        user_id: str
    ) -> Optional[Agent]:
        """
        更新Agent
        
        Args:
            db: 数据库会话
            agent_id: Agent ID
            agent_update: 更新数据
            user_id: 用户ID
            
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
                    Agent.creator_id == user_id
                )
            ).first()
            
            if not agent:
                return None
            
            # 如果更新了供应商，验证供应商是否存在
            if agent_update.provider and agent_update.provider != agent.provider:
                from .ai_provider_service import get_ai_provider_service_singleton
                provider_service = get_ai_provider_service_singleton()
                provider_config = provider_service.get_provider_config_by_name(db, agent_update.provider)
                if not provider_config:
                    raise ValueError(f"Provider '{agent_update.provider}' not found")
                
                # 验证模型是否在新供应商支持的模型列表中
                model_to_check = agent_update.model or agent.model
                if model_to_check and provider_config.models and model_to_check not in provider_config.models:
                    raise ValueError(f"Model '{model_to_check}' is not supported by provider '{agent_update.provider}'")
            
            # 更新字段
            update_data = agent_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            
            agent.update_time = datetime.now()
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
        db: Session,
        agent_id: str,
        user_id: str
    ) -> bool:
        """
        删除Agent
        
        Args:
            db: 数据库会话
            agent_id: Agent ID
            user_id: 用户ID
            
        Returns:
            bool: 是否成功删除
        """
        try:
            # 只能删除自己的Agent
            agent = db.query(Agent).filter(
                and_(
                    Agent.agent_id == agent_id,
                    Agent.creator_id == user_id
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

    
    # async def search_agents(
    #     self,
    #     db: Session,
    #     user_id: str,
    #     query: str,
    #     include_public: bool = True,
    #     limit: int = 20,
    #     offset: int = 0
    # ) -> List[Agent]:
    #     """
    #     搜索Agent
    #     Args:
    #         db: 数据库会话
    #         user_id: 用户ID
    #         query: 搜索关键词
    #         include_public: 是否包含公开的Agent
    #         limit: 限制数量
    #         offset: 偏移量
    #     Returns:
    #         List[Agent]: 符合条件的Agent列表
    #     """
    #     try:
    #         base_query = db.query(Agent)
    #         if include_public:
    #             base_query = base_query.filter(
    #                 (Agent.user_id == user_id) | (Agent.is_public == True)
    #             )
    #         else:
    #             base_query = base_query.filter(Agent.user_id == user_id)
    #         # 在agent_id、model、provider中搜索
    #         agents = base_query.filter(
    #             (Agent.agent_id.contains(query)) |
    #             (Agent.model.contains(query)) |
    #             (Agent.provider.contains(query))
    #         ).order_by(
    #             Agent.is_default.desc(),
    #             Agent.create_time.desc()
    #         ).offset(offset).limit(limit).all()
    #         return agents
    #     except Exception as e:
    #         logger.error(f"Error searching agents: {str(e)}")
    #         raise

_agent_service = None
# 单例获取函数
def get_agent_service_singleton() -> AgentService:
    """获取代理服务单例"""
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
