import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose-obel ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Open links in new tab
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // Prevent h1/h2 from being too large inside a card
          h1: ({ ...props }) => <h3 {...props} />,
          h2: ({ ...props }) => <h4 {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
