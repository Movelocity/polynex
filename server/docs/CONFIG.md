# 博客平台后端配置说明

## 配置方式

配置分为两个层次：

1. **系统基础配置** - 通过环境变量或 `.env` 文件配置
2. **AI供应商配置** - 通过数据库和管理界面配置（推荐）

## 基础系统配置

### JWT 密钥（生产环境必填）
```bash
export BLOG_SECRET_KEY="your_super_secret_jwt_key"
```

### 服务器配置（可选）
```bash
# 服务器主机
export BLOG_HOST="0.0.0.0"

# 服务器端口
export BLOG_PORT="8765"

# 调试模式
export BLOG_DEBUG="false"
```

### 并发控制（可选）
```bash
# 最大并发LLM请求数
export BLOG_MAX_CONCURRENT_LLM_REQUESTS="10"
```

### 日志配置（可选）
```bash
# 日志级别
export BLOG_LOG_LEVEL="INFO"

# 日志文件路径（可选）
export BLOG_LOG_FILE="logs/app.log"
```

## AI供应商配置（新系统）

> ⚠️ **重要变更**: 从版本2.0开始，AI供应商配置不再通过环境变量管理，而是存储在数据库中，通过管理界面进行配置。

### 初始化AI供应商配置

1. **运行初始化脚本**：
```bash
cd server
python init_ai_providers.py
```

2. **启动服务器**：
```bash
python main.py
```

3. **使用管理员账户登录并配置供应商**

### 管理AI供应商配置

#### 通过API接口管理（仅管理员）

```bash
# 列出所有配置
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8765/api/ai-providers

# 创建新配置
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "My OpenAI Config",
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-your-actual-api-key",
    "models": ["gpt-3.5-turbo", "gpt-4"],
    "default_model": "gpt-3.5-turbo",
    "is_active": true,
    "is_default": true
  }' \
  http://localhost:8765/api/ai-providers

# 测试配置
curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8765/api/ai-providers/CONFIG_ID/test
```

#### 配置字段说明

- `name`: 配置名称（如"OpenAI主账户"）
- `provider`: 供应商类型（openai、anthropic、google、ollama、custom）
- `base_url`: API基础URL
- `api_key`: API密钥
- `models`: 支持的模型列表
- `default_model`: 默认模型
- `default_temperature`: 默认温度参数 (0.0-2.0)
- `default_max_tokens`: 默认最大tokens
- `is_active`: 是否激活
- `is_default`: 是否为默认供应商
- `priority`: 优先级（数字越大优先级越高）
- `rate_limit_per_minute`: 每分钟请求限制
- `description`: 配置描述

### 多供应商支持

系统支持同时配置多个AI供应商：

1. **多个OpenAI配置**: 不同API密钥、不同模型偏好
2. **不同供应商**: OpenAI、Anthropic、Google等
3. **自定义兼容服务**: 代理服务、本地部署等

### Agent配置关联

每个Agent可以：
- 指定特定的供应商配置（`provider_config_id`）
- 覆盖供应商的默认参数（模型、温度、最大tokens等）
- 如果未指定配置，使用系统默认配置

## .env 文件示例

创建 `server/.env` 文件：

```ini
# 基础配置（必填）
BLOG_SECRET_KEY=your_super_secret_jwt_key

# 服务器配置（可选）
BLOG_HOST=0.0.0.0
BLOG_PORT=8765
BLOG_DEBUG=false
BLOG_LOG_LEVEL=INFO
BLOG_MAX_CONCURRENT_LLM_REQUESTS=10

# 注意：不再需要OpenAI相关的环境变量
# BLOG_OPENAI_API_KEY=  # 已废弃，改为数据库配置
# BLOG_OPENAI_BASE_URL=  # 已废弃，改为数据库配置
```

## 升级指南

### 从旧版本升级

如果你从使用环境变量配置的旧版本升级：

1. **备份现有配置**：
```bash
# 记录你的现有环境变量
echo "OPENAI_API_KEY: $BLOG_OPENAI_API_KEY"
echo "OPENAI_BASE_URL: $BLOG_OPENAI_BASE_URL"
```

2. **运行初始化脚本**：
```bash
python init_ai_providers.py
```

3. **手动添加你的配置**：
使用管理界面或API将你的实际API密钥添加到数据库配置中

4. **移除环境变量**（可选）：
从 `.env` 文件中移除 `BLOG_OPENAI_*` 相关配置

## 配置验证

启动服务时会自动检查配置状态：

```
🔧 配置状态检查:
   数据库: sqlite:///./blog_platform.db
   AI供应商: ✅ 2个配置 (1个激活)
   默认供应商: OpenAI Official
   并发限制: 10 个请求
   服务地址: 0.0.0.0:8765
   日志级别: INFO
✅ 所有关键配置正常
```

## 常见问题

### 1. 如何获取OpenAI API Key
- 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
- 创建新的 API Key
- 在管理界面中添加配置

### 2. 使用代理或第三方API
```json
{
  "name": "通过代理的OpenAI",
  "provider": "openai",
  "base_url": "https://your-proxy.com/v1",
  "api_key": "your_proxy_api_key",
  "models": ["gpt-3.5-turbo", "gpt-4"]
}
```

### 3. 配置优先级
- Agent指定配置 > 默认配置 > 最高优先级配置
- 多个默认配置时，系统自动选择最新的

### 4. 安全考虑
- API密钥存储在数据库中（建议加密）
- 只有管理员可以管理供应商配置
- 定期轮换API密钥
- 设置合理的请求频率限制

### 5. 性能优化
根据你的OpenAI API配额调整 `BLOG_MAX_CONCURRENT_LLM_REQUESTS`：
- 免费用户：建议 3-5
- 付费用户：建议 10-20

## 故障排除

### 配置不生效
1. 检查配置是否激活（`is_active: true`）
2. 验证API密钥是否正确
3. 使用测试接口验证配置

### 无默认配置错误
1. 确保至少有一个配置标记为默认（`is_default: true`）
2. 或者为Agent指定特定的配置ID

### API调用失败
1. 检查网络连接
2. 验证API密钥权限
3. 检查请求频率是否超限 