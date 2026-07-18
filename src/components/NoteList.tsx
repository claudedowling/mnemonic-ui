import type { NoteSummary } from '../mcp/types'

interface Props {
  notes: NoteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d
    .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
    .replace(/\//g, '.')
}

export function NoteList({ notes, selectedId, onSelect }: Props) {
  if (notes.length === 0) {
    return <p className="note-list-empty">No notes.</p>
  }

  return (
    <ul className="note-list">
      {notes.map((note) => {
        const date = formatDate(note.updatedAt)
        return (
          <li key={note.id}>
            <button
              className={note.id === selectedId ? 'note-list-item selected' : 'note-list-item'}
              onClick={() => onSelect(note.id)}
            >
              {date && <span className="note-date">{date}</span>}
              <span className="note-title">{note.title}</span>
              {note.tags && note.tags.length > 0 && (
                <span className="note-tags">{note.tags.join(' · ')}</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
