// 完整用户数据类型（包含密码，仅用于API传输）
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  role: 'admin' | 'user';
  registerTime: string;
}

// 客户端用户数据类型（不包含密码，用于localStorage存储）
export interface ClientUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  registerTime: string;
}

// 登录请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求类型
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  invite_code?: string;
}

// 认证响应类型
export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: ClientUser;
}

// 博客数据类型
export interface Blog {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createTime: string;
  updateTime: string;
  status: 'published' | 'draft';
  views: number;
}

// 分类数据类型
export interface Category {
  id: string;
  name: string;
  description: string;
  count: number;
}

// 认证状态类型（使用ClientUser）
export interface AuthState {
  isAuthenticated: boolean;
  user: ClientUser | null;
}

// 搜索结果类型
export interface SearchResult {
  blogs: Blog[];
  total: number;
  query: string;
}

// 分页数据类型
export interface PaginationData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 注册配置类型
export interface RegistrationConfig {
  allow_registration: boolean;
  require_invite_code: boolean;
}

// 邀请码配置类型
export interface InviteCodeConfig {
  require_invite_code: boolean;
  invite_code?: string;
}

// 邀请码更新类型
export interface InviteCodeUpdate {
  require_invite_code: boolean;
  invite_code?: string;
}
