import { ApiClient, ApiError, defaultBaseURL } from './ApiClient';

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
 * 文件列表响应接口
 */
export interface FileListResponse {
  files: FileInfo[];
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

      // 使用fetch直接发送，因为ApiClient可能不支持FormData
      const baseURL = (this.apiClient as any).baseURL || defaultBaseURL;
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseURL}/users/avatar/upload`, {
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
   * 上传文件
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);

      // 使用fetch直接发送，因为ApiClient可能不支持FormData
      const baseURL = (this.apiClient as any).baseURL || defaultBaseURL;
      const token = this.apiClient.getToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseURL}/resources/upload`, {
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
    const baseURL = (this.apiClient as any).baseURL || defaultBaseURL;
    return `${baseURL}/resources/${uniqueId}.${extension}`;
  }

  /**
   * 转换相对URL为完整URL（如果需要）
   */
  resolveFileUrl(url: string): string {
    if (url.startsWith('http')) {
      return url; // 已经是完整URL
    }
    const baseURL = (this.apiClient as any).baseURL || defaultBaseURL;
    if (url.startsWith('/api/')) {
      return `${baseURL.replace('/api', '')}${url}`;
    }
    return `${baseURL}${url}`;
  }

  /**
   * 获取用户文件列表
   */
  async getUserFiles(): Promise<FileInfo[]> {
    try {
      const response = await this.apiClient.get<FileListResponse>('/resources/list');
      return response.files;
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