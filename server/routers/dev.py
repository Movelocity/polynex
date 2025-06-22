from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime

from models import User, Blog, UserRole
from database import db
from auth import get_current_user_id, get_password_hash

router = APIRouter(prefix="/api/dev", tags=["开发测试"])


# ===== 权限检查函数 =====

def check_admin_permission(current_user_id: str) -> bool:
    """检查用户是否为管理员"""
    user_data = db.get_user_by_id(current_user_id)
    return user_data and user_data['role'] == 'admin'


def require_admin_permission(current_user_id: str = Depends(get_current_user_id)):
    """要求管理员权限的依赖"""
    if not check_admin_permission(current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user_id


# ===== 开发者数据生成接口 =====

@router.post("/generate-sample-data")
async def generate_sample_data(
    force: bool = False,
    admin_user_id: str = Depends(require_admin_permission)
):
    """生成示例数据（开发者/管理员使用）"""
    session = db._get_session()
    try:
        # 检查是否已有用户数据
        user_count = session.query(User).count()
        if user_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="已存在用户数据，如需强制生成请使用 force=true 参数"
            )
        
        # 如果force=true，清空现有数据
        if force:
            session.query(Blog).delete()
            session.query(User).delete()
        
        # 创建示例用户
        from ..auth import get_password_hash
        
        demo_user = User(
            id='demo-user-1',
            username='博客达人',
            email='demo@example.com',
            password=get_password_hash('demo123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
            role=UserRole.ADMIN,
            register_time=datetime.fromisoformat('2024-01-01T00:00:00')
        )
        
        demo1_user = User(
            id='demo1-user-1',
            username='测试用户',
            email='demo1@example.com',
            password=get_password_hash('demo123'),
            avatar=None,
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-01-01T00:00:00')
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
        
        session.add_all([demo_user, demo1_user, tech_user])
        
        # 创建示例博客
        sample_blog = Blog(
            id=db._generate_id(),
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
        session.add(sample_blog)
        
        session.commit()
        
        # 更新分类计数
        db.update_category_counts()
        
        return {
            "message": "示例数据生成成功",
            "users_created": 3,
            "blogs_created": 1
        }
        
    except Exception as e:
        session.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据生成失败：{str(e)}"
        )
    finally:
        session.close() 