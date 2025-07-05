# Services package 

# 导入单例获取函数（推荐使用）
from .user_service import get_user_service_singleton
from .blog_service import get_blog_service_singleton
from .category_service import get_category_service_singleton
from .config_service import get_config_service_singleton
from .file_service import get_file_service_singleton
from .ai_provider_service import get_ai_provider_service_singleton
from .agent_service import get_agent_service_singleton
from .conversation_service import get_conversation_service_singleton
from .chat_service import get_chat_service_singleton

# 导入服务类（用于类型注解和依赖注入）
from .user_service import UserService
from .blog_service import BlogService
from .category_service import CategoryService
from .config_service import ConfigService
from .file_service import FileService
from .ai_provider_service import AIProviderService
from .agent_service import AgentService
from .conversation_service import ConversationService
from .chat_service import ChatService
# from .llm_request_log_service import get_llm_log_service, get_llm_request_log_service_singleton


# 导出所有内容
__all__ = [
    # 基础类和工具
    'BaseService',
    'ServiceFactory', 
    'default_service_factory',
    'get_service_singleton',
    'register_service_singleton',
    'clear_service_singletons',
    
    # 单例获取函数（推荐使用）
    'get_user_service_singleton',
    'get_blog_service_singleton',
    'get_category_service_singleton',
    'get_config_service_singleton',
    'get_file_service_singleton',
    'get_ai_provider_service_singleton',
    'get_agent_service_singleton',
    'get_conversation_service_singleton',
    
    # 服务实例（向后兼容）
    'user_srv',
    'blog_srv',
    'category_srv',
    'config_srv',
    'file_srv',
    'ai_provider_srv',
    'agent_srv',
    'conversation_srv',
    'chat_srv',
    'get_llm_log_service',
    
    # 服务类（用于类型注解）
    'UserServiceClass',
    'BlogServiceClass',
    'CategoryServiceClass',
    'ConfigServiceClass',
    'FileServiceClass',
    'AIProviderServiceClass',
    'AgentServiceClass',
    'ConversationServiceClass',
    
    # 向后兼容别名
    'UserService',
    'BlogService',
    'CategoryService',
    'ConfigService',
    'FileService',
    
    # 服务集合
    'SERVICE_SINGLETONS',
]

