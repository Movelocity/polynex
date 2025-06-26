import React, { useState, useEffect } from 'react';
import { AvatarConfig } from '@/types';
import { fileService } from '@/services';

interface AgentAvatarProps {
  avatar?: AvatarConfig;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'circle' | 'square';
}

const variantClasses = {
  default: 'rounded-full',
  circle: 'rounded-full',
  square: 'rounded-lg'
};

// Agent头像组件
export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  avatar, 
  name, 
  size = 'md',
  variant = 'default'
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = {
    sm: 'w-8 h-8 min-w-8 min-h-8 text-sm',
    md: 'w-10 h-10 min-w-10 min-h-10 text-base', 
    lg: 'w-12 h-12 min-w-12 min-h-12 text-lg',
    xl: 'w-16 h-16 min-w-16 min-h-16 text-xl'
  };

  const defaultBgColor = 'bg-blue-500';
  const bgColor = avatar?.bg_color || defaultBgColor;

  const displayLink = avatar?.variant === 'link' ? fileService.resolveFileUrl(avatar.link) : '';

  // 当头像链接变化时重置错误状态
  useEffect(() => {
    setImageError(false);
  }, [avatar?.link]);

  if (avatar?.variant === 'link' && avatar.link && !imageError) {
    return (
      <div className={`${sizeClasses[size]} ${variantClasses[variant]} overflow-hidden flex items-center justify-center`}>
        <img 
          src={displayLink} 
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.warn('Agent头像图片加载失败:', avatar.link);
            setImageError(true);
          }}
          onLoad={() => {
            console.log('Agent头像图片加载成功:', avatar.link);
          }}
        />
      </div>
    );
  }

  if (avatar?.variant === 'emoji' && avatar.emoji) {
    return (
      <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center`}>
        <span className="text-white">{avatar.emoji}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};