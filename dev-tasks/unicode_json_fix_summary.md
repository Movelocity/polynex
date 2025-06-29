# request_messages字段Unicode转义问题修复总结

## 问题描述

数据库的 `request_messages` 字段被配置为 JSON 类型，在存储中文字符时会被 Unicode 转义（如 `\u4f60\u662f\u8c01`），导致查看时中文字符无法正常显示。

## 解决方案

按照用户要求，将 `request_messages` 字段从 JSON 类型改为 TEXT 类型，并在保存前手动进行 JSON 序列化，在读取时手动进行反序列化。

## 实施步骤

### 1. 修改数据库模型

**文件**: `server/models/database.py`

- 将 `request_messages` 字段类型从 `UnicodeJSON` 改为 `Text`
- 修改 `to_dict()` 方法，在返回数据时手动解析 JSON 字符串

```python
# 修改前
request_messages = Column(UnicodeJSON, nullable=False)

# 修改后  
request_messages = Column(Text, nullable=False)  # 存储JSON序列化字符串
```

### 2. 修改服务层代码

**文件**: `server/services/llm_request_log_service.py`

- 在 `create_log_async()` 方法中，保存前手动序列化 `request_messages` 为 JSON 字符串
- 使用 `json.dumps(request_messages, ensure_ascii=False, separators=(',', ':'))` 确保中文不被转义

```python
# 手动序列化request_messages为JSON字符串，确保中文不被转义
request_messages_json = json.dumps(request_messages, ensure_ascii=False, separators=(',', ':'))

log_data = {
    # ...
    "request_messages": request_messages_json,  # 保存JSON字符串
    # ...
}
```

### 3. 数据库迁移

**文件**: `server/migrations/convert_request_messages_to_text.py`

创建了迁移脚本来：
- 将现有数据从 JSON 类型转换为 TEXT 类型
- 解码现有数据中的 Unicode 转义字符
- 重新序列化为不包含转义字符的 JSON 字符串

## 执行结果

### 数据库架构变更
- ✅ `request_messages` 字段类型已从 `JSON` 改为 `TEXT`
- ✅ 字段仍然保持 `NOT NULL` 约束

### 数据迁移结果
- ✅ 成功处理了 6 条现有记录
- ✅ 所有 Unicode 转义字符已被解码为正常中文
- ✅ 数据库备份已自动创建

### 功能验证
- ✅ 现有记录的中文字符显示完全正常
- ✅ 新记录创建时中文字符正确存储
- ✅ 通过 `to_dict()` 方法读取数据时中文显示正常
- ✅ 从数据库重新读取数据时中文字符保持正常

## 示例对比

### 修复前
```
原始存储: [{"role": "user", "content": "\u4f60\u662f\u8c01"}]
显示效果: 需要通过特殊处理才能正确显示中文
```

### 修复后
```
原始存储: [{"role":"user","content":"你是谁"}]
显示效果: 中文字符直接正常显示
```

## 技术要点

1. **手动JSON序列化**: 使用 `json.dumps(ensure_ascii=False)` 确保中文不被转义
2. **TEXT类型存储**: 避免数据库JSON类型的自动Unicode转义
3. **兼容性处理**: `to_dict()` 方法包含错误处理，确保数据解析的健壮性
4. **数据迁移**: 提供完整的迁移脚本，包含数据备份和回滚功能

## 影响范围

### 修改的文件
- `server/models/database.py`
- `server/services/llm_request_log_service.py`

### 新增的文件
- `server/migrations/convert_request_messages_to_text.py`

### 数据库变更
- `llm_request_logs` 表的 `request_messages` 字段类型变更

## 验证方法

可以通过以下方式验证修复效果：

```python
# 查询现有记录
from models.database import LLMRequestLog, SessionLocal
db = SessionLocal()
log = db.query(LLMRequestLog).first()
log_dict = log.to_dict()
print(log_dict['request_messages'])  # 应该显示正常中文
```

## 注意事项

1. 该修改是向前兼容的，不会影响现有功能
2. 数据库备份文件已自动创建，如需回滚可使用迁移脚本的 `--rollback` 选项
3. 新的实现方式更加直接，避免了数据库层面的Unicode转义问题

## 相关文档

- [LLM日志记录和SSE流式响应改进](./llm_logging_and_sse_improvements.md)
- [数据库迁移指南](../server/services/DATABASE_MIGRATION_GUIDE.md) 