"""
Agent Data Transfer Object

用于在服务层之间传递Agent数据，避免数据库会话绑定问题。
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class AgentDTO:
    """Agent 数据传输对象"""
    
    agent_id: str
    creator_id: str
    provider: str
    model: str
    top_p: Optional[float]
    temperature: Optional[float]
    max_tokens: Optional[int]
    preset_messages: List[Dict[str, Any]]
    app_preset: Dict[str, Any]
    avatar: Optional[Dict[str, Any]]
    access_level: int
    create_time: datetime
    update_time: datetime
    
    @classmethod
    def from_db_model(cls, agent) -> 'AgentDTO':
        """从数据库模型创建DTO"""
        return cls(
            agent_id=agent.agent_id,
            creator_id=agent.creator_id,
            provider=agent.provider,
            model=agent.model,
            top_p=agent.top_p,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            preset_messages=agent.preset_messages.copy() if agent.preset_messages else [],
            app_preset=agent.app_preset.copy() if agent.app_preset else {},
            avatar=agent.avatar.copy() if agent.avatar else None,
            access_level=agent.access_level,
            create_time=agent.create_time,
            update_time=agent.update_time
        )