import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  children: string
  className?: string
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 text-center text-3xl font-black tracking-tight text-[#f8f8f8]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-9 border-b border-[#32363f] pb-2 text-xl font-bold text-[#f8f8f8] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-bold text-[#f8f8f8]">{children}</h3>,
  p: ({ children }) => <p className="my-4 text-sm leading-7 text-[#c5c9ce]">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[#f8f8f8]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#d8dce0]">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-[#c5c9ce]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-[#c5c9ce]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-sm leading-6 marker:text-[#A2ECFB]">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-2 border-[#A2ECFB] bg-[#1b1b1f] px-5 py-1 text-[#a0a4a8]">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      title={typeof children === 'string' ? children : 'Abrir link externo'}
      onClick={(event) => {
        if (!href?.startsWith('https://')) return
        event.preventDefault()
        void window.api.openExternal(href)
      }}
      className="font-semibold text-[#A2ECFB] underline decoration-[#A2ECFB]/40 underline-offset-4 transition-colors hover:text-white"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-8 border-[#32363f]" />,
  code: ({ children }) => (
    <code className="rounded-sm bg-[#161618] px-1.5 py-0.5 font-mono text-xs text-[#A2ECFB]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto border border-[#32363f] bg-[#121214] p-4 font-mono text-xs leading-6 text-[#d8dce0]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[#414853] bg-[#1b1b1f] px-4 py-3 font-bold text-[#f8f8f8]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#414853] px-4 py-3 text-[#c5c9ce]">{children}</td>
  )
}

export function MarkdownContent({
  children,
  className = ''
}: MarkdownContentProps): React.JSX.Element {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        components={components}
      >
        {children}
      </Markdown>
    </div>
  )
}
