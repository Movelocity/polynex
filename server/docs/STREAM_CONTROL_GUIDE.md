# 流式聊天控制功能指南

本文档介绍如何使用流式聊天的断开连接（disconnect）和中止（abort）功能。

## 功能概述

系统提供了两种控制流式聊天的方式：

1. **断开连接（Disconnect）**：客户端断开连接，但服务器继续处理请求，AI 继续生成内容并保存到数据库。
2. **中止任务（Abort）**：完全停止 AI 生成过程，取消 API 调用，不再继续处理。

## 使用方法

### 1. 发起聊天请求

在发送聊天请求时，系统会自动使用对话的 `session_id` 来跟踪和控制会话：

```json
{
  "message": "用户消息内容",
  "agentId": "agent-123",
  "conversationId": "conv-456"
}
```

如果是新对话，系统会自动创建一个新的对话并生成 `session_id`。

### 2. 断开连接但保持任务运行

当客户端需要断开连接但希望 AI 继续生成内容时（例如用户关闭页面但希望任务继续完成），可以调用：

```
POST /api/conversations/disconnect
```

请求体：
```json
{
  "session_id": "对话的session_id"
}
```

响应：
```json
{
  "message": "Stream disconnected successfully, task continues running in background"
}
```

### 3. 中止任务

当需要完全停止 AI 生成过程时（例如用户点击"停止生成"按钮），可以调用：

```
POST /api/conversations/abort
```

请求体：
```json
{
  "session_id": "对话的session_id"
}
```

响应：
```json
{
  "message": "Stream task aborted successfully"
}
```

## 技术实现

1. **断开连接（Disconnect）**：
   - 将任务状态设置为 `DISCONNECTED`
   - 任务继续运行，但不再向客户端发送数据
   - 完成后将结果保存到数据库
   - 任务完成 60 秒后自动从任务池中移除

2. **中止任务（Abort）**：
   - 设置任务的 `cancel_requested` 标志
   - 取消底层的异步任务
   - 向结果队列发送取消消息
   - 不保存未完成的回复到数据库

## 前端实现建议

### 生成页面关闭时

```javascript
// 当用户关闭页面但希望继续生成
async function handlePageClose(sessionId) {
  try {
    await fetch('/api/conversations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
  } catch (error) {
    console.error('Failed to disconnect stream:', error);
  }
}
```

### 用户点击停止按钮时

```javascript
// 当用户点击"停止生成"按钮
async function handleStopGeneration(sessionId) {
  try {
    const response = await fetch('/api/conversations/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error('Failed to abort stream:', error);
  }
}
```

## 注意事项

1. 每个对话都有一个唯一的 `session_id`，用于标识和控制流式生成
2. 断开连接后，任务仍会消耗服务器资源，直到完成
3. 中止任务会立即释放相关资源
4. 系统会在任务完成或失败 60 秒后自动清理相关资源 