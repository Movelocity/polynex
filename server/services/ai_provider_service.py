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
from sqlalchemy import or_


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
        rpm: int = None,
        extra_config: Dict[str, Any] = None,
        description: str = None,
        creator_id: str = None,
        access_level: int = 1  # 默认仅限创建者
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
            rpm: 每分钟请求限制
            extra_config: 额外配置
            description: 配置描述
            creator_id: 创建者ID
            access_level: 访问级别 (0: 仅限管理员, 1: 仅限创建者, 2: 需要登录, >3: 无需登录)
            
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
            
            # 创建配置
            config = AIProviderConfig(
                name=name,
                provider_type=provider_type,
                base_url=base_url,
                api_key=api_key,  # TODO: 应该加密存储
                proxy=proxy,
                models=models or [],
                rpm=rpm,
                extra_config=extra_config or {},
                description=description,
                creator_id=creator_id,
                access_level=access_level
            )
            
            db.add(config)
            db.commit()
            db.refresh(config)
            
            logger.info(f"Created AI provider config: {name} (type: {provider_type})")
            return config
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create AI provider config: {str(e)}")
            raise
    
    def get_provider_config(self, db: Session, config_id: str, user_id: str = None) -> Optional[AIProviderConfig]:
        """
        获取指定的供应商配置
        
        Args:
            db: 数据库会话
            config_id: 配置ID
            user_id: 用户ID
            
        Returns:
            Optional[AIProviderConfig]: 配置对象或None
            
        Raises:
            ValueError: 当用户没有权限时
        """
        config = db.query(AIProviderConfig).filter(
            AIProviderConfig.id == config_id
        ).first()
        
        if config:
            # 检查权限
            if config.access_level <= 1 and user_id != config.creator_id:
                raise ValueError("You do not have permission to access this provider config")
            elif config.access_level == 2 and not user_id:
                raise ValueError("You must be logged in to access this provider config")
            # 其他情况，无需登录

        return config
    
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
            AIProviderConfig.name == name
        ).first()

    def get_provider_by_name(self, db: Session, name: str) -> Optional[OpenAIProvider]:
        """
        根据供应商名称获取配置
        """
        config = self.get_provider_config_by_name(db, name)
        return OpenAIProvider(config) if config else None
    
    def get_provider_config_dto_by_name(self, db: Session, name: str):
        """
        根据供应商名称获取配置DTO
        
        Args:
            db: 数据库会话
            name: 供应商名称
            
        Returns:
            AIProviderConfigDTO: 配置DTO对象或None
        """
        from libs.dto import AIProviderConfigDTO
        
        config = self.get_provider_config_by_name(db, name)
        return AIProviderConfigDTO.from_db_model(config) if config else None
    
    def create_provider_from_dto(self, config_dto) -> Optional[OpenAIProvider]:
        """
        从DTO创建Provider实例
        
        Args:
            config_dto: AIProviderConfigDTO对象
            
        Returns:
            OpenAIProvider: Provider实例或None
        """
        if not config_dto:
            return None
        
        # 创建一个临时的配置对象来与现有的OpenAIProvider兼容
        # 这是一个简单的对象，只包含OpenAIProvider需要的属性
        class TempConfig:
            def __init__(self, dto):
                self.id = dto.id
                self.name = dto.name
                self.provider_type = dto.provider_type
                self.base_url = dto.base_url
                self.api_key = dto.api_key
                self.proxy = dto.proxy
                self.models = dto.models
                self.rpm = dto.rpm
                self.extra_config = dto.extra_config
                self.description = dto.description
                self.creator_id = dto.creator_id
                self.access_level = dto.access_level
                self.create_time = dto.create_time
                self.update_time = dto.update_time
        
        temp_config = TempConfig(config_dto)
        return OpenAIProvider(temp_config)
    
    def get_all_provider_configs(self, db: Session, user_id: str = None) -> List[AIProviderConfig]:
        """
        获取所有供应商配置
        
        Args:
            db: 数据库会话
            user_id: 用户ID 。暂时不管权限级别, 只获取自己创建的供应商配置
            
        Returns:
            List[AIProviderConfig]: 配置列表
        """
        return db.query(AIProviderConfig).filter(
            AIProviderConfig.creator_id == user_id
        ).order_by(
            AIProviderConfig.create_time.asc()
        ).all()
    
    def update_provider_config(
        self,
        db: Session,
        user_id: str,
        config_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[AIProviderConfig]:
        """
        更新供应商配置
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            config_id: 配置ID
            update_data: 要更新的字段
            
        Returns:
            Optional[AIProviderConfig]: 更新后的配置对象或None
            
        Raises:
            ValueError: 当用户没有权限时
        """
        try:
            # 使用 get_provider_config_for_update 以便能够更新非激活的供应商
            config = db.query(AIProviderConfig).filter(
                AIProviderConfig.id == config_id
            ).first()
            
            if config and user_id != config.creator_id:
                raise ValueError("You do not have permission to update this provider config")
            
            # 检查name是否冲突
            if 'name' in update_data and update_data['name'] != config.name:
                existing = db.query(AIProviderConfig).filter(
                    AIProviderConfig.name == update_data['name'],
                    AIProviderConfig.id != config_id
                ).first()
                if existing:
                    raise ValueError(f"Provider name '{update_data['name']}' already exists")
            
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
    
    def delete_provider_config(self, db: Session, user_id: str, config_id: str) -> bool:
        """
        删除供应商配置（软删除，设置为非激活状态）
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            config_id: 配置ID
            
        Returns:
            bool: 是否删除成功
            
        Raises:
            ValueError: 当用户没有权限时
        """
        try:
            # 使用 get_provider_config_for_update 以便能够删除非激活的供应商
            config = db.query(AIProviderConfig).filter(
                AIProviderConfig.id == config_id
            ).first()
            
            if config and user_id != config.creator_id:
                raise ValueError("You do not have permission to delete this provider config")
            
            db.delete(config)
            db.commit()
            
            logger.info(f"Deleted AI provider config: {config_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete AI provider config: {str(e)}")
            raise


_ai_provider_service = None 
# 单例获取函数
def get_ai_provider_service_singleton() -> AIProviderService:
    """获取AI供应商服务单例"""
    global _ai_provider_service
    if _ai_provider_service is None:
        _ai_provider_service = AIProviderService()
    return _ai_provider_service
