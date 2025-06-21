import { User } from '@/types';

/**
 * 用户服务接口
 * 定义用户相关的所有服务方法
 */
export interface IUserService {
  /**
   * 获取所有用户
   */
  getUsers(): Promise<User[]>;

  /**
   * 保存用户列表（批量操作）
   */
  saveUsers(users: User[]): Promise<void>;

  /**
   * 添加新用户
   */
  addUser(user: User): Promise<void>;

  /**
   * 更新用户信息
   */
  updateUser(userId: string, updates: Partial<User>): Promise<boolean>;

  /**
   * 获取当前登录用户
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * 设置当前登录用户
   */
  setCurrentUser(user: User | null): Promise<void>;

  /**
   * 根据邮箱查找用户
   */
  findUserByEmail(email: string): Promise<User | undefined>;

  /**
   * 根据用户名查找用户
   */
  findUserByUsername(username: string): Promise<User | undefined>;

  /**
   * 用户登录
   */
  login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }>;

  /**
   * 用户登出
   */
  logout(): Promise<void>;

  /**
   * 用户注册
   */
  register(userData: Omit<User, 'id' | 'registerTime'>): Promise<{ success: boolean; user?: User; error?: string }>;
} 