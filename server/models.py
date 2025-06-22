from pydantic import BaseModel
from typing import Optional, List, Literal
from enum import Enum

class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    USER = "user"


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
