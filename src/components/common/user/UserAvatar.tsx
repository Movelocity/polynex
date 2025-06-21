import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/x-ui/avatar';
import { fileService } from '@/services';
import { User, ClientUser } from '@/types';
import { cn } from '@/lib/utils';

/**
 * 头像尺寸枚举
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',      // 24px - 用于卡片列表
  sm: 'h-8 w-8',      // 32px - 用于导航栏
  md: 'h-10 w-10',    // 40px - 默认尺寸
  lg: 'h-12 w-12',    // 48px - 用于详情页
  xl: 'h-16 w-16',    // 64px - 用于个人资料页
};

/**
 * fallback文字尺寸映射
 */
const fallbackTextSizes: Record<AvatarSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm', 
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * UserAvatar组件属性
 */
export interface UserAvatarProps {
  /** 用户对象（包含avatar和username） */
  user?: User | ClientUser | { avatar?: string; username: string };
  /** 直接传入头像URL（优先级高于user.avatar） */
  avatar?: string;
  /** 用户名（用于生成fallback，如果user存在则从user.username获取） */
  username?: string;
  /** 头像尺寸 */
  size?: AvatarSize;
  /** 自定义样式类名 */
  className?: string;
  /** 是否可点击（添加鼠标悬停效果） */
  clickable?: boolean;
  /** 点击事件处理器 */
  onClick?: () => void;
}

/**
 * 解析头像URL
 * @param avatar 原始头像URL或路径
 * @returns 解析后的完整URL，如果无效则返回null
 */
const resolveAvatarUrl = (avatar?: string): string | null => {
  if (!avatar || avatar.trim() === '') {
    return null;
  }
  try {
    // 使用fileService解析相对路径。如果是完整的HTTP/HTTPS URL，会直接返回
    return fileService.resolveFileUrl(avatar);
  } catch (error) {
    console.warn('Failed to resolve avatar URL:', avatar, error);
    return null;
  }
};

/**
 * 生成用户名首字符
 * @param username 用户名
 * @returns 首字符（大写）
 */
const generateFallbackText = (username?: string): string => {
  if (!username || username.trim() === '') {
    return '?';
  }
  
  // 取第一个字符并转为大写
  return username.charAt(0).toUpperCase();
};

/**
 * UserAvatar - 通用头像组件
 * 
 * 功能特性：
 * - 支持多种尺寸（xs, sm, md, lg, xl）
 * - 自动识别绝对路径、相对路径和空值
 * - 智能fallback显示用户名首字符
 * - 支持点击交互
 * - 错误处理和加载失败回退
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  avatar,
  username,
  size = 'md',
  className,
  clickable = false,
  onClick,
}) => {
  // 确定最终使用的头像URL和用户名
  const finalAvatar = avatar || user?.avatar;
  const finalUsername = username || user?.username || '';
  
  // 解析头像URL
  const resolvedAvatarUrl = resolveAvatarUrl(finalAvatar);
  
  // 生成fallback文字
  const fallbackText = generateFallbackText(finalUsername);
  
  // 组合样式类名
  const avatarClassName = cn(
    sizeStyles[size],
    clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
    className
  );

  return (
    <Avatar 
      className={avatarClassName}
      onClick={onClick}
    >
      {resolvedAvatarUrl && (
        <AvatarImage
          src={resolvedAvatarUrl}
          alt={finalUsername || '用户头像'}
          onError={(e) => {
            // 头像加载失败时隐藏图片，显示fallback
            console.warn('Avatar image failed to load:', resolvedAvatarUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <AvatarFallback 
        className={cn(
          'bg-gradient-to-br from-blue-600 to-purple-600 text-white font-medium',
          fallbackTextSizes[size]
        )}
      >
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar; 