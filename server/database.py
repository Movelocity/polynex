from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from db_models import (
    User, Blog, Category, FileRecord, UserRole, SiteConfig,
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
        """初始化示例数据（仅包含基本配置和分类，不包含用户数据）"""
        session = self._get_session()
        try:
            # 检查是否已有数据
            if session.query(SiteConfig).count() > 0:
                return
            
            # 创建默认网站配置
            default_configs = [
                SiteConfig(
                    id=self._generate_id(),
                    key='allow_registration',
                    value='true',
                    description='是否允许用户注册',
                    create_time=datetime.utcnow(),
                    update_time=datetime.utcnow()
                ),
                SiteConfig(
                    id=self._generate_id(),
                    key='require_invite_code',
                    value='false',
                    description='注册是否需要邀请码',
                    create_time=datetime.utcnow(),
                    update_time=datetime.utcnow()
                ),
                SiteConfig(
                    id=self._generate_id(),
                    key='invite_code',
                    value='',
                    description='邀请码内容',
                    create_time=datetime.utcnow(),
                    update_time=datetime.utcnow()
                )
            ]
            session.add_all(default_configs)
            
            # 创建示例分类
            categories = [
                Category(id='cat-1', name='技术', description='技术相关文章', count=0),
                Category(id='cat-2', name='生活', description='生活感悟', count=0),
                Category(id='cat-3', name='随笔', description='随笔杂谈', count=0)
            ]
            session.add_all(categories)
            
            session.commit()
            
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
    
    def _blog_to_dict(self, blog: Blog, author: User = None) -> Dict[str, Any]:
        """将Blog对象转换为字典，包含作者信息"""
        return {
            'id': blog.id,
            'title': blog.title,
            'content': blog.content,
            'summary': blog.summary,
            'category': blog.category,
            'tags': blog.tags or [],
            'authorId': blog.author_id,
            'authorName': author.username if author else 'Unknown',
            'authorAvatar': author.avatar if author else None,
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

    def _config_to_dict(self, config: SiteConfig) -> Dict[str, Any]:
        """将SiteConfig对象转换为字典"""
        return {
            'id': config.id,
            'key': config.key,
            'value': config.value,
            'description': config.description,
            'createTime': config.create_time.isoformat() + 'Z',
            'updateTime': config.update_time.isoformat() + 'Z'
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
            # 使用join查询获取博客和作者信息
            results = session.query(Blog, User).join(User, Blog.author_id == User.id).all()
            return [self._blog_to_dict(blog, author) for blog, author in results]
        finally:
            session.close()

    def get_published_blogs(self) -> List[Dict[str, Any]]:
        """获取已发布的博客"""
        session = self._get_session()
        try:
            # 使用join查询获取已发布博客和作者信息
            results = session.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.status == 'published').all()
            return [self._blog_to_dict(blog, author) for blog, author in results]
        finally:
            session.close()

    def get_blog_by_id(self, blog_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取博客"""
        session = self._get_session()
        try:
            # 使用join查询获取博客和作者信息
            result = session.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.id == blog_id).first()
            return self._blog_to_dict(result[0], result[1]) if result else None
        finally:
            session.close()

    def get_blogs_by_author(self, author_id: str) -> List[Dict[str, Any]]:
        """根据作者ID获取博客"""
        session = self._get_session()
        try:
            # 使用join查询获取博客和作者信息
            results = session.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.author_id == author_id).all()
            return [self._blog_to_dict(blog, author) for blog, author in results]
        finally:
            session.close()

    def get_blogs_by_category(self, category: str) -> List[Dict[str, Any]]:
        """根据分类获取博客"""
        session = self._get_session()
        try:
            # 使用join查询获取博客和作者信息
            results = session.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.category == category).all()
            return [self._blog_to_dict(blog, author) for blog, author in results]
        finally:
            session.close()

    def search_blogs(self, query: str) -> List[Dict[str, Any]]:
        """搜索博客"""
        if not query:
            return []
        
        session = self._get_session()
        try:
            # 使用join查询获取博客和作者信息
            results = session.query(Blog, User).join(User, Blog.author_id == User.id).filter(
                (Blog.title.contains(query)) |
                (Blog.content.contains(query)) |
                (Blog.summary.contains(query))
            ).all()
            return [self._blog_to_dict(blog, author) for blog, author in results]
        finally:
            session.close()

    def create_blog(self, blog_data: BlogCreate, author_id: str) -> Dict[str, Any]:
        """创建新博客"""
        session = self._get_session()
        try:
            # 获取作者信息
            author = session.query(User).filter(User.id == author_id).first()
            if not author:
                raise ValueError("作者不存在")
            
            new_blog = Blog(
                id=self._generate_id(),
                title=blog_data.title,
                content=blog_data.content,
                summary=blog_data.summary,
                category=blog_data.category,
                tags=blog_data.tags,
                author_id=author_id,
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow(),
                status=blog_data.status,
                views=0
            )
            
            session.add(new_blog)
            session.commit()
            
            # 更新分类计数
            self.update_category_counts()
            
            return self._blog_to_dict(new_blog, author)
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

    # ===== 网站配置相关操作 =====

    def get_all_site_configs(self) -> List[Dict[str, Any]]:
        """获取所有网站配置"""
        session = self._get_session()
        try:
            configs = session.query(SiteConfig).all()
            return [self._config_to_dict(config) for config in configs]
        finally:
            session.close()

    def get_site_config_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        """根据键获取网站配置"""
        session = self._get_session()
        try:
            config = session.query(SiteConfig).filter(SiteConfig.key == key).first()
            return self._config_to_dict(config) if config else None
        finally:
            session.close()

    def get_site_config_value(self, key: str, default: str = None) -> Optional[str]:
        """获取网站配置值"""
        config = self.get_site_config_by_key(key)
        return config['value'] if config else default

    def update_site_config(self, key: str, value: str, description: str = None) -> bool:
        """更新网站配置"""
        session = self._get_session()
        try:
            config = session.query(SiteConfig).filter(SiteConfig.key == key).first()
            if not config:
                # 如果不存在，创建新配置
                config = SiteConfig(
                    id=self._generate_id(),
                    key=key,
                    value=value,
                    description=description,
                    create_time=datetime.utcnow(),
                    update_time=datetime.utcnow()
                )
                session.add(config)
            else:
                # 更新现有配置
                config.value = value
                if description is not None:
                    config.description = description
                config.update_time = datetime.utcnow()
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_site_config(self, key: str) -> bool:
        """删除网站配置"""
        session = self._get_session()
        try:
            config = session.query(SiteConfig).filter(SiteConfig.key == key).first()
            if not config:
                return False
            
            session.delete(config)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # ===== 管理员权限相关操作 =====

    def get_user_stats(self) -> Dict[str, int]:
        """获取用户统计数据（管理员权限）"""
        session = self._get_session()
        try:
            total_count = session.query(User).count()
            admin_count = session.query(User).filter(User.role == UserRole.ADMIN).count()
            user_count = session.query(User).filter(User.role == UserRole.USER).count()
            
            return {
                'total': total_count,
                'admins': admin_count,
                'users': user_count
            }
        finally:
            session.close()

    def update_user_role(self, user_id: str, role: str) -> bool:
        """更新用户角色（管理员权限）"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # 验证角色值
            if role not in ['admin', 'user']:
                raise ValueError("无效的角色类型")
            
            user.role = UserRole(role)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def update_user_info_by_admin(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """管理员更新用户信息"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            for key, value in updates.items():
                if key == 'role' and value in ['admin', 'user']:
                    user.role = UserRole(value)
                elif hasattr(user, key) and key not in ['id', 'register_time']:
                    setattr(user, key, value)
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_user(self, user_id: str) -> bool:
        """删除用户（管理员权限）"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # 检查是否为最后一个管理员
            if user.role == UserRole.ADMIN:
                admin_count = session.query(User).filter(User.role == UserRole.ADMIN).count()
                if admin_count <= 1:
                    raise ValueError("不能删除最后一个管理员账户")
            
            # 删除用户相关的博客
            session.query(Blog).filter(Blog.author_id == user_id).delete()
            
            # 删除用户
            session.delete(user)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def reset_user_password(self, user_id: str, new_password: str) -> bool:
        """重置用户密码（管理员权限）"""
        session = self._get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            user.password = new_password
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # ===== 文件相关操作 =====

    def _file_to_dict(self, file_record: FileRecord) -> Dict[str, Any]:
        """将FileRecord对象转换为字典"""
        return {
            'unique_id': file_record.unique_id,
            'original_name': file_record.original_name,
            'extension': file_record.extension,
            'size': file_record.size,
            'upload_time': file_record.upload_time.isoformat() + 'Z',
            'uploader_id': file_record.uploader_id,
            'url': f"/api/resources/{file_record.unique_id}{file_record.extension}"
        }

    def create_file_record(self, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建文件记录"""
        session = self._get_session()
        try:
            new_file = FileRecord(
                unique_id=file_data['unique_id'],
                original_name=file_data['original_name'],
                extension=file_data['extension'],
                size=file_data['size'],
                upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.utcnow(),
                uploader_id=file_data.get('uploader_id')
            )
            
            session.add(new_file)
            session.commit()
            
            return self._file_to_dict(new_file)
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_file_by_id(self, unique_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取文件记录"""
        session = self._get_session()
        try:
            file_record = session.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
            return self._file_to_dict(file_record) if file_record else None
        finally:
            session.close()

    def get_files_by_uploader(self, uploader_id: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """根据上传者ID获取文件列表（支持分页）"""
        session = self._get_session()
        try:
            # 计算偏移量
            offset = (page - 1) * page_size
            
            # 获取总数
            total = session.query(FileRecord).filter(FileRecord.uploader_id == uploader_id).count()
            
            # 获取分页数据，按上传时间倒序排列
            files = session.query(FileRecord).filter(FileRecord.uploader_id == uploader_id)\
                .order_by(FileRecord.upload_time.desc())\
                .offset(offset)\
                .limit(page_size)\
                .all()
            
            # 计算分页信息
            total_pages = (total + page_size - 1) // page_size  # 向上取整
            
            return {
                'files': [self._file_to_dict(file_record) for file_record in files],
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                }
            }
        finally:
            session.close()

    def get_all_files(self) -> List[Dict[str, Any]]:
        """获取所有文件记录"""
        session = self._get_session()
        try:
            files = session.query(FileRecord).all()
            return [self._file_to_dict(file_record) for file_record in files]
        finally:
            session.close()

    def update_file_record(self, unique_id: str, updates: Dict[str, Any]) -> bool:
        """更新文件记录"""
        session = self._get_session()
        try:
            file_record = session.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
            if not file_record:
                return False
            
            for key, value in updates.items():
                if hasattr(file_record, key):
                    setattr(file_record, key, value)
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def delete_file_record(self, unique_id: str) -> bool:
        """删除文件记录"""
        session = self._get_session()
        try:
            file_record = session.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
            if not file_record:
                return False
            
            session.delete(file_record)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def scan_and_import_files(self, files_data: List[Dict[str, Any]]):
        """批量导入文件记录（用于启动时扫描）"""
        session = self._get_session()
        try:
            for file_data in files_data:
                # 检查文件是否已存在
                existing = session.query(FileRecord).filter(FileRecord.unique_id == file_data['unique_id']).first()
                if not existing:
                    new_file = FileRecord(
                        unique_id=file_data['unique_id'],
                        original_name=file_data['original_name'],
                        extension=file_data['extension'],
                        size=file_data['size'],
                        upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.utcnow(),
                        uploader_id=file_data.get('uploader_id')
                    )
                    session.add(new_file)
            
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()


# 全局数据库实例
db = SQLiteDatabase()
