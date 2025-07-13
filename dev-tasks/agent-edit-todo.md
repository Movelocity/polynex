# Agent Editor 功能更新

## 更新内容

1. 修改了 `AgentInfoEditor` 组件，增加了创建模式
   - 添加了 `isCreateMode` 属性，用于区分创建和编辑模式
   - 添加了 `triggerButton` 属性，允许自定义触发按钮
   - 改进了表单验证和错误处理

2. 创建了新的 `CreateAgentDialog` 组件
   - 可以在任意页面使用的Agent创建对话框
   - 使用默认的AI供应商和模型配置
   - 支持自定义创建成功后的回调函数

3. 修改了 `AgentEditor` 组件
   - 移除了创建模式，只保留编辑功能
   - 添加了加载状态显示

4. 更新了路由配置
   - 移除了 `/chat/agent/create` 路由，因为现在可以在任意页面创建Agent

5. 集成到其他组件
   - 更新了 `AgentManagement` 页面，使用新的 `CreateAgentDialog` 组件
   - 在 `ChatHistoryPanel` 中添加了创建Agent的按钮
   - 创建了 `components/chat/index.ts` 导出文件，方便其他组件引用

## 使用方法

```tsx
// 基本用法
<CreateAgentDialog 
  trigger={<Button>创建Agent</Button>}
  onAgentCreated={(agentId) => {
    // 处理创建成功后的逻辑
    console.log(`Agent ${agentId} 创建成功`);
  }}
/>
```

## 注意事项

- 创建Agent时会使用系统中可用的第一个AI供应商和模型
- 创建成功后，可以通过编辑页面进一步配置Agent的详细设置