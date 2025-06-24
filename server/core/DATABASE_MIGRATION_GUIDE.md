# 数据库架构重构指南

## 问题分析

### 1. get_db函数安全性问题 ❌

**原问题**：
```python
# 在 services/ai_provider_service.py:290
db = next(get_db())  # 危险！可能导致数据库连接泄漏
```

**解决方案**：
```python
# ✅ 方法1: 使用FastAPI依赖注入（推荐）
@router.get("/example")
async def example_endpoint(db: Session = Depends(get_db)):
    service = AIProviderService(db)
    return service.some_method()

# ✅ 方法2: 使用上下文管理器
from models.database import DatabaseManager
with DatabaseManager() as db:
    service = AIProviderService(db)
    result = service.some_method()

# ✅ 方法3: 手动管理会话
from models.database import get_db_session
db = get_db_session()
try:
    service = AIProviderService(db)
    result = service.some_method()
except Exception as e:
    db.rollback()
    raise e
finally:
    db.close()
```

### 2. 数据库层拆分 ✅

**原问题**：
- `core/database.py` 中的 `SQLiteDatabase` 类有1055行
- 违反单一职责原则，混合了多个业务域的操作

**解决方案**：
按业务域拆分为多个服务类：
- `UserService` - 用户相关操作
- `BlogService` - 博客相关操作  
- `CategoryService` - 分类相关操作
- `ConfigService` - 配置相关操作
- `FileService` - 文件相关操作
- `DatabaseManager` - 统一管理所有服务

## 新架构介绍

### 文件结构
```
server/core/
├── __init__.py                 # 模块导出和向后兼容
├── database_manager.py         # 数据库管理器
├── user_service.py            # 用户服务
├── blog_service.py            # 博客服务
├── category_service.py        # 分类服务
├── config_service.py          # 配置服务
├── file_service.py            # 文件服务
└── DATABASE_MIGRATION_GUIDE.md # 本指南
```

### 使用方式

#### 1. 在FastAPI路由中使用（推荐）
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from models.database import get_db
from core import UserService, BlogService

@router.get("/users")
async def get_users(db: Session = Depends(get_db)):
    user_service = UserService(db)
    return user_service.get_all_users()

@router.get("/blogs")
async def get_blogs(db: Session = Depends(get_db)):
    blog_service = BlogService(db)
    return blog_service.get_all_blogs_summary()
```

#### 2. 在非FastAPI环境中使用
```python
from models.database import DatabaseManager
from core import UserService, BlogService

# 使用上下文管理器（推荐）
with DatabaseManager() as db:
    user_service = UserService(db)
    blog_service = BlogService(db)
    
    users = user_service.get_all_users()
    blogs = blog_service.get_all_blogs()
```

#### 3. 使用统一的数据库管理器
```python
from models.database import DatabaseManager
from core.database_manager import DatabaseManager as CoreDatabaseManager

with DatabaseManager() as db:
    db_manager = CoreDatabaseManager(db)
    
    # 直接调用所有方法，就像以前的SQLiteDatabase一样
    users = db_manager.get_all_users()
    blogs = db_manager.get_all_blogs()
    categories = db_manager.get_all_categories()
```

#### 4. 向后兼容方式（不推荐，仅用于过渡）
```python
from core import db  # 全局实例

# 可以像以前一样使用，但有线程安全问题
users = db.get_all_users()
blogs = db.get_all_blogs()
```

## 迁移步骤

### 第一阶段：无破坏性迁移 ✅ 已完成
- [x] 创建新的服务类
- [x] 创建数据库管理器
- [x] 保持向后兼容的API
- [x] 修复get_db安全问题

### 第二阶段：逐步迁移（建议）
1. 新功能使用新的服务类
2. 在路由中使用依赖注入替代全局实例
3. 逐步重构现有代码

### 第三阶段：完全迁移（可选）
1. 移除全局数据库实例
2. 删除旧的database.py文件
3. 更新所有导入语句

## 最佳实践

### ✅ 推荐做法

1. **使用依赖注入**：
```python
@router.get("/example")
async def example(db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_all_users()
```

2. **使用上下文管理器**：
```python
from models.database import DatabaseManager
with DatabaseManager() as db:
    service = UserService(db)
    result = service.some_method()
```

3. **服务层事务管理**：
```python
def create_blog_with_category(db: Session, blog_data, author_id):
    try:
        blog_service = BlogService(db)
        category_service = CategoryService(db)
        
        # 创建博客
        blog = blog_service.create_blog(blog_data, author_id)
        
        # 更新分类计数
        category_service.update_category_counts()
        
        db.commit()
        return blog
    except Exception as e:
        db.rollback()
        raise e
```

### ❌ 避免的做法

1. **直接调用生成器**：
```python
db = next(get_db())  # 危险！
```

2. **全局数据库实例在多线程环境**：
```python
from core import db
# 在多线程/异步环境中可能有问题
```

3. **忘记异常处理**：
```python
db = get_db_session()
service = UserService(db)
result = service.some_method()
db.close()  # 如果出现异常，这里不会执行
```

## 性能优化建议

1. **批量操作**：使用各服务的batch方法
2. **连接池**：SQLAlchemy自动管理连接池
3. **查询优化**：使用join查询减少N+1问题
4. **事务管理**：合理使用事务边界

## 监控和调试

1. **启用SQL日志**：在开发环境中设置 `echo=True`
2. **连接池监控**：监控数据库连接数量
3. **错误处理**：确保所有数据库操作都有适当的异常处理

## 常见问题解答

**Q: 旧代码还能正常工作吗？**
A: 是的，我们保持了完整的向后兼容性。

**Q: 什么时候需要迁移？**
A: 建议在新功能中使用新架构，旧功能可以逐步迁移。

**Q: 如何处理事务？**
A: 在服务层使用同一个Session实例，让调用者管理事务边界。

**Q: 性能会受影响吗？**
A: 不会，新架构主要是代码组织的改进，不影响运行时性能。 