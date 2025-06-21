from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
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
