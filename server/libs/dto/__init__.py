"""
Data Transfer Objects (DTO) 模块

提供用于在不同层之间传递数据的DTO类，避免直接传递数据库对象
导致的会话绑定问题。
"""

from .agent_dto import AgentDTO
from .provider_dto import AIProviderConfigDTO

__all__ = ['AgentDTO', 'AIProviderConfigDTO']