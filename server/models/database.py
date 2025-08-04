"""
数据库模型和表结构定义

包含所有SQLAlchemy模型，定义数据库表结构和关系。
"""

import json
import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, Enum as SQLEnum, Boolean, Float, Numeric, ForeignKey, TypeDecorator
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship
from constants import get_settings
import nanoid

Base = declarative_base()


class UnicodeJSON(TypeDecorator):
    """自定义JSON类型，确保中文字符不被转义"""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """存储到数据库时的处理"""
        if value is not None:
            return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
        return value

    def process_result_value(self, value, dialect):
        """从数据库读取时的处理"""
        if value is not None:
            return json.loads(value)
        return value

    def compare_values(self, x, y):
        """比较两个值是否相等"""
        return x == y


class UserRole(enum.Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    USER = "user"

class ConversationStatus(enum.Enum):
    """对话状态枚举"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class AIProviderType(enum.Enum):
    """AI提供商技术类型枚举"""
    DEEPSEEK = "deepseek"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    CUSTOM = "custom"

class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USER)
    register_time = Column(DateTime, nullable=False, default=datetime.now)

class SiteConfig(Base):
    """网站配置表"""
    __tablename__ = "site_config"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    key = Column(String(100), unique=True, nullable=False)  # 配置键
    value = Column(Text, nullable=True)  # 配置值
    description = Column(Text, nullable=True)  # 配置描述
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

class Blog(Base):
    """博客表"""
    __tablename__ = "blogs"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    tags = Column(UnicodeJSON, nullable=True)  # 存储标签列表
    author_id = Column(String, nullable=False)
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    status = Column(String(20), nullable=False, default='draft')  # 'published' or 'draft'
    views = Column(Integer, nullable=False, default=0)

class Category(Base):
    """分类表"""
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    count = Column(Integer, nullable=False, default=0)

class FileRecord(Base):
    """文件记录表"""
    __tablename__ = "files"
    
    unique_id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    original_name = Column(String(255), nullable=False)
    extension = Column(String(20), nullable=False)
    size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, nullable=False, default=datetime.now)
    uploader_id = Column(String, nullable=True)  # 允许为空，表示未知上传者

class Conversation(Base):
    """对话会话表"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    session_id = Column(String(100), nullable=False, unique=True)  # 会话请求+响应唯一标识
    user_id = Column(String, nullable=False)  # 用户ID
    agent_id = Column(String, nullable=True)  # 关联的agent ID
    title = Column(String(200), nullable=False, default="新对话")
    messages = Column(UnicodeJSON, nullable=False, default=list)  # 存储消息历史的JSON字符串
    status = Column(SQLEnum(ConversationStatus), nullable=False, default=ConversationStatus.ACTIVE)
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

class Message(Base):
    __tablename__ = "messages"
    msg_id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    conv_id = Column(String, nullable=False)
    role = Column(String(100), nullable=False)  # user | assistant | admin
    sender = Column(String(100), nullable=False)  # user_id | agent_id
    type = Column(String(100), nullable=False)  # text | summary | image | audio | file | any
    status = Column(String(100), nullable=False)  # active | send failed | deleted
    content = Column(Text, nullable=False)
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

class AIProviderConfig(Base):
    """AI供应商配置表"""
    __tablename__ = "ai_providers"
    
    id = Column(String, primary_key=True, default=lambda: str(nanoid.generate()))
    name = Column(String(100), nullable=False, unique=True)  # 配置显示名称，如 "OpenAI主账户"，同时作为唯一标识符
    # todo: unique 改为 false，只有id是唯一
    provider_type = Column(SQLEnum(AIProviderType), nullable=False)  # 供应商技术类型
    base_url = Column(String(500), nullable=False)  # API基础URL
    api_key = Column(String(500), nullable=False)  # API密钥（应该加密存储）
    proxy = Column(UnicodeJSON, nullable=True)  # 代理配置 {"url": "http://127.0.0.1:7890", "username": "", "password": ""}
    models = Column(UnicodeJSON, nullable=False, default=list)  # 支持的模型列表
    rpm = Column(Integer, nullable=True)  # 每分钟请求限制
    extra_config = Column(UnicodeJSON, nullable=False, default=dict)  # 额外配置参数
    description = Column(Text, nullable=True)  # 配置描述
    creator_id = Column(String, nullable=False)  # 创建者ID
    access_level = Column(Integer, nullable=False, default=0)  # 访问级别. 0: 仅限管理员, 1: 仅限创建者, 2: 普通用户, >=3: 无需登录
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

class Agent(Base):
    """AI Agent Table"""
    __tablename__ = "agents"
    
    agent_id = Column(String(100), primary_key=True)  # agent唯一标识作为主键
    creator_id = Column(String, nullable=False)  # 创建者ID
    provider = Column(String(100), nullable=False)  # 关联的供应商名称（对应AIProviderConfig.name）
    # todo: 需要添加provider_id
    model = Column(String(100), nullable=False)  # 使用的模型名称
    top_p = Column(Float, nullable=True)  # top_p参数
    temperature = Column(Float, nullable=True)  # 温度参数
    max_tokens = Column(Integer, nullable=True)  # 最大tokens
    preset_messages = Column(UnicodeJSON, nullable=False, default=list)  # 预设消息（prompt）
    app_preset = Column(UnicodeJSON, nullable=False, default=dict)  # 应用配置：{name, description, greetings, suggested_questions, creation_date, ...}
    avatar = Column(UnicodeJSON, nullable=True)  # 头像配置：{variant, emoji, bg_color, link}
    access_level = Column(Integer, nullable=False, default=0)  # 访问级别. 0: 仅限管理员, 1: 仅限创建者, 2: 普通用户, >=3: 无需登录
    create_time = Column(DateTime, nullable=False, default=datetime.now)
    update_time = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)


# 数据库配置
database_url = get_settings().database_url
engine = create_engine(database_url, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """获取数据库会话（用于FastAPI依赖注入）。"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # 如果发生异常，回滚事务
        db.rollback()
        raise e
    finally:
        db.close()

def get_db_session():
    """获取数据库会话（同步版本，用于非FastAPI环境）
    
    注意：调用者需要确保正确关闭session
    使用方式：
    ```python
    db = get_db_session()
    try:
        # 执行数据库操作
        pass
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    ```
    """
    return SessionLocal()

# class DatabaseManager:
#     """数据库管理器，提供上下文管理器支持"""
    
#     def __init__(self):
#         self.db = None
    
#     def __enter__(self):
#         self.db = SessionLocal()
#         return self.db
    
#     def __exit__(self, exc_type, exc_val, exc_tb):
#         if exc_type is not None:
#             self.db.rollback()
#         self.db.close() 