from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from sqlalchemy.orm import Session

from models import UserRole
from fields import User, Blog
from models.database import get_db
from core import UserService, BlogService, CategoryService
from libs.auth import get_current_user_id, get_password_hash

router = APIRouter(prefix="/api/dev", tags=["开发测试"])


# ===== 权限检查函数 =====

def check_admin_permission(current_user_id: str, db: Session) -> bool:
    """检查用户是否为管理员"""
    user_service = UserService(db)
    user_data = user_service.get_user_by_id(current_user_id)
    return user_data and user_data['role'] == 'admin'


def require_admin_permission(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """要求管理员权限的依赖"""
    if not check_admin_permission(current_user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user_id


@router.post("/generate-sample-data")
async def generate_sample_data(
    force: bool = False,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """生成示例数据（管理员权限）"""
    user_service = UserService(db)
    blog_service = BlogService(db)
    category_service = CategoryService(db)
    
    # 检查是否已有数据
    existing_users = user_service.get_all_users()
    if existing_users and not force:
        return {
            "message": "示例数据已存在，使用 force=true 参数强制重新生成",
            "existing_users_count": len(existing_users)
        }
    
    try:
        # 创建示例用户
        demo_user = User(
            id='demo-user-1',
            username='演示用户',
            email='demo@example.com',
            password=get_password_hash('demo123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-01-15T00:00:00')
        )
        
        demo1_user = User(
            id='demo1-user-1',
            username='博客作者',
            email='demo1@example.com',
            password=get_password_hash('demo123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=demo1',
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-01-20T00:00:00')
        )
        
        tech_user = User(
            id='tech-user-1',
            username='技术小白',
            email='tech@example.com',
            password=get_password_hash('tech123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-02-01T00:00:00')
        )
        
        # 直接添加到数据库
        db.add_all([demo_user, demo1_user, tech_user])
        
        # 创建示例博客
        sample_blog = Blog(
            id=user_service._generate_id(),
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
            create_time=datetime.fromisoformat('2024-06-20T10:00:00'),
            update_time=datetime.fromisoformat('2024-06-20T10:00:00'),
            status='published',
            views=42
        )
        
        # 添加更多示例博客
        react_blog = Blog(
            id=user_service._generate_id(),
            title='React Hooks 深度解析',
            content='''# React Hooks 深度解析

React Hooks 是 React 16.8 版本引入的新特性，它让你在不编写 class 的情况下使用 state 以及其他的 React 特性。

## 什么是 Hooks？

Hooks 是一些可以让你在函数组件里"钩入" React state 及生命周期等特性的函数。

## 常用的 Hooks

### useState

```javascript
import React, { useState } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

### useEffect

```javascript
import React, { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## Hooks 的规则

1. 只在最顶层使用 Hook
2. 只在 React 函数中调用 Hook''',
            summary='React Hooks 让函数组件拥有了状态和生命周期方法的能力，本文详细介绍了常用的 Hooks 及其使用方法。',
            category='技术',
            tags=['React', 'JavaScript', 'Hooks', '前端开发'],
            author_id='demo1-user-1',
            create_time=datetime.fromisoformat('2024-06-22T14:30:00'),
            update_time=datetime.fromisoformat('2024-06-22T14:30:00'),
            status='published',
            views=89
        )
        
        life_blog = Blog(
            id=user_service._generate_id(),
            title='程序员的工作与生活平衡',
            content='''# 程序员的工作与生活平衡

作为一名程序员，如何在繁忙的工作中保持生活的平衡是一个重要的话题。

## 时间管理的重要性

良好的时间管理可以帮助我们：
- 提高工作效率
- 减少加班时间
- 留出更多时间给家庭和爱好

## 实用建议

### 1. 设定边界
- 明确工作时间和休息时间
- 避免在家庭时间处理工作邮件
- 学会说"不"

### 2. 保持学习
- 利用碎片时间学习新技术
- 参加技术社区活动
- 写技术博客分享经验

### 3. 身体健康
- 保持规律的作息时间
- 适量运动
- 注意饮食健康

## 总结

工作是为了更好的生活，而不是相反。找到适合自己的平衡点，才能在职业道路上走得更远。''',
            summary='作为程序员，如何平衡工作与生活是一个重要课题。本文分享了一些实用的时间管理和生活建议。',
            category='生活',
            tags=['工作', '生活', '程序员', '时间管理'],
            author_id='tech-user-1',
            create_time=datetime.fromisoformat('2024-06-25T09:15:00'),
            update_time=datetime.fromisoformat('2024-06-25T09:15:00'),
            status='published',
            views=67
        )
        
        db.add_all([sample_blog, react_blog, life_blog])
        
        # 提交所有数据
        db.commit()
        
        # 更新分类计数
        category_service.update_category_counts()
        
        return {
            "message": "示例数据生成成功",
            "users_created": 3,
            "blogs_created": 3
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成示例数据失败: {str(e)}"
        )


@router.delete("/clear-all-data")
async def clear_all_data(
    confirm: bool = False,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """清除所有数据（危险操作，需要管理员权限）"""
    if not confirm:
        return {
            "message": "这是一个危险操作，将删除所有数据。如果确认，请设置 confirm=true"
        }
    
    try:
        user_service = UserService(db)
        blog_service = BlogService(db)
        category_service = CategoryService(db)
        
        # 清除所有博客
        blogs = blog_service.get_all_blogs()
        for blog in blogs:
            blog_service.delete_blog(blog['id'])
        
        # 清除所有用户（除了当前管理员）
        users = user_service.get_all_users()
        for user in users:
            if user['id'] != admin_user_id:
                user_service.delete_user(user['id'])
        
        return {
            "message": "所有数据已清除",
            "remaining_users": 1,  # 当前管理员
            "deleted_blogs": len(blogs),
            "deleted_users": len(users) - 1
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清除数据失败: {str(e)}"
        ) 