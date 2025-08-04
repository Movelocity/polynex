# 消息迁移工具

这个目录包含将旧的 `conversations` 表中的消息历史迁移到新的 `messages` 表的工具。

## 文件说明

- `migrate_conversations_to_messages.py` - Python迁移脚本
- `run_migration.py` - 迁移脚本的包装器，提供备份功能
- `verify_migration.sql` - 验证迁移结果的SQL查询
- `create_messages_table.sql` - 创建messages表的SQL脚本

## 迁移特性

1. 将conversations表中的JSON格式消息迁移到messages表的结构化记录
2. 修改日期与创建日期保持一致
3. 同一个conv_id的消息按顺序排列
4. 按conversations表的create_time和update_time均匀分配创建时间
5. 使用nanoid生成消息ID (与应用其他部分保持一致)
6. 所有消息status设为active

## 使用方法

### 1. 运行迁移

使用包装脚本运行迁移（推荐）:

```bash
python run_migration.py /path/to/your/database.db --backup
```

参数:
- 第一个参数是SQLite数据库文件的路径
- `--backup` 选项会在迁移前创建数据库备份

或者直接运行迁移脚本:

```bash
python migrate_conversations_to_messages.py /path/to/your/database.db
```

### 2. 验证迁移

使用SQLite命令行工具运行验证查询:

```bash
sqlite3 /path/to/your/database.db < verify_migration.sql
```

## 注意事项

1. 在运行迁移前，建议先备份数据库
2. 迁移脚本会自动安装所需的依赖（如nanoid）
3. 迁移过程中会显示进度信息
4. 脚本每处理10个对话会提交一次事务，以避免长时间锁定数据库

## 技术细节

### 消息ID生成

使用nanoid库生成21字符长度的唯一ID，与应用其他部分保持一致。

### 时间戳分配

为了确保消息时间戳合理分布，脚本会在对话的创建时间和更新时间之间均匀分配时间戳。

### 发送者确定

- 当role为'user'时，发送者为对话的user_id
- 当role为'assistant'时，发送者为对话的agent_id（如果存在），否则为'system'
- 其他角色的发送者默认为'system'

### 数据库连接

脚本直接使用sqlite3模块连接数据库，避免引入ORM相关的依赖问题。