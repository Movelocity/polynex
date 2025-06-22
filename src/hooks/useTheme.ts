import { useState, useEffect } from 'react';

/**
 * 主题切换Hook
 * 管理深浅色主题状态，支持localStorage持久化和系统偏好
 */
export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取主题设置
    const saved = localStorage.getItem('theme');
    const isDarkMode = saved === 'dark' || 
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  /**
   * 设置主题
   * @param theme - 'light' | 'dark'
   */
  const setTheme = (theme: 'light' | 'dark') => {
    const isDarkMode = theme === 'dark';
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', theme);
  };

  return { 
    isDark, 
    toggleTheme, 
    setTheme,
    theme: isDark ? 'dark' : 'light'
  };
}; 