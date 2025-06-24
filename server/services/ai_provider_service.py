"""
AI供应商配置管理服务

提供AI供应商配置的CRUD操作和配置获取功能
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from models.database import AIProviderConfig, AIProvider, DatabaseManager

logger = logging.getLogger(__name__)

class AIProviderService:
    """AI供应商配置管理服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_provider_config(
        self,
        name: str,
        provider: AIProvider,
        base_url: str,
        api_key: str,
        models: List[str] = None,
        default_model: str = None,
        default_temperature: float = 0.7,
        default_max_tokens: int = 2000,
        is_active: bool = True,
        is_default: bool = False,
        priority: int = 0,
        rate_limit_per_minute: int = None,
        extra_config: Dict[str, Any] = None,
        description: str = None
    ) -> AIProviderConfig:
        """
        创建新的AI供应商配置
        
        Args:
            name: 配置名称
            provider: 供应商类型
            base_url: API基础URL
            api_key: API密钥
            models: 支持的模型列表
            default_model: 默认模型
            default_temperature: 默认温度
            default_max_tokens: 默认最大tokens
            is_active: 是否激活
            is_default: 是否为默认供应商
            priority: 优先级
            rate_limit_per_minute: 每分钟请求限制
            extra_config: 额外配置
            description: 配置描述
            
        Returns:
            AIProviderConfig: 创建的配置对象
        """
        try:
            # 如果设置为默认供应商，需要先取消其他默认供应商
            if is_default:
                self.db.query(AIProviderConfig).filter(
                    AIProviderConfig.is_default == True
                ).update({"is_default": False})
            
            # 创建配置
            config = AIProviderConfig(
                name=name,
                provider=provider,
                base_url=base_url,
                api_key=api_key,  # TODO: 应该加密存储
                models=models or [],
                default_model=default_model,
                default_temperature=default_temperature,
                default_max_tokens=default_max_tokens,
                is_active=is_active,
                is_default=is_default,
                priority=priority,
                rate_limit_per_minute=rate_limit_per_minute,
                extra_config=extra_config or {},
                description=description
            )
            
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
            
            logger.info(f"Created AI provider config: {name} ({provider.value})")
            return config
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create AI provider config: {str(e)}")
            raise
    
    def get_provider_config(self, config_id: str) -> Optional[AIProviderConfig]:
        """
        获取指定的供应商配置
        
        Args:
            config_id: 配置ID
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        return self.db.query(AIProviderConfig).filter(
            AIProviderConfig.id == config_id,
            AIProviderConfig.is_active == True
        ).first()
    
    def get_default_provider_config(self) -> Optional[AIProviderConfig]:
        """
        获取默认供应商配置
        
        Returns:
            Optional[AIProviderConfig]: 默认配置对象或None
        """
        return self.db.query(AIProviderConfig).filter(
            AIProviderConfig.is_default == True,
            AIProviderConfig.is_active == True
        ).first()
    
    def get_best_provider_config(self, provider: AIProvider = None) -> Optional[AIProviderConfig]:
        """
        获取最佳供应商配置（按优先级排序）
        
        Args:
            provider: 指定供应商类型，如果为None则返回最高优先级的配置
            
        Returns:
            Optional[AIProviderConfig]: 最佳配置对象或None
        """
        query = self.db.query(AIProviderConfig).filter(
            AIProviderConfig.is_active == True
        )
        
        if provider:
            query = query.filter(AIProviderConfig.provider == provider)
        
        return query.order_by(
            AIProviderConfig.is_default.desc(),
            AIProviderConfig.priority.desc(),
            AIProviderConfig.create_time.asc()
        ).first()
    
    def list_provider_configs(
        self,
        provider: AIProvider = None,
        is_active: bool = None,
        limit: int = None,
        offset: int = 0
    ) -> List[AIProviderConfig]:
        """
        列出供应商配置
        
        Args:
            provider: 过滤指定供应商类型
            is_active: 过滤激活状态
            limit: 限制返回数量
            offset: 偏移量
            
        Returns:
            List[AIProviderConfig]: 配置列表
        """
        query = self.db.query(AIProviderConfig)
        
        if provider:
            query = query.filter(AIProviderConfig.provider == provider)
        
        if is_active is not None:
            query = query.filter(AIProviderConfig.is_active == is_active)
        
        query = query.order_by(
            AIProviderConfig.is_default.desc(),
            AIProviderConfig.priority.desc(),
            AIProviderConfig.create_time.asc()
        )
        
        if limit:
            query = query.limit(limit)
        
        if offset:
            query = query.offset(offset)
        
        return query.all()
    
    def update_provider_config(
        self,
        config_id: str,
        **kwargs
    ) -> Optional[AIProviderConfig]:
        """
        更新供应商配置
        
        Args:
            config_id: 配置ID
            **kwargs: 要更新的字段
            
        Returns:
            Optional[AIProviderConfig]: 更新后的配置对象或None
        """
        try:
            config = self.get_provider_config(config_id)
            if not config:
                return None
            
            # 如果设置为默认供应商，需要先取消其他默认供应商
            if kwargs.get('is_default'):
                self.db.query(AIProviderConfig).filter(
                    AIProviderConfig.is_default == True,
                    AIProviderConfig.id != config_id
                ).update({"is_default": False})
            
            # 更新字段
            for key, value in kwargs.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            
            config.update_time = datetime.utcnow()
            self.db.commit()
            self.db.refresh(config)
            
            logger.info(f"Updated AI provider config: {config_id}")
            return config
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update AI provider config: {str(e)}")
            raise
    
    def delete_provider_config(self, config_id: str) -> bool:
        """
        删除供应商配置（软删除，设置为非激活状态）
        
        Args:
            config_id: 配置ID
            
        Returns:
            bool: 是否删除成功
        """
        try:
            config = self.get_provider_config(config_id)
            if not config:
                return False
            
            config.is_active = False
            config.update_time = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Deleted AI provider config: {config_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete AI provider config: {str(e)}")
            raise
    
    def get_config_for_agent(self, agent_id: str = None, provider_config_id: str = None) -> Optional[AIProviderConfig]:
        """
        为Agent获取供应商配置
        
        Args:
            agent_id: Agent ID
            provider_config_id: 指定的供应商配置ID
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        # 如果指定了配置ID，使用指定的配置
        if provider_config_id:
            return self.get_provider_config(provider_config_id)
        
        # 否则使用默认配置
        return self.get_default_provider_config() or self.get_best_provider_config()


def get_ai_provider_service_with_db() -> tuple[AIProviderService, Session]:
    """
    获取AI供应商服务实例和数据库会话
    
    Returns:
        tuple: (AIProviderService实例, 数据库会话)
        
    Note:
        调用者需要确保在使用完毕后关闭数据库会话
        建议使用方式：
        ```python
        service, db = get_ai_provider_service_with_db()
        try:
            # 使用service进行操作
            pass
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        ```
    """
    from models.database import get_db_session
    db = get_db_session()
    return AIProviderService(db), db

def get_ai_provider_service(db: Session = None) -> AIProviderService:
    """
    获取AI供应商服务实例
    
    Args:
        db: 数据库会话，如果为None则会抛出异常
        
    Returns:
        AIProviderService: 服务实例
        
    Raises:
        ValueError: 当db参数为None时
        
    Note:
        为了避免数据库连接泄漏，现在要求必须传入数据库会话
        如果需要创建新的会话，请使用get_ai_provider_service_with_db()
    """
    if db is None:
        raise ValueError("Database session is required. Use get_ai_provider_service_with_db() if you need to create a new session.")
    
    return AIProviderService(db) 