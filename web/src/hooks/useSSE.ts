import { useState, useEffect, useRef, useCallback } from 'react';

export interface SSEConfig {
  url: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  heartbeatTimeout?: number;
}

export interface SSEMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  retryCount: number;
}

export interface SSEHookReturn {
  state: SSEState;
  messages: SSEMessage[];
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  sendMessage?: (data: any) => void;
}

export function useSSE(config: SSEConfig): SSEHookReturn {
  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    retryCount: 0,
  });

  const [messages, setMessages] = useState<SSEMessage[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const { maxRetries = 5, retryDelay = 1000, heartbeatTimeout = 30000 } = config;

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 重置心跳定时器
  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('SSE heartbeat timeout, reconnecting...');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        if (shouldReconnectRef.current) {
          setState(prev => ({ ...prev, error: 'Connection timeout' }));
          connect();
        }
      }
    }, heartbeatTimeout);
  }, [heartbeatTimeout]);

  // 连接SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      return; // 已经连接或正在连接
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // 构建完整URL
      const url = new URL(config.url, window.location.origin);
      
      // 添加认证头（通过URL参数，因为EventSource不支持自定义头）
      if (config.headers?.Authorization) {
        const token = config.headers.Authorization.replace('Bearer ', '');
        url.searchParams.set('token', token);
      }

      console.log('Connecting to SSE:', url.toString());

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      // 连接打开
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          retryCount: 0,
        }));
        resetHeartbeat();
      };

      // 接收消息
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message: SSEMessage = {
            type: event.type || 'message',
            data,
            timestamp: new Date().toISOString(),
          };
          
          console.log('SSE message:', message);
          setMessages(prev => [...prev, message]);
          resetHeartbeat();
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // 处理特定事件类型
      const eventTypes = ['start', 'content', 'done', 'error', 'heartbeat'];
      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: SSEMessage = {
              type: eventType,
              data,
              timestamp: new Date().toISOString(),
            };

            console.log(`SSE ${eventType} event:`, message);
            setMessages(prev => [...prev, message]);

            // 重置心跳（除了错误事件）
            if (eventType !== 'error') {
              resetHeartbeat();
            }

            // 处理完成事件
            if (eventType === 'done') {
              eventSource.close();
              setState(prev => ({
                ...prev,
                isConnected: false,
                isConnecting: false,
              }));
            }
          } catch (error) {
            console.error(`Error parsing SSE ${eventType} event:`, error);
          }
        });
      });

      // 连接错误
      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        
        setState(prev => {
          const newRetryCount = prev.retryCount + 1;
          
          return {
            ...prev,
            isConnected: false,
            isConnecting: false,
            error: `Connection error (attempt ${newRetryCount}/${maxRetries})`,
            retryCount: newRetryCount,
          };
        });

        clearTimers();

        // 自动重连逻辑
        if (shouldReconnectRef.current && state.retryCount < maxRetries) {
          const delay = Math.min(retryDelay * Math.pow(2, state.retryCount), 30000); // 指数退避，最大30秒
          console.log(`Retrying SSE connection in ${delay}ms...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect();
            }
          }, delay);
        } else if (state.retryCount >= maxRetries) {
          setState(prev => ({
            ...prev,
            error: 'Max retry attempts reached',
          }));
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: `Failed to create connection: ${error}`,
      }));
    }
  }, [config, state.retryCount, maxRetries, retryDelay, resetHeartbeat, clearTimers]);

  // 断开连接
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimers();
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      retryCount: 0,
    });
  }, [clearTimers]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearTimers();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [clearTimers]);

  return {
    state,
    messages,
    connect,
    disconnect,
    clearMessages,
  };
}

// 专门用于对话的SSE钩子
export function useConversationSSE(conversationId: string | null, token: string | null) {
  const config: SSEConfig = {
    url: conversationId ? `/api/conversations/${conversationId}/chat` : '',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    maxRetries: 3,
    retryDelay: 2000,
    heartbeatTimeout: 45000,
  };

  const sse = useSSE(config);

  // 发送消息
  const sendMessage = useCallback(async (message: string) => {
    if (!conversationId || !token) {
      throw new Error('Conversation ID and token are required');
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 连接SSE流
      sse.connect();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationId, token, sse]);

  return {
    ...sse,
    sendMessage,
  };
} 