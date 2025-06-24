"""
数据库管理器

整合所有数据库服务，提供统一的访问接口
"""

from sqlalchemy.orm import Session
from typing import Dict, Any

from models.database import create_tables, Category
from .user_service import UserService
from .blog_service import BlogService
from .category_service import CategoryService
from .config_service import ConfigService
from .file_service import FileService


class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # 初始化所有服务
        self.user_service = UserService(db)
        self.blog_service = BlogService(db)
        self.category_service = CategoryService(db)
        self.config_service = ConfigService(db)
        self.file_service = FileService(db)
        
        # 创建数据库表
        create_tables()
        
        # 初始化示例数据
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """初始化示例数据（仅包含基本配置和分类，不包含用户数据）"""
        # 初始化默认配置
        self.config_service.initialize_default_configs()
        
        # 检查是否已有分类数据
        if not self.category_service.get_all_categories():
            # 创建示例分类
            categories = [
                Category(id='cat-1', name='技术', description='技术相关文章', count=0),
                Category(id='cat-2', name='生活', description='生活感悟', count=0),
                Category(id='cat-3', name='随笔', description='随笔杂谈', count=0)
            ]
            
            for category in categories:
                self.db.add(category)
            
            self.db.commit()
    
    # 用户相关操作代理
    def get_all_users(self):
        return self.user_service.get_all_users()
    
    def get_user_by_id(self, user_id: str):
        return self.user_service.get_user_by_id(user_id)
    
    def get_user_by_email(self, email: str):
        return self.user_service.get_user_by_email(email)
    
    def get_user_by_username(self, username: str):
        return self.user_service.get_user_by_username(username)
    
    def create_user(self, user_data):
        return self.user_service.create_user(user_data)
    
    def update_user(self, user_id: str, updates: Dict[str, Any]):
        return self.user_service.update_user(user_id, updates)
    
    def delete_user(self, user_id: str):
        return self.user_service.delete_user(user_id)
    
    def get_user_stats(self):
        return self.user_service.get_user_stats()
    
    def update_user_role(self, user_id: str, role: str):
        return self.user_service.update_user_role(user_id, role)
    
    def reset_user_password(self, user_id: str, new_password: str):
        return self.user_service.reset_user_password(user_id, new_password)
    
    def save_users_batch(self, users):
        return self.user_service.save_users_batch(users)
    
    # 博客相关操作代理
    def get_all_blogs(self):
        return self.blog_service.get_all_blogs()
    
    def get_all_blogs_summary(self):
        return self.blog_service.get_all_blogs_summary()
    
    def get_published_blogs(self):
        return self.blog_service.get_published_blogs()
    
    def get_published_blogs_summary(self):
        return self.blog_service.get_published_blogs_summary()
    
    def get_blog_by_id(self, blog_id: str):
        return self.blog_service.get_blog_by_id(blog_id)
    
    def get_blogs_by_author(self, author_id: str):
        return self.blog_service.get_blogs_by_author(author_id)
    
    def get_blogs_by_author_summary(self, author_id: str):
        return self.blog_service.get_blogs_by_author_summary(author_id)
    
    def get_blogs_by_category(self, category: str):
        return self.blog_service.get_blogs_by_category(category)
    
    def get_blogs_by_category_summary(self, category: str):
        return self.blog_service.get_blogs_by_category_summary(category)
    
    def search_blogs(self, query: str):
        return self.blog_service.search_blogs(query)
    
    def search_blogs_summary(self, query: str):
        return self.blog_service.search_blogs_summary(query)
    
    def create_blog(self, blog_data, author_id: str):
        result = self.blog_service.create_blog(blog_data, author_id)
        self.category_service.update_category_counts()
        return result
    
    def update_blog(self, blog_id: str, updates: Dict[str, Any]):
        return self.blog_service.update_blog(blog_id, updates)
    
    def delete_blog(self, blog_id: str):
        result = self.blog_service.delete_blog(blog_id)
        if result:
            self.category_service.update_category_counts()
        return result
    
    def increment_blog_views(self, blog_id: str):
        return self.blog_service.increment_blog_views(blog_id)
    
    def save_blogs_batch(self, blogs):
        return self.blog_service.save_blogs_batch(blogs)
    
    # 分类相关操作代理
    def get_all_categories(self):
        return self.category_service.get_all_categories()
    
    def get_category_by_name(self, name: str):
        return self.category_service.get_category_by_name(name)
    
    def create_category(self, category_data):
        return self.category_service.create_category(category_data)
    
    def update_category(self, category_id: str, updates: Dict[str, Any]):
        return self.category_service.update_category(category_id, updates)
    
    def delete_category(self, category_id: str):
        return self.category_service.delete_category(category_id)
    
    def update_category_counts(self):
        return self.category_service.update_category_counts()
    
    def save_categories_batch(self, categories):
        return self.category_service.save_categories_batch(categories)
    
    # 配置相关操作代理
    def get_all_site_configs(self):
        return self.config_service.get_all_site_configs()
    
    def get_site_config_by_key(self, key: str):
        return self.config_service.get_site_config_by_key(key)
    
    def get_site_config_value(self, key: str, default: str = None):
        return self.config_service.get_site_config_value(key, default)
    
    def update_site_config(self, key: str, value: str, description: str = None):
        return self.config_service.update_site_config(key, value, description)
    
    def delete_site_config(self, key: str):
        return self.config_service.delete_site_config(key)
    
    # 文件相关操作代理
    def create_file_record(self, file_data: Dict[str, Any]):
        return self.file_service.create_file_record(file_data)
    
    def get_file_by_id(self, unique_id: str):
        return self.file_service.get_file_by_id(unique_id)
    
    def get_files_by_uploader(self, uploader_id: str, page: int = 1, page_size: int = 10):
        return self.file_service.get_files_by_uploader(uploader_id, page, page_size)
    
    def get_all_files(self):
        return self.file_service.get_all_files()
    
    def update_file_record(self, unique_id: str, updates: Dict[str, Any]):
        return self.file_service.update_file_record(unique_id, updates)
    
    def delete_file_record(self, unique_id: str):
        return self.file_service.delete_file_record(unique_id)
    
    def scan_and_import_files(self, files_data):
        return self.file_service.scan_and_import_files(files_data)
    
    # 通用工具方法
    def _generate_id(self) -> str:
        return self.user_service._generate_id()


# 用于向后兼容的别名
SQLiteDatabase = DatabaseManager 