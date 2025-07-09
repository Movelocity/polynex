import React, { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // KaTeX CSS
import { cn } from '@/lib/utils';

// 创建Context来跟踪是否在代码块内部
const CodeBlockContext = createContext(false);

// 全局样式，确保内容不会溢出
const globalMarkdownStyles = `
.markdown-preview-container * {
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
}

.markdown-preview-container pre {
  max-width: calc(100% - 16px);
  overflow-x: auto;
}

.markdown-preview-container code {
  white-space: pre-wrap;
  word-break: break-all;
}

.markdown-preview-container table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.markdown-preview-container img {
  max-width: 100%;
  height: auto;
}

.markdown-preview-container a {
  word-break: break-all;
}

.markdown-preview-container ul,
.markdown-preview-container ol {
  list-style-position: outside;
  padding-left: 1.5rem;
}

.markdown-preview-container ul {
  list-style-type: disc;
}

.markdown-preview-container ol {
  list-style-type: decimal;
}

.markdown-preview-container li {
  display: list-item;
}
`;

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

// 预处理数学公式，支持更多LaTeX语法
const preprocessMathContent = (content: string): string => {
  if (!content) return content;
  
  // 将 \( ... \) 转换为 $ ... $
  let processed = content.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
  
  // 将 \[ ... \] 转换为 $$ ... $$
  processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$1$$');
  
  return processed;
};

export function MarkdownPreview({ content, className }: { content: string, className?: string }) {
  // 预处理内容以支持更多数学语法
  const processedContent = preprocessMathContent(content || '');
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalMarkdownStyles }} />
      <div 
        className={cn("prose prose-slate max-w-none w-full overflow-hidden break-words markdown-preview-container text-foreground", className)}
        style={{ 
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm, 
            remarkMath,
            remarkBreaks
          ]}
          rehypePlugins={[
            rehypeKatex, 
            [rehypeHighlight, {
              strict: false, // 禁用严格模式
              throwOnError: false, // 禁用抛出错误
              detect: false,  // 禁用自动检测语言
              ignoreMissing: true // 忽略未找到的语法
            }]
          ]}
          components={{
            h1: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h1 id={id} className="text-3xl font-bold mb-6 mt-8 first:mt-0 border-b border-border pb-2 break-words overflow-hidden">
                  {children}
                </h1>
              );
            },
            h2: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h2 id={id} className="text-2xl font-bold mb-4 mt-8 first:mt-0 break-words overflow-hidden">
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h3 id={id} className="text-xl font-bold mb-3 mt-6 break-words overflow-hidden">
                  {children}
                </h3>
              );
            },
            h4: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h4 id={id} className="text-lg font-bold mb-3 mt-6 break-words overflow-hidden">
                  {children}
                </h4>
              );
            },
            h5: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h5 id={id} className="text-base font-bold mb-2 mt-4 break-words overflow-hidden">
                  {children}
                </h5>
              );
            },
            h6: ({ children }) => {
              const text = extractText(children);
              const id = generateId(text);
              return (
                <h6 id={id} className="text-sm font-bold mb-2 mt-4 break-words overflow-hidden">
                  {children}
                </h6>
              );
            },
            p: ({ children, ...props }) => (
              <p className="leading-relaxed break-words overflow-hidden w-full" {...props}>
                {children}
              </p>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary pl-4 py-2 my-6 bg-muted/50 italic text-muted-foreground break-words overflow-hidden">
                {children}
              </blockquote>
            ),
            // 处理代码块的容器 pre 标签
            pre: ({ children, ...props }) => {
              return (
                <CodeBlockContext.Provider value={true}>
                  <pre 
                    className="bg-muted border border-border rounded-lg overflow-x-auto my-4 shadow-sm" 
                    style={{ maxWidth: 'var(--markdown-pre-width)', width: 'var(--markdown-pre-width)' }}
                  >
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
                  <code className="bg-gray-200 dark:bg-gray-700 font-semibold px-1 rounded font-mono break-all">
                    {children}
                  </code>
                );
              }
              
              // 代码块样式 - 使用主题色
              return (
                <code 
                  className={`block p-4 text-sm font-consolas leading-relaxed overflow-x-auto break-words ${className || ''}`}
                  style={{ maxWidth: '100%' }}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            ul: ({ children }) => (
              <ul className="mb-4 break-words overflow-hidden">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 break-words overflow-hidden">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="mb-2 leading-relaxed">
                {children}
              </li>
            ),
            // 处理表格
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 max-w-full" style={{ maxWidth: 'var(--markdown-max-width)' }}>
                <table className="border-collapse border border-border w-full" style={{ maxWidth: '100%' }}>
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
              <th className="border border-border px-4 py-2 text-left font-semibold">
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
                className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/50 transition-colors break-all"
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
              <em className="italic">
                {children}
              </em>
            ),
            // 处理加粗文本
            strong: ({ children }) => (
              <strong className="font-bold">
                {children}
              </strong>
            ),
            // 处理水平线
            hr: () => (
              <hr className="my-4 border-0 h-px bg-gray-200 dark:bg-gray-400 via-border" />
            ),
            img: ({ src, alt }) => (
              <img 
                src={src} 
                alt={alt || ''} 
                className="max-w-full w-auto h-auto my-4 rounded-md object-contain"
                style={{ maxWidth: 'var(--markdown-max-width)' }}
              />
            ),
          }}
        >
          {processedContent || '...'}
        </ReactMarkdown>
      </div>
    </>
  )
}