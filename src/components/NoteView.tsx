import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { NoteDetail } from '../mcp/types'

interface Props {
  note: NoteDetail | null
  loading: boolean
  onSelectRelated: (id: string) => void
  onTagClick: (tag: string, additive: boolean) => void
}

export function NoteView({ note, loading, onSelectRelated, onTagClick }: Props) {
  const html = useMemo(() => {
    if (!note) return ''
    const raw = marked.parse(note.content, { async: false })
    return DOMPurify.sanitize(raw)
  }, [note])

  if (loading) return <p className="note-view-empty">Loading…</p>
  if (!note) return <p className="note-view-empty">Select a note to view it.</p>

  return (
    <article className="note-view">
      {note.lifecycle && <span className="note-stamp">{note.lifecycle}</span>}
      <h1>{note.title}</h1>
      <div className="note-meta">
        {note.role && <span>{note.role}</span>}
        {note.vault && <span>{note.vault}</span>}
        {note.updatedAt && <span>updated {new Date(note.updatedAt).toLocaleString()}</span>}
      </div>
      {note.tags && note.tags.length > 0 && (
        <div className="note-tags-row">
          {note.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="note-tag-pill"
              title="Filter by this tag (shift-click to add to current filters)"
              onClick={(e) => onTagClick(tag, e.shiftKey)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div className="note-content" dangerouslySetInnerHTML={{ __html: html }} />
      {note.relatedTo && note.relatedTo.length > 0 && (
        <div className="related-notes">
          <span className="related-notes-label">Related</span>
          {note.relatedTo.map((rel) => (
            <button
              key={rel.id}
              type="button"
              className="related-note-pill"
              onClick={() => onSelectRelated(rel.id)}
            >
              {rel.id}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
