# AI供应商代理配置指南

本文档描述了如何在AI供应商配置中使用代理设置。

## 概述

AI供应商配置现在支持通过代理服务器进行连接，这对于需要通过企业代理或需要绕过网络限制的环境特别有用。

## 配置格式

### 新格式（推荐）

```json
{
  "url": "http://127.0.0.1:7890",
  "username": "optional_username",
  "password": "optional_password"
}
```

### 支持的代理类型

- **HTTP代理**: `http://proxy.example.com:8080`
- **HTTPS代理**: `https://proxy.example.com:8080`
- **SOCKS5代理**: `socks5://127.0.0.1:1080`

## 配置示例

### 1. 无认证的HTTP代理

```json
{
  "url": "http://127.0.0.1:7890",
  "username": "",
  "password": ""
}
```

### 2. 带认证的HTTP代理

```json
{
  "url": "http://proxy.company.com:3128",
  "username": "myuser",
  "password": "mypassword"
}
```

### 3. SOCKS5代理

```json
{
  "url": "socks5://127.0.0.1:1080",
  "username": "",
  "password": ""
}
```

## 功能特性

### 1. 自动代理验证

- 在创建或更新供应商配置时，系统会验证代理配置的有效性
- 如果代理配置无效，将抛出明确的错误信息

### 2. 代理连接测试

- 系统提供专门的代理连接测试功能
- 可以在不进行实际AI请求的情况下测试代理连接

### 3. 错误处理

- 代理连接失败时会提供详细的错误信息
- 支持区分代理错误和AI服务错误

### 4. 资源管理

- 自动管理httpx客户端连接
- 支持异步上下文管理器模式

## 数据迁移

### 从旧格式迁移

如果您之前使用的是旧的代理配置格式，可以使用以下命令进行迁移：

```bash
python migrations/migrate_proxy_config_format.py
```

### 回滚（如需要）

```bash
python migrations/migrate_proxy_config_format.py --rollback
```

## 使用方法

运行代理配置测试脚本：

```bash
python test_proxy_config.py 