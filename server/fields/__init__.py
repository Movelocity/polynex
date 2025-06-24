"""
序列化/反序列化字段定义模块

包含所有Pydantic模型，用于API请求和响应的数据验证和序列化。
"""

from .schemas import *

__all__ = [
    # 枚举
    'UserRole', 'ConversationStatus', 'AIProvider', 'MessageRole',
    
    # 用户相关
    'User', 'UserCreate', 'UserUpdate', 'UserLogin', 'UserResponse',
    'LoginResponse', 'RegisterResponse',
    
    # 博客相关
    'Blog', 'BlogSummary', 'BlogCreate', 'BlogUpdate',
    
    # 分类相关
    'Category', 'CategoryCreate', 'CategoryUpdate',
    
    # 配置相关
    'SiteConfig', 'SiteConfigCreate', 'SiteConfigUpdate',
    
    # 批量操作
    'BatchUsersRequest', 'BatchBlogsRequest', 'BatchCategoriesRequest',
    
    # 错误响应
    'ErrorResponse',
    
    # 管理员专用
    'UserStatsResponse', 'AdminUserUpdate', 'UserRoleUpdate', 'AdminPasswordReset',
    
    # 注册配置
    'RegistrationConfig', 'InviteCodeConfig', 'InviteCodeUpdate',
    
    # 对话相关
    'Message', 'MessageCreate', 'Conversation', 'ConversationSummary', 
    'ConversationCreate', 'ConversationUpdate', 'ConversationContextUpdate',
    
    # Agent相关
    'Agent', 'AgentSummary', 'AgentCreate', 'AgentUpdate',
    
    # 聊天相关
    'ChatRequest', 'ChatStreamResponse'
] 