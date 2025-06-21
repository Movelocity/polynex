import { User } from '@/types';
import { IUserService } from '../interfaces/IUserService';
import { UserStorage, generateId } from '@/utils/storage';

/**
 * 基于localStorage的用户服务实现
 * 包装现有的UserStorage类，提供异步接口
 */
export class UserStorageService implements IUserService {
  async getUsers(): Promise<User[]> {
    return UserStorage.getUsers();
  }

  async saveUsers(users: User[]): Promise<void> {
    UserStorage.saveUsers(users);
  }

  async addUser(user: User): Promise<void> {
    UserStorage.addUser(user);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    return UserStorage.updateUser(userId, updates);
  }

  async getCurrentUser(): Promise<User | null> {
    return UserStorage.getCurrentUser();
  }

  async setCurrentUser(user: User | null): Promise<void> {
    UserStorage.setCurrentUser(user);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return UserStorage.findUserByEmail(email);
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    return UserStorage.findUserByUsername(username);
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const user = UserStorage.findUserByEmail(email);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }
      
      if (user.password !== password) {
        return { success: false, error: '密码错误' };
      }

      UserStorage.setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: '登录失败' };
    }
  }

  async logout(): Promise<void> {
    UserStorage.setCurrentUser(null);
  }

  async register(userData: Omit<User, 'id' | 'registerTime'>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 检查邮箱是否已存在
      const existingUser = UserStorage.findUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: '邮箱已被注册' };
      }

      // 检查用户名是否已存在
      const existingUsername = UserStorage.findUserByUsername(userData.username);
      if (existingUsername) {
        return { success: false, error: '用户名已被使用' };
      }

      // 创建新用户
      const newUser: User = {
        ...userData,
        id: generateId(),
        registerTime: new Date().toISOString(),
      };

      UserStorage.addUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: '注册失败' };
    }
  }
} 