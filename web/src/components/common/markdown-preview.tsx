import React, { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// 创建Context来跟踪是否在代码块内部
const CodeBlockContext = createContext(false);

// 将标题文本转换为ID
const generateId = (text: string): string => {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留中文字符
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, ''); // 去除首尾的短横线
};

// 从children中提取纯文本
const extractText = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as any).props.children);
  }
  return '';
};

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          h1: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h1 id={id} className="text-3xl font-bold text-foreground mb-6 mt-8 first:mt-0 border-b border-border pb-2">
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h2 id={id} className="text-2xl font-bold text-foreground mb-4 mt-8 first:mt-0">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h3 id={id} className="text-xl font-bold text-foreground mb-3 mt-6">
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h4 id={id} className="text-lg font-bold text-foreground mb-3 mt-6">
                {children}
              </h4>
            );
          },
          h5: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h5 id={id} className="text-base font-bold text-foreground mb-2 mt-4">
                {children}
              </h5>
            );
          },
          h6: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h6 id={id} className="text-sm font-bold text-foreground mb-2 mt-4">
                {children}
              </h6>
            );
          },
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed">
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-6 bg-muted/50 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // 处理代码块的容器 pre 标签
          pre: ({ children, ...props }) => {
            return (
              <CodeBlockContext.Provider value={true}>
                <pre className="bg-muted border border-border rounded-lg overflow-x-auto my-4 shadow-sm">
                  {children}
                </pre>
              </CodeBlockContext.Provider>
            );
          },
          // 处理代码元素
          code: ({ children, className, node, ...props }) => {
            const isInCodeBlock = useContext(CodeBlockContext);
            
            if (!isInCodeBlock) {
              // 内联代码样式 - 使用主题色
              return (
                <code className="bg-gray-300/40 dark:bg-gray-400/40 text-foreground p-0.5 rounded font-mono">
                  {children}
                </code>
              );
            }
            
            // 代码块样式 - 使用主题色
            return (
              <code 
                className={`block p-4 text-sm font-consolas leading-relaxed text-foreground ${className || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">
              {children}
            </li>
          ),
          // 处理表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/50">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2 text-muted-foreground">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // 处理删除线
          del: ({ children }) => (
            <del className="text-muted-foreground/60 line-through">
              {children}
            </del>
          ),
          // 处理强调文本
          em: ({ children }) => (
            <em className="italic text-foreground">
              {children}
            </em>
          ),
          // 处理加粗文本
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),
        }}
      >
        {content || '文章内容将在这里显示...'}
      </ReactMarkdown>
    </div>
  )
}