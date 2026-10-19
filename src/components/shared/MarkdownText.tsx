import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, stripEmoji } from '@/lib/utils'

interface MarkdownTextProps {
  content: string
  className?: string
}

export default function MarkdownText({ content, className }: MarkdownTextProps) {
  return (
    <div className={cn("markdown-content select-text", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {stripEmoji(content || '')}
      </ReactMarkdown>
    </div>
  )
}
