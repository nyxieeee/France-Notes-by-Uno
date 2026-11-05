import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { tidyMarkdown } from '@/lib/markdown'
import { encodeNoteHTML, noteContentHTML, noteContentText } from '@/lib/noteContent'
import type { ChatSession } from '@/stores/chatStore'

function formattedReply(content: string): string {
  // Parse the reply once when saving. Notes contain editable formatting, never
  // Markdown source. Flatten tables into readable rows for the text editor.
  return renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    h4: ({ children }) => <h3>{children}</h3>,
    h5: ({ children }) => <h3>{children}</h3>,
    h6: ({ children }) => <h3>{children}</h3>,
    table: ({ children }) => <div>{children}</div>,
    thead: ({ children }) => <div>{children}</div>,
    tbody: ({ children }) => <div>{children}</div>,
    tr: ({ children }) => <p>{children}</p>,
    th: ({ children }) => <strong>{children}{' | '}</strong>,
    td: ({ children }) => <span>{children}{' | '}</span>,
    pre: ({ children }) => <div>{children}</div>,
    code: ({ children }) => <span>{children}</span>,
    hr: () => <br />,
  }}>{tidyMarkdown(content)}</ReactMarkdown>).replace(/>\n</g, '><')
}

export function chatReplyToNote(content: string, assistantName: string) {
  const richContent = encodeNoteHTML(formattedReply(content))
  const firstLine = noteContentText(richContent).split('\n').find(line => line.trim())?.trim() || 'From chat'
  return { title: `${assistantName}: ${firstLine.slice(0, 60)}`, content: richContent }
}

export function chatSessionToNote(session: ChatSession, assistantName: string) {
  const html = session.messages.map(message => {
    const label = noteContentHTML(message.role === 'user' ? 'You' : assistantName)
    const body = message.role === 'assistant' ? formattedReply(message.content) : noteContentHTML(message.content)
    return `<h2>${label}</h2><div>${body}</div>`
  }).join('')
  return { title: `${assistantName}: ${session.title}`, content: encodeNoteHTML(html) }
}
