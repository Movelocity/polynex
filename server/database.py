from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from db_models import (
    User, Blog, Category, FileRecord, UserRole,
    engine, SessionLocal, create_tables
)
from models import UserCreate, BlogCreate, CategoryCreate
from auth import get_password_hash


class SQLiteDatabase:
    """使用 SQLite 数据库的数据库类"""
    
    def __init__(self):
        # 创建数据库表
        create_tables()
        
        # 初始化示例数据
        self._initialize_sample_data()
    
    def _get_session(self) -> Session:
        """获取数据库会话"""
        return SessionLocal()
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _initialize_sample_data(self):
        """初始化示例数据"""
        session = self._get_session()
        try:
            # 检查是否已有数据
            if session.query(User).count() > 0:
                return
            
            # 创建示例用户 (第一个用户为管理员)
            demo_user = User(
                id='demo-user-1',
                username='博客达人',
                email='demo@example.com',
                password=get_password_hash('demo123'),  # 使用加密密码
                avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
                role=UserRole.ADMIN,  # 第一个用户为管理员
                register_time=datetime.fromisoformat('2024-01-01T00:00:00')
            )
            
            demo1_user = User(
                id='demo1-user-1',
                username='测试用户',
                email='demo1@example.com',
                password=get_password_hash('demo123'),  # 使用加密密码
                avatar=None,
                role=UserRole.USER,
                register_time=datetime.fromisoformat('2024-01-01T00:00:00')
            )
            
            tech_user = User(
                id='tech-user-1',
                username='技术小白',
                email='tech@example.com',
                password=get_password_hash('tech123'),  # 使用加密密码
                avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
                role=UserRole.USER,
                register_time=datetime.fromisoformat('2024-02-01T00:00:00')
            )
            
            session.add_all([demo_user, demo1_user, tech_user])
            
            # 创建示例分类
            categories = [
                Category(id='cat-1', name='技术', description='技术相关文章', count=0),
                Category(id='cat-2', name='生活', description='生活感悟', count=0),
                Category(id='cat-3', name='随笔', description='随笔杂谈', count=0)
            ]
            session.add_all(categories)
            
            # 创建示例博客
            sample_blog = Blog(
                id=self._generate_id(),
                title='FastAPI 快速入门指南',
                content='''# FastAPI 快速入门指南

FastAPI 是一个现代、快速的 Python Web 框架，用于构建 API。

## 主要特性

- **快速**: 非常高的性能，与 NodeJS 和 Go 相当
- **快速编码**: 提高功能开发速度约 200% 至 300%
- **更少 bug**: 减少约 40% 的人为（开发者）导致错误
- **直观**: 极佳的编辑器支持，自动补全无处不在，调试时间更短
- **简易**: 设计的易于使用和学习，阅读文档时间更短
- **简短**: 最小化代码重复，通过不同的参数声明实现丰富功能，bug 更少

## 安装

```bash
pip install fastapi
pip install "uvicorn[standard]"
```

## 创建第一个 API

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

这就是一个完整的 FastAPI 应用！''',
                summary='FastAPI 是一个现代、快速的 Python Web 框架，本文介绍了其主要特性和基本使用方法。',
                category='技术',
                tags=['Python', 'FastAPI', 'Web开发', 'API'],
                author_id='demo-user-1',
                author_name='博客达人',
                create_time=datetime.fromisoformat('2024-06-20T10:00:00'),
                update_time=datetime.fromisoformat('2024-06-20T10:00:00'),
                status='published',
                views=42
            )
            session.add(sample_blog)
            
            session.commit()
            
            # 更新分类计数
            self.update_category_counts()
            
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # ===== 辅助方法 =====
    
    def _user_to_dict(self, user: User) -> Dict[str, Any]:
        """将User对象转换为字典"""
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'password': user.password,
            'avatar': user.avatar,
            'role': user.role.value,
            'registerTime': user.register_time.isoformat() + 'Z'
        }
    
    def _blog_to_dict(self, blog: Blog) -> Dict[str, Any]:
        """将Blog对象转换为字典"""
        return {
            'id': blog.id,
            'title': blog.title,
            'content': blog.content,
            'summary': blog.summary,
            'category': blog.category,
            'tags': blog.tags or [],
            'authorId': blog.author_id,
            'authorName': blog.author_name,
            'createTime': blog.create_time.isoformat() + 'Z',
            'updateTime': blog.update_time.isoformat() + 'Z',
            'status': blog.status,
            'views': blog.views
        }
    
    def _category_to_dict(self, category: Category) -> Dict[str, Any]:
        """将Category对象转换为字典"""
        return {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'count': category.count
        }

    # ===== 用户相关操作 =====

    def get_all_users(self) -> List[Dict[str, Any]]:
        """获取所有用户"""
        session = self._get_session()
        try:
            users = session.query(User).all()
            return [self._user_to_dict(user) for user in users]
        finally:
            session.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            return self._user_to_dict(user) if user else None
        finally:
            session.close()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取用户"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.email == email).first()
            return self._user_to_dict(user) if user else None
        finally:
            session.close()

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取用户"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.username == username).first()
            return self._user_to_dict(user) if user else None
        finally:
            session.close()

    def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """创建新用户"""
        session = self._get_session()
        try:
            # 检查是否是第一个用户（自动设为管理员）
            user_count = session.query(User).count()
            role = UserRole.ADMIN if user_count == 0 else UserRole.USER
            
            new_user = User(
                id=self._generate_id(),
                username=user_data.username,
                email=user_data.email,
                password=user_data.password,
                avatar=user_data.avatar,
                role=role,
                register_time=datetime.utcnow()
            )
            
            session.add(new_user)
            session.commit()
            
            return self._user_to_dict(new_user)
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """更新用户信息"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            for key, value in updates.items():
                if hasattr(user, key.replace('Time', '_time')):  # 处理registerTime字段
                    attr_name = key.replace('Time', '_time') if 'Time' in key else key
                    setattr(user, attr_name, value)
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def save_users_batch(self, users: List[Dict[str, Any]]):
        """批量保存用户"""
        session = self._get_session()
        try:
            # 清空现有用户
            session.query(User).delete()
            
            # 添加新用户
            for user_data in users:
                user = User(
                    id=user_data['id'],
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password'],
                    avatar=user_data.get('avatar'),
                    role=UserRole(user_data.get('role', 'user')),
                    register_time=datetime.fromisoformat(user_data['registerTime'].replace('Z', ''))
                )
                session.add(user)
            
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # ===== 博客相关操作 =====

    def get_all_blogs(self) -> List[Dict[str, Any]]:
        """获取所有博客"""
        session = self._get_session()
        try:
            blogs = session.query(Blog).all()
            return [self._blog_to_dict(blog) for blog in blogs]
        finally:
            session.close()

    def get_published_blogs(self) -> List[Dict[str, Any]]:
        """获取已发布的博客"""
        session = self._get_session()
        try:
            blogs = session.query(Blog).filter(Blog.status == 'published').all()
            return [self._blog_to_dict(blog) for blog in blogs]
        finally:
            session.close()

    def get_blog_by_id(self, blog_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取博客"""
        session = self._get_session()
        try:
            blog = session.query(Blog).filter(Blog.id == blog_id).first()
            return self._blog_to_dict(blog) if blog else None
        finally:
            session.close()

    def get_blogs_by_author(self, author_id: str) -> List[Dict[str, Any]]:
        """根据作者ID获取博客"""
        session = self._get_session()
        try:
            blogs = session.query(Blog).filter(Blog.author_id == author_id).all()
            return [self._blog_to_dict(blog) for blog in blogs]
        finally:
            session.close()

    def get_blogs_by_category(self, category: str) -> List[Dict[str, Any]]:
        """根据分类获取博客"""
        session = self._get_session()
        try:
            blogs = session.query(Blog).filter(Blog.category == category).all()
            return [self._blog_to_dict(blog) for blog in blogs]
        finally:
            session.close()

    def search_blogs(self, query: str) -> List[Dict[str, Any]]:
        """搜索博客"""
        if not query:
            return []
        
        session = self._get_session()
        try:
            blogs = session.query(Blog).filter(
                (Blog.title.contains(query)) |
                (Blog.content.contains(query)) |
                (Blog.summary.contains(query))
            ).all()
            return [self._blog_to_dict(blog) for blog in blogs]
        finally:
            session.close()

    def create_blog(self, blog_data: BlogCreate, author_id: str, author_name: str) -> Dict[str, Any]:
        """创建新博客"""
        session = self._get_session()
        try:
            new_blog = Blog(
                id=self._generate_id(),
                title=blog_data.title,
                content=blog_data.content,
                summary=blog_data.summary,
                category=blog_data.category,
                tags=blog_data.tags,
                author_id=author_id,
                author_name=author_name,
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow(),
                status=blog_data.status,
                views=0
            )
            
            session.add(new_blog)
            session.commit()
            
            # 更新分类计数
            self.update_category_counts()
            
            return self._blog_to_dict(new_blog)
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_blog(self, blog_id: str, updates: Dict[str, Any]) -> bool:
        """更新博客"""
        session = self._get_session()
        try:
            blog = session.query(Blog).filter(Blog.id == blog_id).first()
            if not blog:
                return False
            
            for key, value in updates.items():
                if hasattr(blog, key):
                    setattr(blog, key, value)
            
            blog.update_time = datetime.utcnow()
            session.commit()
            
            # 更新分类计数
            self.update_category_counts()
            
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_blog(self, blog_id: str) -> bool:
        """删除博客"""
        session = self._get_session()
        try:
            blog = session.query(Blog).filter(Blog.id == blog_id).first()
            if not blog:
                return False
            
            session.delete(blog)
            session.commit()
            
            # 更新分类计数
            self.update_category_counts()
            
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def increment_blog_views(self, blog_id: str) -> bool:
        """增加博客浏览量"""
        session = self._get_session()
        try:
            blog = session.query(Blog).filter(Blog.id == blog_id).first()
            if not blog:
                return False
            
            blog.views += 1
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def save_blogs_batch(self, blogs: List[Dict[str, Any]]):
        """批量保存博客"""
        session = self._get_session()
        try:
            # 清空现有博客
            session.query(Blog).delete()
            
            # 添加新博客
            for blog_data in blogs:
                blog = Blog(
                    id=blog_data['id'],
                    title=blog_data['title'],
                    content=blog_data['content'],
                    summary=blog_data['summary'],
                    category=blog_data['category'],
                    tags=blog_data['tags'],
                    author_id=blog_data['authorId'],
                    author_name=blog_data['authorName'],
                    create_time=datetime.fromisoformat(blog_data['createTime'].replace('Z', '')),
                    update_time=datetime.fromisoformat(blog_data['updateTime'].replace('Z', '')),
                    status=blog_data['status'],
                    views=blog_data['views']
                )
                session.add(blog)
            
            session.commit()
            self.update_category_counts()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # ===== 分类相关操作 =====

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """获取所有分类"""
        session = self._get_session()
        try:
            categories = session.query(Category).all()
            return [self._category_to_dict(category) for category in categories]
        finally:
            session.close()

    def get_category_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取分类"""
        session = self._get_session()
        try:
            category = session.query(Category).filter(Category.name == name).first()
            return self._category_to_dict(category) if category else None
        finally:
            session.close()

    def create_category(self, category_data: CategoryCreate) -> Dict[str, Any]:
        """创建新分类"""
        session = self._get_session()
        try:
            new_category = Category(
                id=self._generate_id(),
                name=category_data.name,
                description=category_data.description,
                count=0
            )
            
            session.add(new_category)
            session.commit()
            
            return self._category_to_dict(new_category)
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_category(self, category_id: str, updates: Dict[str, Any]) -> bool:
        """更新分类"""
        session = self._get_session()
        try:
            category = session.query(Category).filter(Category.id == category_id).first()
            if not category:
                return False
            
            for key, value in updates.items():
                if hasattr(category, key):
                    setattr(category, key, value)
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_category(self, category_id: str) -> bool:
        """删除分类"""
        session = self._get_session()
        try:
            category = session.query(Category).filter(Category.id == category_id).first()
            if not category:
                return False
            
            session.delete(category)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_category_counts(self):
        """更新分类计数"""
        session = self._get_session()
        try:
            # 统计每个分类的博客数量
            category_counts = session.query(
                Blog.category, 
                func.count(Blog.id).label('count')
            ).group_by(Blog.category).all()
            
            # 重置所有分类计数为0
            session.query(Category).update({'count': 0})
            
            # 更新有博客的分类计数
            for category_name, count in category_counts:
                session.query(Category).filter(
                    Category.name == category_name
                ).update({'count': count})
            
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def save_categories_batch(self, categories: List[Dict[str, Any]]):
        """批量保存分类"""
        session = self._get_session()
        try:
            # 清空现有分类
            session.query(Category).delete()
            
            # 添加新分类
            for category_data in categories:
                category = Category(
                    id=category_data['id'],
                    name=category_data['name'],
                    description=category_data['description'],
                    count=category_data['count']
                )
                session.add(category)
            
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()


# 全局数据库实例
db = SQLiteDatabase()
