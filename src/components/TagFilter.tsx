import { useState } from 'react'

interface Props {
  tags: string[]
  activeTags: string[]
  onToggle: (tag: string) => void
}

export function TagFilter({ tags, activeTags, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  if (tags.length === 0) return null

  return (
    <div className="tag-filter-accordion">
      <button type="button" className="tag-filter-toggle" onClick={() => setOpen((o) => !o)}>
        <span>Filter by tags{activeTags.length > 0 ? ` (${activeTags.length})` : ''}</span>
        <span className="tag-filter-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="tag-filter">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTags.includes(tag) ? 'tag-filter-pill active' : 'tag-filter-pill'}
              onClick={() => onToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
