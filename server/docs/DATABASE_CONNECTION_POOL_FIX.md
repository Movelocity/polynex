# 数据库连接池超时问题修复方案

## 问题描述

项目出现了 SQLAlchemy 连接池超时错误：
```
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00
```

这表明数据库连接池已达到最大限制（5个连接 + 10个溢出连接），并且在30秒内无法获取新连接。

## 根本原因分析

1. **连接池配置过小**：默认连接池大小只有5个，溢出连接10个，对于AI聊天应用来说不足够
2. **长时间持有数据库会话**：`StreamTask` 在整个AI对话过程中持有数据库会话，可能持续几分钟到几十分钟
3. **异步任务中的连接泄漏**：长时间运行的流式任务占用连接而不释放
4. **缺乏连接管理监控**：没有有效的连接池状态监控

## 修复方案

### 1. 优化连接池配置 (`server/models/database.py`)

```python
engine = create_engine(
    database_url, 
    echo=False,
    # 连接池配置优化
    pool_size=20,           # 从默认5增加到20
    max_overflow=30,        # 从默认10增加到30  
    pool_timeout=60,        # 从默认30秒增加到60秒
    pool_recycle=3600,      # 连接回收时间：1小时
    pool_pre_ping=True,     # 连接前先ping，确保连接有效
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
)
```

### 2. 修复长时间持有会话问题 (`server/services/chat_service.py`)

**修改前**：`StreamTask` 初始化时接收并长时间持有数据库会话
```python
class StreamTask:
    def __init__(self, ..., db: Session = None, ...):
        self.db = db  # 长时间持有会话
```

**修改后**：移除长时间持有，改为按需获取临时会话
```python
class StreamTask:
    def __init__(self, ..., provider_service: AIProviderService = None):
        # 移除db参数，改为按需获取
        self.provider_service = provider_service

# 使用临时数据库会话
with DatabaseManager() as db:
    # 执行数据库操作
    conversation = await conversation_srv.create_conversation(...)
```

### 3. 改进数据库管理器 (`server/models/database.py`)

```python
class DatabaseManager:
    """数据库管理器，提供上下文管理器支持"""
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.db:
            try:
                if exc_type is not None:
                    self.db.rollback()
                else:
                    self.db.commit()  # 正常情况下提交事务
            except Exception as e:
                logging.error(f"Error in database transaction: {e}")
                self.db.rollback()
            finally:
                self.db.close()  # 确保连接正确关闭
```

### 4. 添加连接池监控

- 新增 `check_database_health()` 函数检查数据库健康状态
- 新增 `get_connection_pool_status()` 函数获取连接池状态
- 增强 `/health` 接口，返回数据库连接池信息

## 预期效果

1. **连接池容量提升**：从最大15个连接提升到50个连接
2. **连接超时时间增加**：从30秒提升到60秒
3. **消除连接泄漏**：StreamTask不再长时间持有连接
4. **自动连接回收**：1小时自动回收旧连接
5. **连接健康检查**：pre_ping确保连接有效性
6. **实时监控**：通过健康检查接口监控连接池状态

## 测试方法

1. **查看连接池状态**：
   ```bash
   curl http://localhost:8765/health
   ```

2. **并发测试**：模拟多个用户同时发起AI对话请求

3. **长时间运行测试**：让AI对话任务运行较长时间，观察连接是否正确释放

## 监控建议

定期检查以下指标：
- `pool_size`: 连接池大小
- `checked_out`: 当前使用中的连接数
- `overflow`: 溢出连接数
- `invalid`: 无效连接数

如果 `checked_out + overflow` 接近 `pool_size + max_overflow`，说明连接池压力较大，需要进一步优化。

## 部署注意事项

1. 重启服务后新配置才会生效
2. 监控服务启动后的连接池状态
3. 如果使用的是生产数据库，确保数据库服务器支持更多并发连接
4. 考虑使用连接池监控工具进行长期监控