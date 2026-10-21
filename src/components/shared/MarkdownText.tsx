import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, stripEmoji } from '@/lib/utils'
import { tidyMarkdown } from '@/lib/markdown'

interface MarkdownTextProps {
  content: string
  className?: string
}

export default function MarkdownText({ content, className }: MarkdownTextProps) {
  return (
    <div className={cn("markdown-content select-text", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {tidyMarkdown(stripEmoji(content || ''))}
      </ReactMarkdown>
    </div>
  )
}
