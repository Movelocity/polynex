"""
核心数据库服务模块

提供按业务域分离的数据库服务类，使用依赖注入模式
"""

from .user_service import UserService
from .config_service import ConfigService
from .database_manager import DatabaseManager

__all__ = [
    'UserService',
    'ConfigService',
    'DatabaseManager'
] 