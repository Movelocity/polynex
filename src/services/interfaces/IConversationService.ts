import {
  Conversation,
  ConversationCreateRequest,
  ChatRequest,
  ChatResponse,
  PaginationParams
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
   * 更新对话标题
   * 需要用户权限
   * @param conversationId 对话ID
   * @param title 新标题
   */
  updateConversationTitle(conversationId: string, title: string): Promise<boolean>;

  /**
   * 删除对话
   * 需要用户权限（只能删除自己的对话）
   * @param conversationId 对话ID
   */
  deleteConversation(conversationId: string): Promise<boolean>;
} 