import { ApiClient, ApiError } from './ApiClient';
import { IConversationService } from '../interfaces/IConversationService';
import {
  Conversation,
  ConversationCreateRequest,
  ChatRequest,
  ChatResponse,
  PaginationParams,
  ConversationMessage
} from '@/types';

/**
 * 对话API服务实现
 * 实现IConversationService接口，提供对话管理功能
 */
export class ConversationApiService implements IConversationService {
  constructor(private apiClient: ApiClient) {}

  /**
   * 创建新的对话会话
   * 需要用户权限
   * @param request 对话创建请求
   */
  async createConversation(request: ConversationCreateRequest): Promise<Conversation> {
    try {
      return await this.apiClient.post<Conversation>('/conversations', request);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户的对话列表
   * 需要用户权限
   * @param params 分页参数
   */
  async getConversations(params?: PaginationParams): Promise<Conversation[]> {
    try {
      const queryParams: Record<string, string> = {};
      
      if (params?.limit !== undefined) {
        queryParams.limit = params.limit.toString();
      }
      if (params?.offset !== undefined) {
        queryParams.offset = params.offset.toString();
      }

      return await this.apiClient.get<Conversation[]>('/conversations', queryParams);
    } catch (error) {
      console.error('Failed to get conversations:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取指定对话的详细信息
   * 需要用户权限（只能获取自己的对话）
   * @param conversationId 对话ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      return await this.apiClient.get<Conversation>(`/conversations/${conversationId}`);
    } catch (error) {
      console.error(`Failed to get conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * 发送聊天消息
   * 需要用户权限
   * @param conversationId 对话ID
   * @param request 聊天请求
   */
  async sendMessage(conversationId: string, request: ChatRequest): Promise<ChatResponse> {
    try {
      return await this.apiClient.post<ChatResponse>(`/conversations/${conversationId}/chat`, request);
    } catch (error) {
      console.error(`Failed to send message to conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * 更新对话标题
   * 需要用户权限
   * @param conversationId 对话ID
   * @param title 新标题
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      await this.apiClient.put(`/conversations/${conversationId}/title`, { title });
      return true;
    } catch (error) {
      console.error(`Failed to update conversation ${conversationId} title:`, error);
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 更新对话上下文
   * 需要用户权限
   * @param conversationId 对话ID
   * @param messages 新的消息列表
   */
  async updateConversationContext(conversationId: string, messages: ConversationMessage[]): Promise<boolean> {
    try {
      await this.apiClient.put(`/conversations/${conversationId}/context`, { messages });
      return true;
    } catch (error) {
      console.error(`Failed to update conversation ${conversationId} context:`, error);
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 删除对话
   * 需要用户权限（只能删除自己的对话）
   * @param conversationId 对话ID
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/conversations/${conversationId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }
} 