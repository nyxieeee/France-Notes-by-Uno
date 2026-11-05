import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, ArrowClockwise, ListBullets, ListNumbers, TextAlignLeft, TextAlignCenter, TextAlignRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { encodeNoteHTML, noteContentHTML, NOTE_CONTENT_CSS, sanitizeNoteHTML } from '@/lib/noteContent'

const COMMANDS = [
  ['bold', 'Bold (Ctrl+B)', 'B'], ['italic', 'Italic (Ctrl+I)', 'I'],
  ['underline', 'Underline (Ctrl+U)', 'U'], ['strikeThrough', 'Strikethrough', 'S'],
  ['insertUnorderedList', 'Bullet list', 'List'], ['insertOrderedList', 'Numbered list', '1. List'],
  ['justifyLeft', 'Align left', 'Left'], ['justifyCenter', 'Align center', 'Center'], ['justifyRight', 'Align right', 'Right'],
  ['undo', 'Undo', 'Undo'], ['redo', 'Redo', 'Redo'], ['removeFormat', 'Clear formatting', 'Clear'],
] as const

export default function RichTextEditor({ initialContent, onChange }: { initialContent: string; onChange: (content: string) => void }) {
  const editor = useRef<HTMLDivElement>(null)
  const selection = useRef<Range | null>(null)
  const initial = useRef(initialContent)
  const [active, setActive] = useState<string[]>([])
  useLayoutEffect(() => { if (editor.current) editor.current.innerHTML = noteContentHTML(initial.current) }, [])
  useEffect(() => {
    const remember = () => {
      const selected = window.getSelection()
      if (!selected?.rangeCount || !editor.current?.contains(selected.anchorNode)) return
      selection.current = selected.getRangeAt(0).cloneRange()
      setActive(COMMANDS.filter(([command]) => document.queryCommandState(command)).map(([command]) => command))
    }
    document.addEventListener('selectionchange', remember)
    return () => document.removeEventListener('selectionchange', remember)
  }, [])
  const emit = () => { if (editor.current) onChange(encodeNoteHTML(editor.current.innerHTML)) }
  const command = (name: string, value?: string) => {
    editor.current?.focus()
    const selected = window.getSelection()
    if (selection.current && selected) { selected.removeAllRanges(); selected.addRange(selection.current) }
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(name, false, value)
    if (selected?.rangeCount) selection.current = selected.getRangeAt(0).cloneRange()
    emit()
    setActive(COMMANDS.filter(([cmd]) => document.queryCommandState(cmd)).map(([cmd]) => cmd))
  }
  return <div className="flex-1 flex flex-col gap-4">
    <style>{NOTE_CONTENT_CSS}</style>
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <select aria-label="Paragraph style" defaultValue="p" onChange={event => { command('formatBlock', event.target.value); event.target.value = 'p' }} className="bg-[var(--card)] rounded-lg text-xs p-2 outline-none">
        <option value="p">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option>
      </select>
      <select aria-label="Font size" defaultValue="3" onChange={event => command('fontSize', event.target.value)} className="bg-[var(--card)] rounded-lg text-xs p-2 outline-none">
        <option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Extra large</option>
      </select>
      {COMMANDS.map(([name, label, text]) => <button key={name} type="button" title={label} aria-label={label} aria-pressed={active.includes(name)} onMouseDown={event => event.preventDefault()} onClick={() => command(name)} className={cn('rounded-lg px-2.5 py-1.5 text-xs hover:bg-[var(--rose-soft)]', active.includes(name) && 'bg-[var(--secondary-bg)] text-[var(--pink)]')}>
        {name === 'undo' ? <ArrowCounterClockwise size={16} aria-hidden="true" />
          : name === 'redo' ? <ArrowClockwise size={16} aria-hidden="true" />
          : name === 'insertUnorderedList' ? <ListBullets size={16} aria-hidden="true" />
          : name === 'insertOrderedList' ? <ListNumbers size={16} aria-hidden="true" />
          : name === 'justifyLeft' ? <TextAlignLeft size={16} aria-hidden="true" />
          : name === 'justifyCenter' ? <TextAlignCenter size={16} aria-hidden="true" />
          : name === 'justifyRight' ? <TextAlignRight size={16} aria-hidden="true" />
          : <span style={{ fontWeight: name === 'bold' ? 700 : undefined, fontStyle: name === 'italic' ? 'italic' : undefined, textDecoration: name === 'underline' ? 'underline' : name === 'strikeThrough' ? 'line-through' : undefined }}>{text}</span>}
      </button>)}
      <label className="text-xs flex items-center gap-1 px-2" title="Text color">Text<input type="color" aria-label="Text color" defaultValue="#4a3237" onChange={event => command('foreColor', event.target.value)} className="w-6 h-6 bg-transparent cursor-pointer" /></label>
      <label className="text-xs flex items-center gap-1 px-2" title="Highlight color">Highlight<input type="color" aria-label="Highlight color" defaultValue="#ffe066" onChange={event => command('hiliteColor', event.target.value)} className="w-6 h-6 bg-transparent cursor-pointer" /></label>
    </div>
    <div ref={editor} contentEditable suppressContentEditableWarning role="textbox" aria-label="Note content" aria-multiline="true" data-placeholder="Start writing..." onInput={emit}
      style={{ fontFamily: 'Arial, sans-serif', fontSize: 16 }}
      onPaste={event => {
        event.preventDefault()
        const html = event.clipboardData.getData('text/html')
        if (html) command('insertHTML', sanitizeNoteHTML(html))
        else command('insertText', event.clipboardData.getData('text/plain'))
      }}
      onDrop={event => event.preventDefault()}
      className="note-rich-content flex-1 min-h-[45vh] outline-none text-[14.5px] empty:before:content-[attr(data-placeholder)] empty:before:text-th-text-secondary/50" />
  </div>
}
