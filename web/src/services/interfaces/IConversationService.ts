import {
  Conversation,
  ConversationCreateRequest,
  ChatRequest,
  ChatResponse,
  PaginationParams,
  ConversationMessage
} from '@/types';

/**
 * 对话服务接口
 * 定义对话管理的所有服务方法
 */
export interface IConversationService {
  /**
   * 创建新的对话会话
   * 需要用户权限
   * @param request 对话创建请求
   */
  createConversation(request: ConversationCreateRequest): Promise<Conversation>;

  /**
   * 流式创建新的对话会话
   * 当请求包含初始消息且启用流式响应时使用
   * 需要用户权限
   * @param request 对话创建请求
   * @param onMessage 接收流式消息的回调函数
   * @param onError 处理错误的回调函数
   * @param onComplete 流式响应完成的回调函数
   */
  createConversationStream(
    request: ConversationCreateRequest,
    onMessage: (data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void>;

  /**
   * 获取当前用户的对话列表
   * 需要用户权限
   * @param params 分页参数
   */
  getConversations(params?: PaginationParams): Promise<Conversation[]>;

  /**
   * 根据ID获取指定对话的详细信息
   * 需要用户权限（只能获取自己的对话）
   * @param conversationId 对话ID
   */
  getConversation(conversationId: string): Promise<Conversation>;

  /**
   * 发送聊天消息
   * 需要用户权限
   * @param conversationId 对话ID
   * @param request 聊天请求
   */
  sendMessage(conversationId: string, request: ChatRequest): Promise<ChatResponse>;

  /**
   * 流式发送聊天消息
   * 需要用户权限
   * @param conversationId 对话ID
   * @param request 聊天请求
   * @param onMessage 接收流式消息的回调函数
   * @param onError 处理错误的回调函数
   * @param onComplete 流式响应完成的回调函数
   */
  sendMessageStream(
    conversationId: string,
    request: ChatRequest,
    onMessage: (data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void>;

  /**
   * 更新对话标题
   * 需要用户权限
   * @param conversationId 对话ID
   * @param title 新标题
   */
  updateConversationTitle(conversationId: string, title: string): Promise<boolean>;

  /**
   * 更新对话上下文
   * 需要用户权限
   * @param conversationId 对话ID
   * @param messages 新的消息列表
   */
  updateConversationContext(conversationId: string, messages: ConversationMessage[]): Promise<boolean>;

  /**
   * 删除对话
   * 需要用户权限（只能删除自己的对话）
   * @param conversationId 对话ID
   */
  deleteConversation(conversationId: string): Promise<boolean>;
} 