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

// ===== AI供应商相关类型 =====

// AI供应商技术类型枚举
export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  OLLAMA = 'ollama',
  CUSTOM = 'custom'
}

// 代理配置
export interface ProxyConfig {
  url?: string;  // 代理URL，包含协议+IP/域名+端口，如: http://127.0.0.1:7890
  username?: string;
  password?: string;
}

// AI供应商配置响应类型
export interface AIProviderConfig {
  id: string;
  name: string;
  provider_type: AIProviderType;
  base_url: string;
  proxy?: ProxyConfig;
  models: string[];
  rpm?: number;
  extra_config: Record<string, any>;
  description?: string;
  creator_id: string;
  access_level: number;
  create_time: string;
  update_time: string;
}

// AI供应商配置创建类型
export interface AIProviderConfigCreate {
  name: string;
  provider_type: AIProviderType;
  base_url: string;
  api_key: string;
  proxy?: ProxyConfig;
  models?: string[];
  rpm?: number;
  extra_config?: Record<string, any>;
  description?: string;
  access_level?: number;
}

// AI供应商配置更新类型
export interface AIProviderConfigUpdate {
  name?: string;
  provider_type?: AIProviderType;
  base_url?: string;
  api_key?: string;
  proxy?: ProxyConfig;
  models?: string[];
  rpm?: number;
  extra_config?: Record<string, any>;
  description?: string;
  access_level?: number;
}

// 供应商测试请求类型
export interface TestProviderRequest {
  model?: string;
  message?: string;
}

// 供应商测试响应类型
export interface TestProviderResponse {
  success: boolean;
  message: string;
  response?: any;
}

// ===== 对话相关类型 =====

// 对话状态枚举
export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// 对话消息
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  reasoning_content?: string;
  timestamp?: string;
}

// 对话信息
export interface Conversation {
  id: string;
  session_id: string;
  user_id: string;
  agent_id?: string;
  title: string;
  messages?: ConversationMessage[];  // for /api/conversations/[id]
  message_count?: number;  // for /api/conversations
  status: ConversationStatus;
  create_time: string;
  update_time: string;
}

// 聊天请求
export interface ChatRequest {
  conversationId?: string;
  agentId: string;
  message: string;
  stream?: boolean;
}

// 聊天响应
export interface ChatResponse {
  response: string;
  conversation_id: string;
  message_id?: string;
}

// ===== 搜索相关类型 =====

// 搜索请求参数
export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

// 对话搜索结果
export interface ConversationSearchResult {
  id: string;
  session_id: string;
  title: string;
  match_count: number;
  context: string;
  create_time: string;
  update_time: string;
}

// 搜索响应
export interface SearchResponse {
  results: ConversationSearchResult[];
  total_count: number;
  query: string;
}

// ===== API响应通用类型 =====

// 通用API响应
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// 分页查询参数
export interface PaginationParams {
  limit?: number;
  offset?: number;
}
