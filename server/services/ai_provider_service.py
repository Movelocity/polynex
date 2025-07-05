"""
AI供应商配置管理服务

提供AI供应商配置的CRUD操作和配置获取功能
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from libs.prividers.OpenAIProvider import OpenAIProvider
from models.database import AIProviderConfig, AIProviderType


logger = logging.getLogger(__name__)

class AIProviderService:
    """AI供应商配置管理服务"""
    
    def create_provider_config(
        self,
        db: Session,
        name: str,
        provider_type: AIProviderType,  # 技术类型
        base_url: str,
        api_key: str,
        proxy: Dict[str, Any] = None,  # 代理配置
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
            db: 数据库会话
            name: 配置显示名称（同时作为唯一标识符）
            provider_type: 供应商技术类型
            base_url: API基础URL
            api_key: API密钥
            proxy: 代理配置
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
            
        Raises:
            ValueError: 当name已存在时
        """
        try:
            # 检查name是否已存在
            existing = db.query(AIProviderConfig).filter(
                AIProviderConfig.name == name
            ).first()
            if existing:
                raise ValueError(f"Provider name '{name}' already exists")
            
            # 如果设置为默认供应商，需要先取消其他默认供应商
            if is_default:
                db.query(AIProviderConfig).filter(
                    AIProviderConfig.is_default == True
                ).update({"is_default": False})
            
            # 创建配置
            config = AIProviderConfig(
                name=name,
                provider_type=provider_type,
                base_url=base_url,
                api_key=api_key,  # TODO: 应该加密存储
                proxy=proxy,
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
            
            db.add(config)
            db.commit()
            db.refresh(config)
            
            logger.info(f"Created AI provider config: {name} (type: {provider_type.value})")
            return config
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create AI provider config: {str(e)}")
            raise
    
    def get_provider_config(self, db: Session, config_id: str) -> Optional[AIProviderConfig]:
        """
        获取指定的供应商配置
        
        Args:
            db: 数据库会话
            config_id: 配置ID
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        return db.query(AIProviderConfig).filter(
            AIProviderConfig.id == config_id,
            AIProviderConfig.is_active == True
        ).first()
    
    def get_provider_config_for_update(self, db: Session, config_id: str) -> Optional[AIProviderConfig]:
        """
        获取指定的供应商配置（用于更新操作，不过滤激活状态）
        
        Args:
            db: 数据库会话
            config_id: 配置ID
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        return db.query(AIProviderConfig).filter(
            AIProviderConfig.id == config_id
        ).first()
    
    def get_provider_config_by_name(self, db: Session, name: str) -> Optional[AIProviderConfig]:
        """
        根据供应商名称获取配置
        
        Args:
            db: 数据库会话
            name: 供应商名称
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        return db.query(AIProviderConfig).filter(
            AIProviderConfig.name == name,
            AIProviderConfig.is_active == True
        ).first()

    def get_provider_by_name(self, db: Session, name: str) -> Optional[OpenAIProvider]:
        """
        根据供应商名称获取配置
        """
        config = self.get_provider_config_by_name(db, name)
        return OpenAIProvider(config) if config else None
    
    def get_all_provider_configs(self, db: Session) -> List[AIProviderConfig]:
        """
        获取所有供应商配置
        
        Args:
            db: 数据库会话
            
        Returns:
            List[AIProviderConfig]: 配置列表
        """
        return db.query(AIProviderConfig).order_by(
            AIProviderConfig.is_default.desc(),
            AIProviderConfig.priority.desc(),
            AIProviderConfig.create_time.asc()
        ).all()
    
    # def get_default_provider_config(self, db: Session) -> Optional[AIProviderConfig]:
    #     """
    #     获取默认供应商配置
        
    #     Args:
    #         db: 数据库会话
            
    #     Returns:
    #         Optional[AIProviderConfig]: 默认配置对象或None
    #     """
    #     return db.query(AIProviderConfig).filter(
    #         AIProviderConfig.is_default == True,
    #         AIProviderConfig.is_active == True
    #     ).first()
    
    def get_best_provider_config(self, db: Session, provider_type: AIProviderType = None) -> Optional[AIProviderConfig]:
        """
        获取最佳供应商配置（按优先级排序）
        
        Args:
            db: 数据库会话
            provider_type: 指定供应商技术类型，如果为None则返回最高优先级的配置
            
        Returns:
            Optional[AIProviderConfig]: 最佳配置对象或None
        """
        query = db.query(AIProviderConfig).filter(
            AIProviderConfig.is_active == True
        )
        
        if provider_type:
            query = query.filter(AIProviderConfig.provider_type == provider_type)
        
        return query.order_by(
            AIProviderConfig.is_default.desc(),
            AIProviderConfig.priority.desc(),
            AIProviderConfig.create_time.asc()
        ).first()
    
    def list_provider_configs(
        self,
        db: Session,
        provider_type: AIProviderType = None,
        is_active: bool = None,
        limit: int = None,
        offset: int = 0
    ) -> List[AIProviderConfig]:
        """
        列出供应商配置
        
        Args:
            db: 数据库会话
            provider_type: 过滤指定供应商技术类型
            is_active: 过滤激活状态
            limit: 限制返回数量
            offset: 偏移量
            
        Returns:
            List[AIProviderConfig]: 配置列表
        """
        query = db.query(AIProviderConfig)
        
        if provider_type:
            query = query.filter(AIProviderConfig.provider_type == provider_type)
        
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
        db: Session,
        config_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[AIProviderConfig]:
        """
        更新供应商配置
        
        Args:
            db: 数据库会话
            config_id: 配置ID
            update_data: 要更新的字段
            
        Returns:
            Optional[AIProviderConfig]: 更新后的配置对象或None
            
        Raises:
            ValueError: 当provider名称已存在时
        """
        try:
            # 使用 get_provider_config_for_update 以便能够更新非激活的供应商
            config = self.get_provider_config_for_update(db, config_id)
            if not config:
                return None
            
            # 检查name是否冲突
            if 'name' in update_data and update_data['name'] != config.name:
                existing = db.query(AIProviderConfig).filter(
                    AIProviderConfig.name == update_data['name'],
                    AIProviderConfig.id != config_id
                ).first()
                if existing:
                    raise ValueError(f"Provider name '{update_data['name']}' already exists")
            
            # 如果设置为默认供应商，需要先取消其他默认供应商
            if update_data.get('is_default'):
                db.query(AIProviderConfig).filter(
                    AIProviderConfig.is_default == True,
                    AIProviderConfig.id != config_id
                ).update({"is_default": False})
            
            # 更新字段
            for key, value in update_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            
            config.update_time = datetime.now()
            db.commit()
            db.refresh(config)
            
            logger.info(f"Updated AI provider config: {config_id}")
            return config
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update AI provider config: {str(e)}")
            raise
    
    def delete_provider_config(self, db: Session, config_id: str) -> bool:
        """
        删除供应商配置（软删除，设置为非激活状态）
        
        Args:
            db: 数据库会话
            config_id: 配置ID
            
        Returns:
            bool: 是否删除成功
        """
        try:
            # 使用 get_provider_config_for_update 以便能够删除非激活的供应商
            config = self.get_provider_config_for_update(db, config_id)
            if not config:
                return False
            
            config.is_active = False
            config.update_time = datetime.now()
            db.commit()
            
            logger.info(f"Deleted AI provider config: {config_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete AI provider config: {str(e)}")
            raise
    
    def get_config_for_agent(self, db: Session, name: str = None) -> Optional[AIProviderConfig]:
        """
        为Agent获取供应商配置
        
        Args:
            db: 数据库会话
            name: 指定的供应商名称
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
        """
        # 如果指定了供应商名称，使用指定的配置
        if name:
            return self.get_provider_config_by_name(db, name)
        
        # 否则使用默认配置
        return self.get_default_provider_config(db) or self.get_best_provider_config(db)

_ai_provider_service = None 
# 单例获取函数
def get_ai_provider_service_singleton() -> AIProviderService:
    """获取AI供应商服务单例"""
    global _ai_provider_service
    if _ai_provider_service is None:
        _ai_provider_service = AIProviderService()
    return _ai_provider_service
