/** 基础后端api路径 */
export const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:8765/api' : '/api';

/**
 * API客户端基类
 * 处理HTTP请求、错误处理、认证等通用功能
 */
export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private onUnauthorized?: () => void;

  constructor() {
    this.baseURL = apiBaseUrl;
    console.log("baseURL:",this.baseURL);
    this.loadToken();
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * 设置未授权回调函数
   */
  setUnauthorizedCallback(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  /**
   * 从localStorage加载认证token
   */
  private loadToken(): void {
    try {
      this.token = localStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  /**
   * 设置认证token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * 获取当前token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * 处理API响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // 处理401未授权错误
      if (response.status === 401) {
        // 清除本地token
        this.setToken(null);
        // 触发未授权回调
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
        throw new ApiError(401, '登录已过期，请重新登录');
      }

      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiError(response.status, errorData.message || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return {} as T;
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseURL}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error');
    }
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error');
    }
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error');
    }
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error');
    }
  }
}

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 全局API客户端实例
 */
export const apiClient = new ApiClient(); 