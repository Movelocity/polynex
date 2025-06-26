import { ApiClient, ApiError, apiBaseUrl } from './ApiClient';
import { IConversationService } from '../interfaces/IConversationService';
import {
  Conversation,
  ConversationCreateRequest,
  ChatRequest,
  ChatResponse,
  PaginationParams,
  ConversationMessage,
  SearchRequest,
  SearchResponse
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
   * 流式创建新的对话会话
   * 当请求包含初始消息且启用流式响应时使用
   * 需要用户权限
   * @param request 对话创建请求
   * @returns 返回一个处理流式响应的函数
   */
  async createConversationStream(
    request: ConversationCreateRequest,
    onMessage: (data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const token = this.apiClient.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${apiBaseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...request,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 检查响应是否为SSE流
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        throw new Error('Expected SSE stream response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            onComplete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage(data);
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Failed to create conversation stream:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
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
   * 流式发送聊天消息
   * 需要用户权限
   * @param conversationId 对话ID
   * @param request 聊天请求
   * @param onMessage 接收流式消息的回调函数
   * @param onError 处理错误的回调函数
   * @param onComplete 流式响应完成的回调函数
   */
  async sendMessageStream(
    conversationId: string,
    request: ChatRequest,
    onMessage: (data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const token = this.apiClient.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...request,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            onComplete();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage(data);
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error(`Failed to send message stream to conversation ${conversationId}:`, error);
      onError(error instanceof Error ? error.message : 'Unknown error');
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

  /**
   * 搜索用户的对话
   * 需要用户权限
   * @param request 搜索请求参数
   */
  async searchConversations(request: SearchRequest): Promise<SearchResponse> {
    try {
      const queryParams: Record<string, string> = {
        query: request.query
      };
      
      if (request.limit !== undefined) {
        queryParams.limit = request.limit.toString();
      }
      if (request.offset !== undefined) {
        queryParams.offset = request.offset.toString();
      }

      return await this.apiClient.get<SearchResponse>('/conversations/search/conversations', queryParams);
    } catch (error) {
      console.error('Failed to search conversations:', error);
      throw error;
    }
  }
} 