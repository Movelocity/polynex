import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

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
              <h1 id={id} className="text-3xl font-bold text-slate-800 mb-6 mt-8 first:mt-0 border-b border-slate-200 pb-2">
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h2 id={id} className="text-2xl font-bold text-slate-800 mb-4 mt-8 first:mt-0">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h3 id={id} className="text-xl font-bold text-slate-800 mb-3 mt-6">
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h4 id={id} className="text-lg font-bold text-slate-800 mb-3 mt-6">
                {children}
              </h4>
            );
          },
          h5: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h5 id={id} className="text-base font-bold text-slate-800 mb-2 mt-4">
                {children}
              </h5>
            );
          },
          h6: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h6 id={id} className="text-sm font-bold text-slate-800 mb-2 mt-4">
                {children}
              </h6>
            );
          },
          p: ({ children }) => (
            <p className="text-slate-700 mb-4 leading-relaxed">
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-300 pl-4 py-2 my-6 bg-blue-50 italic text-slate-700">
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const inline = !props.className?.includes('language-');
            return inline ? (
              <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm">
                {children}
              </code>
            ) : (
              <code className="block bg-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                {children}
              </code>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-700">
              {children}
            </ol>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content || '文章内容将在这里显示...'}
      </ReactMarkdown>
    </div>
  )
}