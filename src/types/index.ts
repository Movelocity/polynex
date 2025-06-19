// 用户数据类型
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  registerTime: string;
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

// 认证状态类型
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
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
