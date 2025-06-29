# 对话搜索API使用指南

## 概述

新增的对话搜索功能允许用户在自己的对话历史中搜索特定的关键词，支持搜索对话标题和消息内容。

## API端点

```
GET /api/conversations/search/conversations
```

## 请求参数

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
| query | string | 是 | - | 搜索关键词，不能为空，最大长度100字符 |
| limit | integer | 否 | 20 | 返回结果数量限制 |
| offset | integer | 否 | 0 | 结果偏移量，用于分页 |

## 响应格式

```json
{
  "results": [
    {
      "id": "conversation_id",
      "session_id": "session_id", 
      "title": "对话标题",
      "match_count": 3,
      "context": "[标题] ...匹配的上下文内容...",
      "create_time": "2024-01-01T00:00:00Z",
      "update_time": "2024-01-01T00:00:00Z"
    }
  ],
  "total_count": 15,
  "query": "搜索关键词"
}
```

## 响应字段说明

### SearchResponse
- `results`: 搜索结果列表
- `total_count`: 总匹配数量
- `query`: 原始搜索查询

### ConversationSearchResult
- `id`: 对话ID
- `session_id`: 会话ID
- `title`: 对话标题
- `match_count`: 匹配次数（包含标题和消息中的所有匹配）
- `context`: 首次匹配附近的120个字符，包含来源标识
- `create_time`: 对话创建时间
- `update_time`: 对话最后更新时间

## Context 字段格式

Context字段会根据匹配位置显示不同的前缀：

- `[标题] ...` - 匹配发生在对话标题中
- `[用户] ...` - 匹配发生在用户消息中
- `[助手] ...` - 匹配发生在AI助手回复中
- `[系统] ...` - 匹配发生在系统消息中

如果匹配内容不在开头或结尾，会添加省略号（`...`）表示截断。

## 使用示例

### 1. 基本搜索

```bash
GET /api/conversations/search/conversations?query=Python编程
```

### 2. 分页搜索

```bash
GET /api/conversations/search/conversations?query=AI&limit=10&offset=20
```

### 3. JavaScript 调用示例

```javascript
async function searchConversations(query, limit = 20, offset = 0) {
  const response = await fetch(
    `/api/conversations/search/conversations?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    throw new Error('搜索失败');
  }
}

// 使用示例
searchConversations('机器学习')
  .then(result => {
    console.log(`找到 ${result.total_count} 个匹配的对话`);
    result.results.forEach(item => {
      console.log(`${item.title} (匹配${item.match_count}次)`);
      console.log(`上下文: ${item.context}`);
    });
  })
  .catch(console.error);
```

## 搜索特性

1. **大小写不敏感**：搜索时忽略大小写
2. **中文支持**：完全支持中文搜索
3. **多次匹配**：统计同一对话中的所有匹配次数
4. **上下文预览**：提供匹配位置前后的内容预览
5. **来源标识**：清楚标明匹配来自标题还是特定角色的消息
6. **智能排序**：按匹配次数优先，时间次之排序
7. **分页支持**：支持大量结果的分页浏览

## 错误处理

- `400 Bad Request`: 查询为空或过长
- `401 Unauthorized`: 未授权访问
- `500 Internal Server Error`: 服务器内部错误

## 权限说明

- 用户只能搜索自己创建的对话
- 不会返回已删除的对话
- 需要有效的认证token 