import type { NoteSummary } from '../mcp/types'
import { colorForProject } from '../lib/projectColor'

interface Props {
  notes: NoteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null

  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays >= 2 && diffDays <= 7) return `${diffDays}d ago`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
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
              <span className="note-project-bar" style={{ backgroundColor: colorForProject(note.vault) }} />
              <span className="note-list-item-body">
                {date && <span className="note-date">{date}</span>}
                <span className="note-title">{note.title}</span>
                {note.tags && note.tags.length > 0 && (
                  <span className="note-tags">{note.tags.join(' · ')}</span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
