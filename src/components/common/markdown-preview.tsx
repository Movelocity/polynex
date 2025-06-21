import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-slate-800 mb-6 mt-8 first:mt-0 border-b border-slate-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold text-slate-800 mb-3 mt-6">
              {children}
            </h3>
          ),
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