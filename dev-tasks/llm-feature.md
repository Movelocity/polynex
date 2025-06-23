## 📋 OpenAI 对话功能开发 TODO 列表

- 保持解耦式开发，留出未来修改优化的空间

### 🗄️ **阶段一：数据库设计与模型** 
- [ ] **1.1** 在 `server/db_models.py` 中添加对话相关数据库模型：
  - `conversation` 对话会话表（id, session_id, messages, title）。其中，messages为json字符串，（每段message额外附带时间戳,请求对话api时过滤掉）
  - `agents` 对话预设表 (id, agent_id, provider, baseURL, api_key, preset_messages, app_preset)。其中，preset_messages为用户自定义的对话消息json字符串,也就是prompt；greetings 为定义的开场白json array，不加入上下文；app_preset 为应用相关的配置字典|json字符串，包含{name, description, greetings, suggested_questions, creation_date, ...} 以及一些 future features
- [ ] **1.2** 在 `server/models.py` 中添加对应的 Pydantic 模型
- [ ] **1.3** 更新数据库初始化和迁移脚本

### 🔧 **阶段二：后端核心服务**
- [ ] **2.1** 安装依赖包：
  - `openai` - OpenAI Python SD
- [ ] **2.2** 创建 `server/services/openai_service.py`：
  - OpenAI API 配置和调用
  - 对话上下文管理
  - 流式响应处理(yeild)
- [ ] **2.3** 创建 `server/services/conversation_service.py`：
  - 对话会话管理
  - 消息存储和检索。流式对话响应在后台完成时才写入数据库，避免同一conversation在生成期间多次写入不完整数据到数据库。
  - 异步锁处理（asyncio.Lock）用于会话状态一致性
- [ ] **2.4** 更新 `server/database.py` 添加对话相关数据操作方法（建议迁移到异步数据库操作）

### 🛣️ **阶段三：后端 API 路由**
- [ ] **3.1** 创建 `server/routers/conversations.py`：
  - `POST /api/conversations/` - 创建新对话
  - `GET /api/conversations/` - 获取用户对话列表
  - `GET /api/conversations/{id}` - 获取特定对话详情
  - `PUT /api/conversations/{id}/context` - 编辑对话上下文
  - `DELETE /api/conversations/{id}` - 删除对话
- [ ] **3.2** 创建 SSE 相关路由：
  - `GET /api/conversations/{id}/stream` - SSE 流式对话接口
  - `POST /api/conversations/{id}/messages` - 发送消息（触发 AI 响应）
- [ ] **3.3** 在 `server/main.py` 中注册新路由

### 🔒 **阶段四：后端安全与优化**
- [ ] **4.1** 实现请求限流和并发控制（使用asyncio.Semaphore限制同时进行的LLM请求数）
- [ ] **4.2** 添加 OpenAI API 密钥管理（环境变量/配置）
- [ ] **4.3** 实现对话权限验证（用户只能访问自己的对话）
- [ ] **4.4** 添加错误处理和日志记录
- [ ] **4.5** 优化数据库操作（考虑异步SQLAlchemy或添加连接池）

### 🎨 **阶段五：前端 API 服务**
- [ ] **5.1** 创建 `src/services/api/ConversationApiService.ts`：
  - 对话 CRUD 操作
  - SSE 客户端实现
  - 消息发送和接收
- [ ] **5.2** 更新 `src/services/index.ts` 导出新服务

### 📱 **阶段六：前端组件开发**
- [ ] **6.1** 创建对话相关类型定义 `src/types/conversation.ts`
- [ ] **6.2** 创建核心组件：
  - `src/components/conversation/ConversationList.tsx` - 对话列表
  - `src/components/conversation/ConversationChat.tsx` - 聊天界面
  - `src/components/conversation/MessageItem.tsx` - 消息条目
  - `src/components/conversation/ContextEditor.tsx` - 上下文编辑器
- [ ] **6.3** 创建 `src/hooks/useConversation.ts` - 对话状态管理钩子
- [ ] **6.4** 创建 `src/hooks/useSSE.ts` - SSE 连接管理钩子

### 🖥️ **阶段七：前端页面集成**
- [ ] **7.1** 创建主对话页面 `src/pages/Conversation.tsx`
- [ ] **7.2** 更新路由配置 `src/App.tsx` 添加对话页面路由
- [ ] **7.3** 更新导航菜单，添加对话入口
- [ ] **7.4** 实现断线重连和状态恢复逻辑

### 🎛️ **阶段八：管理功能**
- [ ] **8.1** 在管理员面板添加对话管理功能
- [ ] **8.2** 添加 OpenAI API 配置管理界面
- [ ] **8.3** 添加对话统计和监控

### 🧪 **阶段九：测试与优化**
- [ ] **9.1** 后端单元测试
- [ ] **9.2** 前端组件测试
- [ ] **9.3** SSE 连接稳定性测试
- [ ] **9.4** 并发处理压力测试
- [ ] **9.5** 内存泄漏和性能优化

### 📚 **阶段十：文档与部署**
- [ ] **10.1** 更新 API 文档
- [ ] **10.2** 添加部署配置（环境变量等）
- [ ] **10.3** 用户使用说明文档

---

## 🎯 **关键实现要点**

### **数据库设计关键字段**：
```sql
-- conversations 表
id, user_id, title, context, status, created_at, updated_at

-- conversation_messages 表  
id, conversation_id, role, content, tokens, created_at

-- conversation_contexts 表
id, user_id, name, content, is_default
```

### **SSE 实现关键点**：
- 后端使用异步生成器 `async def stream_response()`
- 前端使用 EventSource API 连接
- 每个 Event 数据格式：`{"type": "message", "data": {...}}`
- 实现心跳检测和自动重连

### **并发处理策略**：
- 使用 `asyncio.Lock()` 仅用于单个会话的状态更新
- 使用 `asyncio.Semaphore()` 限制同时进行的LLM API请求数量
- 每个对话会话独立的异步锁机制，避免全局锁
- 数据库操作建议使用异步SQLAlchemy或连接池
- LLM流式响应使用异步生成器，无需额外线程

### **性能建议**：
```python
# 推荐的服务架构
class ConversationService:
    def __init__(self):
        # 限制同时进行的LLM请求数量（避免API限制）
        self.llm_semaphore = asyncio.Semaphore(10)  
        # 每个会话的锁字典
        self.session_locks = {}
    
    async def stream_chat(self, session_id: str, message: str):
        # 获取会话特定的锁
        if session_id not in self.session_locks:
            self.session_locks[session_id] = asyncio.Lock()
        
        async with self.session_locks[session_id]:
            # 会话状态更新
            await self.update_session_context(session_id, message)
        
        # LLM请求不需要锁定会话
        async with self.llm_semaphore:
            async for chunk in self.openai_service.stream_chat(message):
                yield chunk
```

**核心优势：**
- 🔄 **真正的异步**：所有I/O操作不阻塞事件循环
- 🚀 **高并发**：可同时处理数百个用户的流式对话
- 💾 **低资源消耗**：相比线程模型节省90%+内存
- 🛡️ **细粒度控制**：每个会话独立锁，不互相影响

**请评估此TODO列表，确认是否符合您的需求，我将根据您的反馈进行调整后开始实施！**