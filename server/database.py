import pandas as pd
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from models import User, Blog, Category, UserCreate, BlogCreate, CategoryCreate
import json
import os


class DataFrameDatabase:
    """使用 pandas DataFrame 作为简单数据存储的数据库类"""
    
    def __init__(self):
        self.data_dir = "data"
        os.makedirs(self.data_dir, exist_ok=True)
        
        # 初始化 DataFrames
        self.users_df = self._load_or_create_users()
        self.blogs_df = self._load_or_create_blogs()
        self.categories_df = self._load_or_create_categories()
        
        # 初始化示例数据
        self._initialize_sample_data()
    
    def _load_or_create_users(self) -> pd.DataFrame:
        """加载或创建用户数据表"""
        file_path = os.path.join(self.data_dir, "users.json")
        if os.path.exists(file_path):
            try:
                return pd.read_json(file_path, orient='records')
            except:
                pass
        
        return pd.DataFrame(columns=['id', 'username', 'email', 'password', 'avatar', 'registerTime'])
    
    def _load_or_create_blogs(self) -> pd.DataFrame:
        """加载或创建博客数据表"""
        file_path = os.path.join(self.data_dir, "blogs.json")
        if os.path.exists(file_path):
            try:
                return pd.read_json(file_path, orient='records')
            except:
                pass
        
        return pd.DataFrame(columns=[
            'id', 'title', 'content', 'summary', 'category', 'tags',
            'authorId', 'authorName', 'createTime', 'updateTime', 'status', 'views'
        ])
    
    def _load_or_create_categories(self) -> pd.DataFrame:
        """加载或创建分类数据表"""
        file_path = os.path.join(self.data_dir, "categories.json")
        if os.path.exists(file_path):
            try:
                return pd.read_json(file_path, orient='records')
            except:
                pass
        
        return pd.DataFrame(columns=['id', 'name', 'description', 'count'])
    
    def _save_users(self):
        """保存用户数据到文件"""
        file_path = os.path.join(self.data_dir, "users.json")
        self.users_df.to_json(file_path, orient='records', indent=2, force_ascii=False)
    
    def _save_blogs(self):
        """保存博客数据到文件"""
        file_path = os.path.join(self.data_dir, "blogs.json")
        self.blogs_df.to_json(file_path, orient='records', indent=2, force_ascii=False)
    
    def _save_categories(self):
        """保存分类数据到文件"""
        file_path = os.path.join(self.data_dir, "categories.json")
        self.categories_df.to_json(file_path, orient='records', indent=2, force_ascii=False)
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _initialize_sample_data(self):
        """初始化示例数据"""
        if len(self.users_df) == 0:
            # 创建示例用户
            demo_user = {
                'id': 'demo-user-1',
                'username': '博客达人',
                'email': 'demo@example.com',
                'password': 'demo123',  # 在实际应用中应该加密
                'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
                'registerTime': '2024-01-01T00:00:00.000Z'
            }
            
            # 添加一个与前端测试匹配的用户
            demo1_user = {
                'id': 'demo1-user-1',
                'username': '测试用户',
                'email': 'demo1@example.com',
                'password': 'demo123',
                'avatar': None,  # 没有头像，可以测试上传
                'registerTime': '2024-01-01T00:00:00.000Z'
            }
            
            tech_user = {
                'id': 'tech-user-1',
                'username': '技术小白',
                'email': 'tech@example.com',
                'password': 'tech123',
                'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
                'registerTime': '2024-02-01T00:00:00.000Z'
            }
            
            self.users_df = pd.concat([
                self.users_df,
                pd.DataFrame([demo_user, demo1_user, tech_user])
            ], ignore_index=True)
            self._save_users()
        
        if len(self.categories_df) == 0:
            # 创建示例分类
            categories = [
                {'id': 'cat-1', 'name': '技术', 'description': '技术相关文章', 'count': 0},
                {'id': 'cat-2', 'name': '生活', 'description': '生活感悟', 'count': 0},
                {'id': 'cat-3', 'name': '随笔', 'description': '随笔杂谈', 'count': 0}
            ]
            
            self.categories_df = pd.concat([
                self.categories_df,
                pd.DataFrame(categories)
            ], ignore_index=True)
            self._save_categories()
        
        if len(self.blogs_df) == 0:
            # 创建示例博客
            sample_blog = {
                'id': self._generate_id(),
                'title': 'FastAPI 快速入门指南',
                'content': '''# FastAPI 快速入门指南

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
                'summary': 'FastAPI 是一个现代、快速的 Python Web 框架，本文介绍了其主要特性和基本使用方法。',
                'category': '技术',
                'tags': ['Python', 'FastAPI', 'Web开发', 'API'],
                'authorId': 'demo-user-1',
                'authorName': '博客达人',
                'createTime': '2024-06-20T10:00:00.000Z',
                'updateTime': '2024-06-20T10:00:00.000Z',
                'status': 'published',
                'views': 42
            }
            
            self.blogs_df = pd.concat([
                self.blogs_df,
                pd.DataFrame([sample_blog])
            ], ignore_index=True)
            self._save_blogs()
            
            # 更新分类计数
            self.update_category_counts()

    # ===== 用户相关操作 =====

    def get_all_users(self) -> List[Dict[str, Any]]:
        """获取所有用户"""
        return self.users_df.to_dict('records')

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户"""
        user_rows = self.users_df[self.users_df['id'] == user_id]
        if len(user_rows) > 0:
            return user_rows.iloc[0].to_dict()
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取用户"""
        user_rows = self.users_df[self.users_df['email'] == email]
        if len(user_rows) > 0:
            return user_rows.iloc[0].to_dict()
        return None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取用户"""
        user_rows = self.users_df[self.users_df['username'] == username]
        if len(user_rows) > 0:
            return user_rows.iloc[0].to_dict()
        return None

    def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """创建新用户"""
        new_user = {
            'id': self._generate_id(),
            'username': user_data.username,
            'email': user_data.email,
            'password': user_data.password,  # 实际应用中应该加密
            'avatar': user_data.avatar,
            'registerTime': datetime.now().isoformat() + 'Z'
        }

        self.users_df = pd.concat([
            self.users_df,
            pd.DataFrame([new_user])
        ], ignore_index=True)
        self._save_users()
        return new_user

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """更新用户信息"""
        user_index = self.users_df[self.users_df['id'] == user_id].index
        if len(user_index) > 0:
            for key, value in updates.items():
                if key in self.users_df.columns:
                    self.users_df.loc[user_index[0], key] = value
            self._save_users()
            return True
        return False

    def save_users_batch(self, users: List[Dict[str, Any]]):
        """批量保存用户"""
        self.users_df = pd.DataFrame(users)
        self._save_users()

    # ===== 博客相关操作 =====

    def get_all_blogs(self) -> List[Dict[str, Any]]:
        """获取所有博客"""
        return self.blogs_df.to_dict('records')

    def get_published_blogs(self) -> List[Dict[str, Any]]:
        """获取已发布的博客"""
        published_blogs = self.blogs_df[self.blogs_df['status'] == 'published']
        return published_blogs.to_dict('records')

    def get_blog_by_id(self, blog_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取博客"""
        blog_rows = self.blogs_df[self.blogs_df['id'] == blog_id]
        if len(blog_rows) > 0:
            return blog_rows.iloc[0].to_dict()
        return None

    def get_blogs_by_author(self, author_id: str) -> List[Dict[str, Any]]:
        """根据作者ID获取博客"""
        author_blogs = self.blogs_df[self.blogs_df['authorId'] == author_id]
        return author_blogs.to_dict('records')

    def get_blogs_by_category(self, category: str) -> List[Dict[str, Any]]:
        """根据分类获取博客"""
        category_blogs = self.blogs_df[self.blogs_df['category'] == category]
        return category_blogs.to_dict('records')

    def search_blogs(self, query: str) -> List[Dict[str, Any]]:
        """搜索博客"""
        if not query:
            return []

        # 在标题、内容、摘要中搜索
        mask = (
            self.blogs_df['title'].str.contains(query, case=False, na=False) |
            self.blogs_df['content'].str.contains(query, case=False, na=False) |
            self.blogs_df['summary'].str.contains(query, case=False, na=False)
        )

        search_results = self.blogs_df[mask]
        return search_results.to_dict('records')

    def create_blog(self, blog_data: BlogCreate, author_id: str, author_name: str) -> Dict[str, Any]:
        """创建新博客"""
        now = datetime.now().isoformat() + 'Z'
        new_blog = {
            'id': self._generate_id(),
            'title': blog_data.title,
            'content': blog_data.content,
            'summary': blog_data.summary,
            'category': blog_data.category,
            'tags': blog_data.tags,
            'authorId': author_id,
            'authorName': author_name,
            'createTime': now,
            'updateTime': now,
            'status': blog_data.status,
            'views': 0
        }

        self.blogs_df = pd.concat([
            self.blogs_df,
            pd.DataFrame([new_blog])
        ], ignore_index=True)
        self._save_blogs()
        self.update_category_counts()
        return new_blog

    def update_blog(self, blog_id: str, updates: Dict[str, Any]) -> bool:
        """更新博客"""
        blog_index = self.blogs_df[self.blogs_df['id'] == blog_id].index
        if len(blog_index) > 0:
            for key, value in updates.items():
                if key in self.blogs_df.columns:
                    self.blogs_df.loc[blog_index[0], key] = value

            # 更新修改时间
            self.blogs_df.loc[blog_index[0], 'updateTime'] = datetime.now().isoformat() + 'Z'
            self._save_blogs()
            self.update_category_counts()
            return True
        return False

    def delete_blog(self, blog_id: str) -> bool:
        """删除博客"""
        blog_index = self.blogs_df[self.blogs_df['id'] == blog_id].index
        if len(blog_index) > 0:
            self.blogs_df = self.blogs_df.drop(blog_index[0]).reset_index(drop=True)
            self._save_blogs()
            self.update_category_counts()
            return True
        return False

    def increment_blog_views(self, blog_id: str) -> bool:
        """增加博客浏览量"""
        blog_index = self.blogs_df[self.blogs_df['id'] == blog_id].index
        if len(blog_index) > 0:
            current_views = self.blogs_df.loc[blog_index[0], 'views']
            self.blogs_df.loc[blog_index[0], 'views'] = current_views + 1
            self._save_blogs()
            return True
        return False

    def save_blogs_batch(self, blogs: List[Dict[str, Any]]):
        """批量保存博客"""
        self.blogs_df = pd.DataFrame(blogs)
        self._save_blogs()
        self.update_category_counts()

    # ===== 分类相关操作 =====

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """获取所有分类"""
        return self.categories_df.to_dict('records')

    def get_category_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取分类"""
        category_rows = self.categories_df[self.categories_df['name'] == name]
        if len(category_rows) > 0:
            return category_rows.iloc[0].to_dict()
        return None

    def create_category(self, category_data: CategoryCreate) -> Dict[str, Any]:
        """创建新分类"""
        new_category = {
            'id': self._generate_id(),
            'name': category_data.name,
            'description': category_data.description,
            'count': 0
        }

        self.categories_df = pd.concat([
            self.categories_df,
            pd.DataFrame([new_category])
        ], ignore_index=True)
        self._save_categories()
        return new_category

    def update_category(self, category_id: str, updates: Dict[str, Any]) -> bool:
        """更新分类"""
        category_index = self.categories_df[self.categories_df['id'] == category_id].index
        if len(category_index) > 0:
            for key, value in updates.items():
                if key in self.categories_df.columns:
                    self.categories_df.loc[category_index[0], key] = value
            self._save_categories()
            return True
        return False

    def delete_category(self, category_id: str) -> bool:
        """删除分类"""
        category_index = self.categories_df[self.categories_df['id'] == category_id].index
        if len(category_index) > 0:
            self.categories_df = self.categories_df.drop(category_index[0]).reset_index(drop=True)
            self._save_categories()
            return True
        return False

    def update_category_counts(self):
        """更新分类计数"""
        # 统计每个分类的博客数量
        if len(self.blogs_df) > 0:
            category_counts = self.blogs_df['category'].value_counts().to_dict()
        else:
            category_counts = {}

        # 更新分类表中的计数
        for index, row in self.categories_df.iterrows():
            category_name = row['name']
            count = category_counts.get(category_name, 0)
            self.categories_df.loc[index, 'count'] = count

        self._save_categories()

    def save_categories_batch(self, categories: List[Dict[str, Any]]):
        """批量保存分类"""
        self.categories_df = pd.DataFrame(categories)
        self._save_categories()


# 全局数据库实例
db = DataFrameDatabase()
