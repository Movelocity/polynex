# Agent表主键迁移指南

## 概述

此迁移将Agent表的主键从`id`字段改为`agent_id`字段，并删除原来的`id`列。同时处理所有相关的外键引用和代码修改。

## 迁移内容

### 数据库变更
1. **Agent表结构修改**：
   - 删除`id`列（原主键，UUID类型）
   - 将`agent_id`字段设置为主键
   - 移除`agent_id`字段的unique约束（因为现在是主键）

2. **外键关系更新**：
   - 更新`LLMRequestLog`表的`agent_id`字段，使其引用`agents.agent_id`而不是`agents.id`
   - 重新建立外键约束

3. **数据一致性**：
   - 保证所有`LLMRequestLog`记录正确关联到对应的Agent
   - 确保没有数据丢失

### 代码变更
1. **后端代码**：
   - 修改数据库模型定义
   - 更新服务层中的查询逻辑
   - 修改API响应中的ID字段映射

2. **前端代码**：
   - 统一使用`agent.id`字段（现在包含agent_id的值）
   - 更新所有Agent相关的UI逻辑

## 使用方法

### 1. 数据备份
```bash
# 备份数据库（强烈建议）
mysqldump -u username -p database_name > backup_before_migration.sql
```

### 2. 检查数据一致性
```bash
cd server/migrations
python migrate_agent_table_primary_key.py --check-only
```

### 3. 执行迁移
```bash
cd server/migrations
python migrate_agent_table_primary_key.py
```

### 4. 验证迁移结果
```bash
cd server/migrations
python migrate_agent_table_primary_key.py --verify-only
```

## 迁移前检查清单

- [ ] 数据库已备份
- [ ] 确认没有正在进行的Agent相关操作
- [ ] 确认所有Agent记录都有有效的`agent_id`
- [ ] 确认没有重复的`agent_id`值
- [ ] 确认所有`LLMRequestLog`记录的`agent_id`都能找到对应的Agent

## 可能遇到的问题

### 1. 数据一致性问题
**问题**：有LLMRequestLog记录引用了不存在的Agent
**解决**：清理无效的日志记录或修复Agent数据

### 2. 重复的agent_id
**问题**：存在重复的agent_id值
**解决**：手动解决冲突，确保agent_id唯一

### 3. 外键约束失败
**问题**：外键约束创建失败
**解决**：检查数据完整性，确保所有引用都有效

## 回滚方案

如果迁移失败，请从备份恢复：

```bash
# 停止应用服务
# 恢复数据库备份
mysql -u username -p database_name < backup_before_migration.sql
```

**注意**：由于此迁移涉及删除列，完全的回滚需要从备份恢复。

## 迁移后验证

### 1. 数据库结构检查
```sql
-- 检查Agent表结构
DESCRIBE agents;

-- 检查主键设置
SHOW INDEX FROM agents WHERE Key_name = 'PRIMARY';

-- 检查外键约束
SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'llm_request_logs' AND COLUMN_NAME = 'agent_id';
```

### 2. 功能测试
- [ ] Agent列表显示正常
- [ ] Agent创建/编辑/删除功能正常
- [ ] Agent与对话的关联正常
- [ ] LLM请求日志记录正常

## 性能影响

- **索引**：由于`agent_id`现在是主键，查询性能应该有所提升
- **存储**：删除UUID类型的`id`列可能节省一些存储空间
- **应用程序**：API响应中的`id`和`agent_id`字段现在包含相同的值

## 联系支持

如果遇到问题，请联系开发团队并提供：
1. 错误日志
2. 数据库状态信息
3. 具体的错误步骤

---

**重要提醒**：请在生产环境执行前，先在测试环境中完整验证此迁移过程。 