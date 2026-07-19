interface Props {
  tags: string[]
  activeTag: string | null
  onSelect: (tag: string | null) => void
}

export function TagFilter({ tags, activeTag, onSelect }: Props) {
  if (tags.length === 0) return null

  return (
    <div className="tag-filter">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={tag === activeTag ? 'tag-filter-pill active' : 'tag-filter-pill'}
          onClick={() => onSelect(tag === activeTag ? null : tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
