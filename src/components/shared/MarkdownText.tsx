import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownTextProps {
  content: string
  className?: string
}

export default function MarkdownText({ content, className }: MarkdownTextProps) {
  return (
    <div className={cn("markdown-content select-text", className)}>
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  )
}
