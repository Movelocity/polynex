# AI Provider 和 Agent 架构重构说明

## 概述

本次重构主要重新设计了AI Provider和Agent的架构，主要目标是：

1. **支持多供应商管理**: 允许对接同一类型的多家供应商（如多个OpenAI账户）
2. **简化Agent配置**: Agent不再存储敏感的API密钥，只需要知道provider和model就能获取服务
3. **支持代理配置**: 为某些需要代理才能访问的provider提供代理支持
4. **更灵活的命名**: provider名称由用户自定义，可以有意义的命名

## 主要变更

### 1. AIProviderConfig 模型变更

**旧架构：**
```python
class AIProviderConfig:
    provider: AIProvider  # 枚举：openai, anthropic, google, ollama, custom
    # 其他字段...
```

**新架构：**
```python
class AIProviderConfig:
    provider: str  # 用户自定义名称，如 "my-openai", "company-claude"，必须唯一
    provider_type: AIProviderType  # 技术类型：openai, anthropic, google, ollama, custom  
    proxy: Optional[Dict]  # 代理配置
    # 其他字段...
```

**主要改动：**
- `provider` 字段从枚举改为字符串，支持用户自定义命名
- 新增 `provider_type` 字段表示技术类型
- 新增 `proxy` 字段支持代理配置

### 2. Agent 模型变更

**旧架构：**
```python
class Agent:
    provider_config_id: Optional[str]  # 关联的供应商配置ID
    model: Optional[str]  # 可选的模型覆盖
    # 其他字段...
```

**新架构：**
```python
class Agent:
    provider: str  # 供应商名称（对应AIProviderConfig.provider）
    model: str  # 必须指定模型
    # 其他字段...
```

**主要改动：**
- 移除 `provider_config_id` 字段
- 改为直接引用 `provider` 名称
- `model` 字段变为必填项

### 3. 代理配置支持

新增代理配置结构：

```python
class ProxyConfig:
    host: Optional[str] = None
    port: Optional[int] = None  
    username: Optional[str] = None
    password: Optional[str] = None
```

## 数据库迁移

### 迁移脚本

执行以下命令进行数据库迁移：

```bash
cd server
python migrations/migrate_provider_architecture.py
```

### 迁移内容

1. **备份原表**: 创建 `ai_provider_configs_backup` 和 `agents_backup` 表
2. **重建表结构**: 使用新的字段结构重建表
3. **数据迁移**: 
   - AI Provider配置：将旧的枚举类型provider转为provider_type，生成新的provider名称
   - Agent配置：将provider_config_id映射为provider名称，确保model不为空

### 迁移映射规则

- **Provider名称生成**: 基于原配置的`name`字段，转为小写并替换空格为连字符
- **默认模型**: 如果Agent的model为空，设置为`gpt-3.5-turbo`
- **孤儿Agent处理**: 如果Agent引用的provider_config_id不存在，映射到默认配置

## API变更

### AI Provider API

**创建Provider:**
```json
{
  "name": "我的OpenAI账户",
  "provider": "my-openai",
  "provider_type": "openai", 
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-xxx",
  "proxy": {
    "host": "127.0.0.1",
    "port": 7890,
    "username": "",
    "password": ""
  },
  "models": ["gpt-3.5-turbo", "gpt-4"],
  "default_model": "gpt-3.5-turbo"
}
```

### Agent API

**创建Agent:**
```json
{
  "agent_id": "my-assistant",
  "provider": "my-openai",
  "model": "gpt-4",
  "temperature": 0.7,
  "preset_messages": [...],
  "app_preset": {...}
}
```

## 服务层变更

### AIProviderService

新增方法：
- `get_provider_config_by_name(provider: str)`: 根据provider名称获取配置
- `get_all_provider_configs()`: 获取所有配置

修改方法：
- `create_provider_config()`: 支持新字段
- `get_best_provider_config()`: 参数改为`provider_type`

### ConversationService

新增Agent相关方法：
- `create_agent()`: 创建Agent
- `get_user_agents()`: 获取用户的Agent列表
- `get_agent()`: 获取指定Agent
- `update_agent()`: 更新Agent
- `delete_agent()`: 删除Agent

修改方法：
- `stream_chat()`: 使用新的provider架构获取配置

## 使用示例

### 1. 配置多个OpenAI账户

```python
# 主要账户
await create_provider({
    "name": "OpenAI主账户",
    "provider": "openai-main",
    "provider_type": "openai",
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-main-xxx",
    "is_default": True
})

# 备用账户
await create_provider({
    "name": "OpenAI备用账户", 
    "provider": "openai-backup",
    "provider_type": "openai",
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-backup-xxx"
})
```

### 2. 创建使用不同账户的Agent

```python
# 使用主账户的助手
await create_agent({
    "agent_id": "general-assistant",
    "provider": "openai-main",
    "model": "gpt-4",
    "app_preset": {"name": "通用助手"}
})

# 使用备用账户的代码助手
await create_agent({
    "agent_id": "code-assistant", 
    "provider": "openai-backup",
    "model": "gpt-3.5-turbo",
    "app_preset": {"name": "代码助手"}
})
```

### 3. 配置需要代理的供应商

```python
await create_provider({
    "name": "Claude通过代理",
    "provider": "claude-proxy",
    "provider_type": "anthropic", 
    "base_url": "https://api.anthropic.com",
    "api_key": "sk-ant-xxx",
    "proxy": {
        "host": "127.0.0.1",
        "port": 7890
    }
})
```

## 注意事项

1. **API密钥安全**: Provider配置包含敏感的API密钥，应确保适当的访问控制
2. **Provider名称唯一性**: provider字段必须在全局范围内唯一
3. **模型验证**: 创建Agent时会验证指定的模型是否在Provider的models列表中
4. **向后兼容**: 迁移脚本会保留备份表，如有问题可以回滚
5. **代理配置**: 代理配置为可选项，如果不需要代理访问可以留空

## 后续计划

1. **加密存储**: 计划对API密钥进行加密存储
2. **更多供应商**: 支持更多AI服务提供商
3. **负载均衡**: 支持在多个相同类型的Provider之间进行负载均衡
4. **监控指标**: 添加Provider使用情况的监控和统计 