"""
序列化/反序列化字段定义

包含所有Pydantic模型，用于API请求和响应的数据验证和序列化。
"""

from pydantic import BaseModel
from typing import Optional, List, Literal, Dict, Any
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    USER = "user"

class ConversationStatus(str, Enum):
    """对话状态枚举"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class AIProviderType(str, Enum):
    """AI提供商技术类型枚举"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    CUSTOM = "custom"

# 保持向后兼容，后续可以移除
class AIProvider(str, Enum):
    """AI提供商枚举（已废弃，使用AIProviderType）"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"

class MessageRole(str, Enum):
    """消息角色枚举"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class User(BaseModel):
    id: str
    username: str
    email: str
    password: str
    avatar: Optional[str] = None
    role: UserRole = UserRole.USER
    registerTime: str


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    avatar: Optional[str] = None
    invite_code: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    avatar: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    role: UserRole
    registerTime: str


class Blog(BaseModel):
    id: str
    title: str
    content: str
    summary: str
    category: str
    tags: List[str]
    authorId: str
    authorName: str
    authorAvatar: Optional[str] = None
    createTime: str
    updateTime: str
    status: Literal['published', 'draft']
    views: int


class BlogSummary(BaseModel):
    """博客摘要模型（不包含content，用于列表展示）"""
    id: str
    title: str
    summary: str
    category: str
    tags: List[str]
    authorId: str
    authorName: str
    authorAvatar: Optional[str] = None
    createTime: str
    updateTime: str
    status: Literal['published', 'draft']
    views: int


class BlogCreate(BaseModel):
    title: str
    content: str
    summary: str
    category: str
    tags: List[str]
    status: Literal['published', 'draft'] = 'draft'


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[Literal['published', 'draft']] = None


class Category(BaseModel):
    id: str
    name: str
    description: str
    count: int


class CategoryCreate(BaseModel):
    name: str
    description: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    count: Optional[int] = None


class SiteConfig(BaseModel):
    """网站配置模型"""
    id: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    createTime: str
    updateTime: str


class SiteConfigCreate(BaseModel):
    """创建网站配置模型"""
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SiteConfigUpdate(BaseModel):
    """更新网站配置模型"""
    value: Optional[str] = None
    description: Optional[str] = None


class LoginResponse(BaseModel):
    user: UserResponse
    token: str


class RegisterResponse(BaseModel):
    user: UserResponse
    token: str


class BatchUsersRequest(BaseModel):
    users: List[User]


class BatchBlogsRequest(BaseModel):
    blogs: List[Blog]


class BatchCategoriesRequest(BaseModel):
    categories: List[Category]


class ErrorResponse(BaseModel):
    message: str
    code: str
    details: Optional[str] = None


# ===== 管理员专用模型 =====

class UserStatsResponse(BaseModel):
    """用户统计响应模型"""
    total: int
    admins: int
    users: int


class AdminUserUpdate(BaseModel):
    """管理员更新用户信息模型"""
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None


class UserRoleUpdate(BaseModel):
    """用户角色更新模型"""
    role: UserRole


class AdminPasswordReset(BaseModel):
    """管理员重置密码模型"""
    newPassword: str


# ===== 注册配置相关模型 =====

class RegistrationConfig(BaseModel):
    """注册配置响应模型"""
    allow_registration: bool
    require_invite_code: bool


class InviteCodeConfig(BaseModel):
    """邀请码配置模型"""
    require_invite_code: bool
    invite_code: Optional[str] = None


class InviteCodeUpdate(BaseModel):
    """邀请码更新模型"""
    require_invite_code: bool
    invite_code: Optional[str] = None


# ===== 对话相关模型 =====

class Message(BaseModel):
    """消息模型"""
    role: MessageRole
    content: str
    timestamp: Optional[str] = None
    tokens: Optional[int] = None


class MessageCreate(BaseModel):
    """创建消息模型"""
    content: str


class Conversation(BaseModel):
    """对话模型"""
    id: str
    sessionId: str
    userId: str
    agentId: Optional[str] = None
    title: str
    messages: List[Message]
    status: ConversationStatus
    createTime: str
    updateTime: str


class ConversationSummary(BaseModel):
    """对话摘要模型（不包含messages，用于列表展示）"""
    id: str
    session_id: str
    user_id: str
    agent_id: Optional[str] = None
    title: str
    status: ConversationStatus
    create_time: str
    update_time: str
    message_count: int


class ConversationDetail(BaseModel):
    """对话详细信息模型（包含完整的消息列表）"""
    id: str
    session_id: str
    user_id: str
    agent_id: Optional[str] = None
    title: str
    messages: List[Message]
    status: ConversationStatus
    create_time: str
    update_time: str


class ConversationCreate(BaseModel):
    """创建对话模型"""
    title: Optional[str] = "新对话"
    agent_id: Optional[str] = None


class ConversationUpdate(BaseModel):
    """更新对话模型"""
    title: Optional[str] = None
    agent_id: Optional[str] = None
    status: Optional[ConversationStatus] = None


class Agent(BaseModel):
    """AI代理模型"""
    id: str
    agentId: str
    userId: str
    provider: AIProvider
    baseUrl: Optional[str] = None
    apiKey: Optional[str] = None  # 前端不返回实际密钥
    presetMessages: List[Message]
    appPreset: Dict[str, Any]
    isPublic: bool
    isDefault: bool
    createTime: str
    updateTime: str


class AgentSummary(BaseModel):
    """Agent摘要模型（不包含敏感信息）"""
    id: str
    agent_id: str
    user_id: str
    provider: str  # 供应商名称
    model: str  # 模型名称
    name: str
    description: str
    avatar: Optional[Dict[str, Any]] = None  # 头像配置
    is_public: bool
    is_default: bool
    create_time: str
    update_time: str


class AgentDetail(BaseModel):
    """Agent详细信息模型"""
    id: str
    agent_id: str
    user_id: str
    provider: str  # 供应商名称
    model: str  # 模型名称
    top_p: Optional[float] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    preset_messages: List[Dict[str, Any]] = []
    app_preset: Dict[str, Any] = {}
    avatar: Optional[Dict[str, Any]] = None  # 头像配置
    is_public: bool
    is_default: bool
    create_time: str
    update_time: str


class AgentCreate(BaseModel):
    """创建Agent模型"""
    agent_id: str
    provider: str  # 供应商名称
    model: str  # 模型名称
    top_p: Optional[float] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    preset_messages: List[Dict[str, Any]] = []
    app_preset: Dict[str, Any] = {}
    avatar: Optional[Dict[str, Any]] = None  # 头像配置
    is_public: bool = False
    is_default: bool = False


class AgentUpdate(BaseModel):
    """更新Agent模型"""
    provider: Optional[str] = None  # 供应商名称
    model: Optional[str] = None  # 模型名称
    top_p: Optional[float] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    preset_messages: Optional[List[Dict[str, Any]]] = None
    app_preset: Optional[Dict[str, Any]] = None
    avatar: Optional[Dict[str, Any]] = None  # 头像配置
    is_public: Optional[bool] = None
    is_default: Optional[bool] = None


class ChatRequest(BaseModel):
    """聊天请求模型"""
    message: str
    stream: bool = False
    sessionId: Optional[str] = None
    agentId: Optional[str] = None


class ChatStreamResponse(BaseModel):
    """聊天流式响应模型"""
    type: str  # "message", "error", "done"
    data: Dict[str, Any]


class ConversationContextUpdate(BaseModel):
    """对话上下文更新模型"""
    messages: List[Message] 

class SiteConfigResponse(BaseModel):
    """网站配置响应模型"""
    id: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    createTime: str
    updateTime: str


# ===== 文件相关模型 =====

class FileInfo(BaseModel):
    """文件信息模型"""
    uniqueId: str
    originalName: str
    extension: str
    size: int
    uploadTime: str
    uploaderId: Optional[str] = None


class PaginationInfo(BaseModel):
    """分页信息模型"""
    current_page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel):
    """分页响应模型"""
    items: List[Any]
    pagination: PaginationInfo


# ===== 搜索相关模型 =====

class SearchRequest(BaseModel):
    """搜索请求模型"""
    query: str
    limit: int = 20
    offset: int = 0


class ConversationSearchResult(BaseModel):
    """对话搜索结果模型"""
    id: str
    session_id: str
    title: str
    match_count: int  # 匹配次数
    context: str  # 首次匹配附近的120个字符
    create_time: str
    update_time: str


class SearchResponse(BaseModel):
    """搜索响应模型"""
    results: List[ConversationSearchResult]
    total_count: int
    query: str

