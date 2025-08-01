"""
AI Provider Config Data Transfer Object

用于在服务层之间传递AI提供商配置数据，避免数据库会话绑定问题。
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from models.database import AIProviderType


@dataclass
class AIProviderConfigDTO:
    """AI提供商配置数据传输对象"""
    
    id: str
    name: str
    provider_type: AIProviderType
    base_url: str
    api_key: str
    proxy: Optional[Dict[str, Any]]
    models: List[str]
    rpm: Optional[int]
    extra_config: Dict[str, Any]
    description: Optional[str]
    creator_id: str
    access_level: int
    create_time: datetime
    update_time: datetime
    
    @classmethod
    def from_db_model(cls, config) -> 'AIProviderConfigDTO':
        """从数据库模型创建DTO"""
        return cls(
            id=config.id,
            name=config.name,
            provider_type=config.provider_type,
            base_url=config.base_url,
            api_key=config.api_key,
            proxy=config.proxy.copy() if config.proxy else None,
            models=config.models.copy() if config.models else [],
            rpm=config.rpm,
            extra_config=config.extra_config.copy() if config.extra_config else {},
            description=config.description,
            creator_id=config.creator_id,
            access_level=config.access_level,
            create_time=config.create_time,
            update_time=config.update_time
        )