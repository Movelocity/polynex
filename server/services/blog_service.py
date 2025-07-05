"""
博客服务模块

负责博客相关的数据库操作
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from models.database import Blog, User
from fields import BlogCreate

class BlogService:
    """博客服务类"""
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
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
    
    def _blog_summary_to_dict(self, blog: Blog, author: User = None) -> Dict[str, Any]:
        """将Blog对象转换为摘要字典（不包含content），用于列表展示"""
        return {
            'id': blog.id,
            'title': blog.title,
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
    
    def _extract_match_context(self, text: str, query: str, context_length: int = 150) -> str:
        """提取匹配词的前后上下文"""
        if not text or not query:
            return text or ""
            
        # 转换为小写进行匹配
        text_lower = text.lower()
        query_lower = query.lower()
        
        # 查找匹配位置
        match_index = text_lower.find(query_lower)
        if match_index == -1:
            # 如果没有找到匹配，返回前150个字符
            return text[:context_length] + ("..." if len(text) > context_length else "")
        
        # 计算上下文的起始和结束位置
        start = max(0, match_index - context_length // 2)
        end = min(len(text), match_index + len(query) + context_length // 2)
        
        # 提取上下文
        context = text[start:end]
        
        # 添加省略号
        if start > 0:
            context = "..." + context
        if end < len(text):
            context = context + "..."
            
        return context
    
    def _blog_summary_to_dict_with_context(self, blog: Blog, author: User, query: str) -> Dict[str, Any]:
        """将Blog对象转换为摘要字典，根据搜索查询提取匹配上下文"""
        # 检查匹配位置并提取相应的上下文
        query_lower = query.lower() if query else ""
        summary_to_use = blog.summary or ""
        
        if query_lower:
            # 优先级：标题 -> 内容 -> 摘要
            if blog.title and query_lower in blog.title.lower():
                # 如果标题匹配，保持原有摘要或从内容提取
                if blog.content and len(blog.content) > len(summary_to_use):
                    summary_to_use = self._extract_match_context(blog.content, query)
            elif blog.content and query_lower in blog.content.lower():
                # 如果内容匹配，从内容中提取上下文
                summary_to_use = self._extract_match_context(blog.content, query)
            elif blog.summary and query_lower in blog.summary.lower():
                # 如果摘要匹配，从摘要中提取上下文
                summary_to_use = self._extract_match_context(blog.summary, query)
        
        return {
            'id': blog.id,
            'title': blog.title,
            'summary': summary_to_use,
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
    
    def get_all_blogs(self, db: Session) -> List[Dict[str, Any]]:
        """获取所有博客"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).all()
        return [self._blog_to_dict(blog, author) for blog, author in results]
    
    def get_all_blogs_summary(self, db: Session) -> List[Dict[str, Any]]:
        """获取所有博客摘要（不包含content）"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).all()
        return [self._blog_summary_to_dict(blog, author) for blog, author in results]
    
    def get_published_blogs(self, db: Session) -> List[Dict[str, Any]]:
        """获取已发布的博客"""
        # 使用join查询获取已发布博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.status == 'published').all()
        return [self._blog_to_dict(blog, author) for blog, author in results]
    
    def get_published_blogs_summary(self, db: Session) -> List[Dict[str, Any]]:
        """获取已发布的博客摘要（不包含content）"""
        # 使用join查询获取已发布博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.status == 'published').all()
        return [self._blog_summary_to_dict(blog, author) for blog, author in results]
    
    def get_blog_by_id(self, db: Session, blog_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取博客"""
        # 使用join查询获取博客和作者信息
        result = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.id == blog_id).first()
        return self._blog_to_dict(result[0], result[1]) if result else None
    
    def get_blogs_by_author(self, db: Session, author_id: str) -> List[Dict[str, Any]]:
        """根据作者ID获取博客"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.author_id == author_id).all()
        return [self._blog_to_dict(blog, author) for blog, author in results]
    
    def get_blogs_by_author_summary(self, db: Session, author_id: str) -> List[Dict[str, Any]]:
        """根据作者ID获取博客摘要（不包含content）"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.author_id == author_id).all()
        return [self._blog_summary_to_dict(blog, author) for blog, author in results]
    
    def get_blogs_by_category(self, db: Session, category: str) -> List[Dict[str, Any]]:
        """根据分类获取博客"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.category == category).all()
        return [self._blog_to_dict(blog, author) for blog, author in results]
    
    def get_blogs_by_category_summary(self, db: Session, category: str) -> List[Dict[str, Any]]:
        """根据分类获取博客摘要（不包含content）"""
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(Blog.category == category).all()
        return [self._blog_summary_to_dict(blog, author) for blog, author in results]
    
    def search_blogs(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """搜索博客"""
        if not query:
            return []
        
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(
            (Blog.title.contains(query)) |
            (Blog.content.contains(query)) |
            (Blog.summary.contains(query))
        ).all()
        return [self._blog_to_dict(blog, author) for blog, author in results]
    
    def search_blogs_summary(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """搜索博客摘要（不包含content），根据匹配结果提取上下文作为摘要"""
        if not query:
            return []
        
        # 使用join查询获取博客和作者信息
        results = db.query(Blog, User).join(User, Blog.author_id == User.id).filter(
            (Blog.title.contains(query)) |
            (Blog.content.contains(query)) |
            (Blog.summary.contains(query))
        ).all()
        return [self._blog_summary_to_dict_with_context(blog, author, query) for blog, author in results]
    
    def create_blog(self, db: Session, blog_data: BlogCreate, author_id: str) -> Dict[str, Any]:
        """创建新博客"""
        # 获取作者信息
        author = db.query(User).filter(User.id == author_id).first()
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
            create_time=datetime.now(),
            update_time=datetime.now(),
            status=blog_data.status,
            views=0
        )
        
        db.add(new_blog)
        db.commit()
        
        return self._blog_to_dict(new_blog, author)
    
    def update_blog(self, db: Session, blog_id: str, updates: Dict[str, Any]) -> bool:
        """更新博客"""
        blog = db.query(Blog).filter(Blog.id == blog_id).first()
        if not blog:
            return False
        
        for key, value in updates.items():
            if hasattr(blog, key.replace('Time', '_time')):  # 处理时间字段
                attr_name = key.replace('Time', '_time') if 'Time' in key else key
                setattr(blog, attr_name, value)
        
        blog.update_time = datetime.now()
        db.commit()
        return True
    
    def delete_blog(self, db: Session, blog_id: str) -> bool:
        """删除博客"""
        blog = db.query(Blog).filter(Blog.id == blog_id).first()
        if not blog:
            return False
        
        db.delete(blog)
        db.commit()
        return True
    
    def increment_blog_views(self, db: Session, blog_id: str) -> bool:
        """增加博客浏览次数"""
        blog = db.query(Blog).filter(Blog.id == blog_id).first()
        if not blog:
            return False
        
        blog.views += 1
        db.commit()
        return True
    
    def save_blogs_batch(self, db: Session, blogs: List[Dict[str, Any]]):
        """批量保存博客"""
        # 清空现有博客
        db.query(Blog).delete()
        
        # 添加新博客
        for blog_data in blogs:
            blog = Blog(
                id=blog_data['id'],
                title=blog_data['title'],
                content=blog_data['content'],
                summary=blog_data.get('summary'),
                category=blog_data['category'],
                tags=blog_data.get('tags', []),
                author_id=blog_data['authorId'],
                create_time=datetime.fromisoformat(blog_data['createTime'].replace('Z', '')),
                update_time=datetime.fromisoformat(blog_data['updateTime'].replace('Z', '')),
                status=blog_data.get('status', 'draft'),
                views=blog_data.get('views', 0)
            )
            db.add(blog)
        
        db.commit()

_blog_service = None
# 单例获取函数
def get_blog_service_singleton() -> BlogService:
    """获取博客服务单例"""
    global _blog_service
    if _blog_service is None:
        _blog_service = BlogService()
    return _blog_service

