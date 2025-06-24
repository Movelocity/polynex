"""
数据库模型和表结构定义

包含所有SQLAlchemy模型，定义数据库表结构和关系。
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, Enum as SQLEnum, Boolean, Float   
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
import uuid

Base = declarative_base()

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
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    CUSTOM = "custom"

# 保持向后兼容，后续可以移除
class AIProvider(enum.Enum):
    """AI提供商枚举（已废弃，使用AIProviderType）"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    CUSTOM = "custom"

class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USER)
    register_time = Column(DateTime, nullable=False, default=datetime.utcnow)

class SiteConfig(Base):
    """网站配置表"""
    __tablename__ = "site_config"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False)  # 配置键
    value = Column(Text, nullable=True)  # 配置值
    description = Column(Text, nullable=True)  # 配置描述
    create_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    update_time = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class Blog(Base):
    """博客表"""
    __tablename__ = "blogs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    tags = Column(JSON, nullable=True)  # 存储标签列表
    author_id = Column(String, nullable=False)
    create_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    update_time = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String(20), nullable=False, default='draft')  # 'published' or 'draft'
    views = Column(Integer, nullable=False, default=0)

class Category(Base):
    """分类表"""
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    count = Column(Integer, nullable=False, default=0)

class FileRecord(Base):
    """文件记录表"""
    __tablename__ = "files"
    
    unique_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    original_name = Column(String(255), nullable=False)
    extension = Column(String(20), nullable=False)
    size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploader_id = Column(String, nullable=True)  # 允许为空，表示未知上传者

class Conversation(Base):
    """对话会话表"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(100), nullable=False, unique=True)  # 会话唯一标识
    user_id = Column(String, nullable=False)  # 用户ID
    agent_id = Column(String, nullable=True)  # 关联的agent ID
    title = Column(String(200), nullable=False, default="新对话")
    messages = Column(JSON, nullable=False, default=list)  # 存储消息历史的JSON字符串
    status = Column(SQLEnum(ConversationStatus), nullable=False, default=ConversationStatus.ACTIVE)
    create_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    update_time = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIProviderConfig(Base):
    """AI供应商配置表"""
    __tablename__ = "ai_provider_configs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)  # 配置显示名称，如 "OpenAI主账户"
    provider = Column(String(100), nullable=False, unique=True)  # 供应商自定义名称，如 "my-openai", "company-claude"，必须唯一
    provider_type = Column(SQLEnum(AIProviderType), nullable=False)  # 供应商技术类型
    base_url = Column(String(500), nullable=False)  # API基础URL
    api_key = Column(String(500), nullable=False)  # API密钥（应该加密存储）
    proxy = Column(JSON, nullable=True)  # 代理配置 {"host": "127.0.0.1", "port": 7890, "username": "", "password": ""}
    models = Column(JSON, nullable=False, default=list)  # 支持的模型列表
    default_model = Column(String(100), nullable=True)  # 默认模型
    default_temperature = Column(Float, nullable=True, default=0.7)  # 默认温度
    default_max_tokens = Column(Integer, nullable=True, default=2000)  # 默认最大tokens
    is_active = Column(Boolean, nullable=False, default=True)  # 是否激活
    is_default = Column(Boolean, nullable=False, default=False)  # 是否为默认供应商
    priority = Column(Integer, nullable=False, default=0)  # 优先级（数字越大优先级越高）
    rate_limit_per_minute = Column(Integer, nullable=True)  # 每分钟请求限制
    extra_config = Column(JSON, nullable=False, default=dict)  # 额外配置参数
    description = Column(Text, nullable=True)  # 配置描述
    create_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    update_time = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class Agent(Base):
    """对话代理表"""
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(100), nullable=False, unique=True)  # agent唯一标识
    user_id = Column(String, nullable=False)  # 创建者ID
    provider = Column(String(100), nullable=False)  # 关联的供应商名称（对应AIProviderConfig.provider）
    model = Column(String(100), nullable=False)  # 使用的模型名称
    top_p = Column(Float, nullable=True)  # top_p参数
    temperature = Column(Float, nullable=True)  # 温度参数
    max_tokens = Column(Integer, nullable=True)  # 最大tokens
    preset_messages = Column(JSON, nullable=False, default=list)  # 预设消息（prompt）
    app_preset = Column(JSON, nullable=False, default=dict)  # 应用配置：{name, description, greetings, suggested_questions, creation_date, ...}
    is_public = Column(Boolean, nullable=False, default=False)  # 是否公开
    is_default = Column(Boolean, nullable=False, default=False)  # 是否为默认agent
    create_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    update_time = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# 数据库配置
DATABASE_URL = "sqlite:///./blog_platform.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """获取数据库会话（用于FastAPI依赖注入）"""
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

class DatabaseManager:
    """数据库管理器，提供上下文管理器支持"""
    
    def __init__(self):
        self.db = None
    
    def __enter__(self):
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.db.rollback()
        self.db.close() 