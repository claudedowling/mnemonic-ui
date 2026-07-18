import { useState, type FormEvent } from 'react'

interface Props {
  onSearch: (query: string) => void
  onClear: () => void
}

export function SearchBox({ onSearch, onClear }: Props) {
  const [query, setQuery] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) onSearch(trimmed)
    else onClear()
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <input
        type="search"
        placeholder="Search memories…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (e.target.value.trim() === '') onClear()
        }}
      />
    </form>
  )
}
