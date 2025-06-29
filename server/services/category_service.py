"""
分类服务模块

负责博客分类相关的数据库操作
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
import uuid
from models.database import Category, Blog
from fields import CategoryCreate


class CategoryService:
    """分类服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _category_to_dict(self, category: Category) -> Dict[str, Any]:
        """将Category对象转换为字典"""
        return {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'count': category.count
        }
    
    def get_all_categories(self) -> List[Dict[str, Any]]:
        """获取所有分类"""
        categories = self.db.query(Category).all()
        return [self._category_to_dict(category) for category in categories]
    
    def get_category_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取分类"""
        category = self.db.query(Category).filter(Category.name == name).first()
        return self._category_to_dict(category) if category else None
    
    def create_category(self, category_data: CategoryCreate) -> Dict[str, Any]:
        """创建新分类"""
        new_category = Category(
            id=self._generate_id(),
            name=category_data.name,
            description=category_data.description,
            count=0
        )
        
        self.db.add(new_category)
        self.db.commit()
        
        return self._category_to_dict(new_category)
    
    def update_category(self, category_id: str, updates: Dict[str, Any]) -> bool:
        """更新分类"""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return False
        
        for key, value in updates.items():
            if hasattr(category, key):
                setattr(category, key, value)
        
        self.db.commit()
        return True
    
    def delete_category(self, category_id: str) -> bool:
        """删除分类"""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return False
        
        self.db.delete(category)
        self.db.commit()
        return True
    
    def update_category_counts(self):
        """更新所有分类的博客数量"""
        # 获取每个分类的博客数量
        category_counts = self.db.query(
            Blog.category,
            func.count(Blog.id).label('count')
        ).group_by(Blog.category).all()
        
        # 将所有分类的计数重置为0
        self.db.query(Category).update({'count': 0})
        
        # 更新有博客的分类计数
        for category_name, count in category_counts:
            category = self.db.query(Category).filter(Category.name == category_name).first()
            if category:
                category.count = count
        
        self.db.commit()
    
    def save_categories_batch(self, categories: List[Dict[str, Any]]):
        """批量保存分类"""
        # 清空现有分类
        self.db.query(Category).delete()
        
        # 添加新分类
        for category_data in categories:
            category = Category(
                id=category_data['id'],
                name=category_data['name'],
                description=category_data.get('description'),
                count=category_data.get('count', 0)
            )
            self.db.add(category)
        
        self.db.commit()
