import { ApiClient, ApiError, apiBaseUrl } from './ApiClient';

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  unique_id: string;
  original_name?: string;
  extension: string;
  size: number;
  upload_time: string;
  uploader_id?: string;
  url: string;
  thumbnail?: string; // 缩略图URL（如果是图片且缩略图存在）
}

/**
 * 文件上传响应接口
 */
export interface UploadResponse {
  message: string;
  file: FileInfo;
}

/**
 * 头像上传响应接口
 */
export interface AvatarUploadResponse {
  message: string;
  avatar_url: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'user';
    registerTime: string;
  };
}

/**
 * 文件列表响应接口（支持分页）
 */
export interface FileListResponse {
  files: FileInfo[];
  pagination: PaginationInfo;
}

/**
 * 基于HTTP API的文件服务实现
 */
export class FileApiService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);

      // 使用fetch直接发送，因为ApiClient暂时不支持FormData
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/users/avatar/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Avatar upload failed' }));
        throw new ApiError(response.status, errorData.detail || 'Avatar upload failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error during avatar upload');
    }
  }

  /**
   * 上传Agent头像
   */
  async uploadAgentAvatar(file: File | Blob): Promise<{ success: boolean; message: string; avatarUrl: string }> {
    try {
      // 创建FormData对象
      const formData = new FormData();
      // FormData可以接受Blob或File
      formData.append('file', file, 'agent-avatar.jpg');

      // 使用fetch直接发送，因为ApiClient暂时不支持FormData;
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/resources/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Agent avatar upload failed' }));
        throw new ApiError(response.status, errorData.message || 'Agent avatar upload failed');
      }

      const result = await response.json();
      console.log('服务器返回的文件信息:', result);

      // 服务器返回的是FileInfo对象，格式为: { uniqueId, originalName, extension, size, uploadTime, uploaderId }
      // 需要根据uniqueId和extension构造完整的文件URL
      const avatarUrl = `/api/resources/${result.uniqueId}${result.extension}`;

      return {
        success: true,
        message: 'Agent头像上传成功',
        avatarUrl: avatarUrl
      };
    } catch (error) {
      let message = 'Agent头像上传失败';
      if (error instanceof ApiError) {
        message = error.message;
      }
      console.error('Agent头像上传失败:', error);
      return {
        success: false,
        message,
        avatarUrl: ''
      };
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);

      // 使用fetch直接发送，因为ApiClient暂时不支持FormData
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/resources/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new ApiError(response.status, errorData.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error during file upload');
    }
  }

  /**
   * 获取文件URL（用于显示）
   */
  getFileUrl(uniqueId: string, extension: string): string {
    return `${apiBaseUrl}/resources/${uniqueId}.${extension}`;
  }

  /**
   * 获取缩略图URL
   */
  getThumbnailUrl(uniqueId: string): string {
    return `${apiBaseUrl}/resources/thumbnail/${uniqueId}.jpg`;
  }

  /**
   * 转换相对URL为完整URL（如果需要）
   */
  resolveFileUrl(url: string): string {
    // 处理空字符串或无效URL
    if (!url || typeof url !== 'string') {
      console.warn('resolveFileUrl: 接收到无效的URL:', url);
      return '';
    }

    // 如果已经是完整URL，直接返回
    if (url.startsWith('http')) {
      return url;
    }

    
    // 处理相对于API的路径 /api/resources/xxx
    if (url.startsWith('/api/')) {
      // 移除baseURL中的 /api 部分，然后拼接完整URL
      const serverBase = apiBaseUrl.replace('/api', '');
      return `${serverBase}${url}`;
    }
    
    // 处理其他相对路径
    if (url.startsWith('/')) {
      return `${apiBaseUrl.replace('/api', '')}${url}`;
    }
    
    // 处理没有前缀的路径
    return `${apiBaseUrl}/${url}`;
  }

  /**
   * 获取用户文件列表（支持分页）
   */
  async getUserFiles(page: number = 1, pageSize: number = 10): Promise<FileListResponse> {
    try {
      // 验证参数，确保是有效数字
      const validPage = Math.max(1, Math.floor(Number(page)) || 1);
      const validPageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize)) || 10));
      
      // 调试日志
      if (typeof page !== 'number' || typeof pageSize !== 'number') {
        console.warn('FileApiService.getUserFiles: 接收到非数字参数', { page, pageSize, validPage, validPageSize });
      }
      
      const response = await this.apiClient.get<FileListResponse>(`/resources/list?page=${validPage}&page_size=${validPageSize}`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to get file list');
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(uniqueId: string, extension: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/resources/${uniqueId}.${extension}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 检查文件类型是否支持
   */
  isSupportedFileType(file: File): boolean {
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', // 图片
      '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'    // 文档
    ];
    
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * 检查文件大小是否符合要求
   */
  isValidFileSize(file: File, maxSizeMB: number = 50): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * 检查是否为图片文件
   */
  isImageFile(fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExts.includes(extension);
  }

  /**
   * 获取文件类型信息
   */
  getFileTypeInfo(fileName: string): { isImage: boolean; isDocument: boolean; icon: string } {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const documentExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
    
    if (imageExts.includes(extension)) {
      return { isImage: true, isDocument: false, icon: '🖼️' };
    }
    
    if (documentExts.includes(extension)) {
      return { isImage: false, isDocument: true, icon: '📄' };
    }
    
    return { isImage: false, isDocument: false, icon: '📁' };
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 