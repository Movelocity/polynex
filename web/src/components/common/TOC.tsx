import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  element?: HTMLElement;
}

interface TOCProps {
  content: string;
}

export function TOC({ content }: TOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  // 从Markdown内容中提取标题，并为重复标题生成唯一ID
  const extractHeadings = useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    const existingIds = new Set<string>();
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      let baseId = text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留中文字符
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, ''); // 去除首尾的短横线

      baseId = baseId || `heading-${items.length}`;

      let id = baseId;
      let counter = 1;
      while (existingIds.has(id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      
      existingIds.add(id);

      items.push({
        id,
        text,
        level,
      });
    }

    return items;
  }, [content]);

  useEffect(() => {
    setTocItems(extractHeadings);
  }, [extractHeadings]);

  // 监听滚动，高亮当前章节
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;

      let currentActiveId = '';
      
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        const offsetTop = rect.top + scrollTop;
        
        // 当标题出现在视口上部1/3时设为活跃
        if (offsetTop <= scrollTop + windowHeight / 3) {
          currentActiveId = heading.id;
        }
      });

      setActiveId(currentActiveId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始调用

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tocItems]);

  // 为DOM中的标题元素添加ID
  useEffect(() => {
    if (tocItems.length === 0) return;

    const timeout = setTimeout(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let itemIndex = 0;

      headings.forEach((heading) => {
        if (itemIndex < tocItems.length) {
          const tocItem = tocItems[itemIndex];
          const headingText = heading.textContent?.trim() || '';
          
          // 简单匹配标题文本
          if (headingText === tocItem.text) {
            heading.id = tocItem.id;
            itemIndex++;
          }
        }
      });
    }, 100); // 延迟确保DOM已渲染

    return () => clearTimeout(timeout);
  }, [tocItems]);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 80; // 80px offset for header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  if (tocItems.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        此文章暂无目录
      </div>
    );
  }

  return (
    <nav className="space-y-1">
      {tocItems.map((item) => {
        const isActive = activeId === item.id;
        const paddingLeft = (item.level - 1) * 12; // 12px per level
        
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`
              w-full text-left text-sm transition-colors duration-200 py-0.5 px-2 rounded-md
              hover:bg-theme-blue/5 hover:text-theme-blue 
              ${isActive 
                ? 'text-theme-blue bg-theme-blue/5 border-l-2 border-theme-blue' 
                : 'text-foreground hover:text-foreground'
              }
            `}
            style={{ paddingLeft: `${Math.max(8, paddingLeft)}px` }}
          >
            <div className="flex items-start">
              {item.level > 1 && (
                <ChevronRight className={`w-3 h-3 mt-0.5 mr-1 flex-shrink-0 ${
                  isActive ? 'text-theme-blue' : 'text-muted-foreground'
                }`} />
              )}
              <span className="line-clamp-2 leading-relaxed">
                {item.text}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
} 