import { User, ClientUser, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

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
   * 获取当前登录用户（从localStorage）
   */
  getCurrentUser(): ClientUser | null;

  /**
   * 设置当前登录用户（到localStorage）
   */
  setCurrentUser(user: ClientUser | null): void;

  /**
   * 根据邮箱查找用户
   */
  findUserByEmail(email: string): Promise<User | undefined>;

  /**
   * 根据用户名查找用户
   */
  findUserByUsername(username: string): Promise<User | undefined>;

  /**
   * 用户登录（返回token和用户信息）
   */
  login(email: string, password: string): Promise<AuthResponse>;

  /**
   * 用户登录（使用请求对象）
   */
  loginWithRequest(request: LoginRequest): Promise<AuthResponse>;

  /**
   * 用户登出
   */
  logout(): Promise<void>;

  /**
   * 用户注册（返回token和用户信息）
   */
  register(username: string, email: string, password: string): Promise<AuthResponse>;

  /**
   * 用户注册（使用请求对象）
   */
  registerWithRequest(request: RegisterRequest): Promise<AuthResponse>;

  /**
   * 验证token有效性
   */
  validateToken(): Promise<{ valid: boolean; user?: ClientUser }>;

  /**
   * 更新密码
   */
  updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }>;
} 