import { ApiClient, ApiError, apiBaseUrl } from './ApiClient';
import { IConversationService } from '../interfaces/IConversationService';
import {
  Conversation,
  ChatRequest,
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
   * 流式发送聊天消息
   * 需要用户权限
   * @param conversationId 对话ID
   * @param request 聊天请求
   * @param onMessage 接收流式消息的回调函数
   * @param onError 处理错误的回调函数
   * @param onComplete 流式响应完成的回调函数
   */
  async chat(
    request: ChatRequest,
    onMessage: (data: any) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const token = this.apiClient.getToken();
      if (!token) {
        throw new Error('需要登录才能使用');
      }

      const response = await fetch(`${apiBaseUrl}/conversations/chat`, {
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
        throw new Error('无法读取响应体');
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
                console.warn('无法解析SSE数据:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error(`会话 ${request.conversationId} 流式发送消息失败:`, error);
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
  
  /**
   * 检查会话是否存在后台任务
   * 需要用户权限
   * @param sessionId 会话ID
   */
  async isActiveSession(sessionId: string): Promise<boolean> {
    try {
      const result = await this.apiClient.get<{is_active: boolean}>(`/conversations/is_active_session`, { session_id: sessionId });
      return result.is_active;
    } catch (error) {
      console.error(`Failed to check session activity for ${sessionId}:`, error);
      return false; // 出错时默认返回非活跃状态
    }
  }
  
  /**
   * 中止流式任务
   * 客户端可以调用此接口来立即停止AI生成，取消API请求
   * 需要用户权限
   * @param sessionId 会话ID
   */
  async abortStream(sessionId: string): Promise<boolean> {
    try {
      const result = await this.apiClient.post<{message: string}>('/conversations/abort', { session_id: sessionId });
      return result.message.includes('aborted successfully');
    } catch (error) {
      console.error(`Failed to abort stream for session ${sessionId}:`, error);
      return false;
    }
  }
} 