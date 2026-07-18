import { useCallback, useEffect, useState } from 'react'
import { AccessExpiredError, callTool } from './mcp/client'
import type { GetResult, NoteDetail, NoteSummary, RecallResult, RecentMemoriesResult } from './mcp/types'
import { SearchBox } from './components/SearchBox'
import { NoteList } from './components/NoteList'
import { NoteView } from './components/NoteView'
import './App.css'

const MCP_ORIGIN = new URL(import.meta.env.VITE_MCP_URL ?? '/mcp', window.location.href).origin

export default function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingNote, setLoadingNote] = useState(false)
  const [accessExpired, setAccessExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withErrorHandling = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setError(null)
      return await fn()
    } catch (e) {
      if (e instanceof AccessExpiredError) {
        setAccessExpired(true)
      } else {
        setError(e instanceof Error ? e.message : 'Unknown error')
      }
      return undefined
    }
  }, [])

  const loadRecent = useCallback(() => {
    setLoadingList(true)
    withErrorHandling(() => callTool<RecentMemoriesResult>('recent_memories', { limit: 20 }))
      .then((result) => {
        if (result) setNotes(result.notes ?? [])
      })
      .finally(() => setLoadingList(false))
  }, [withErrorHandling])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  function handleSearch(query: string) {
    setLoadingList(true)
    withErrorHandling(() => callTool<RecallResult>('recall', { query, limit: 20 }))
      .then((result) => {
        if (result) setNotes(result.results ?? [])
      })
      .finally(() => setLoadingList(false))
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setLoadingNote(true)
    withErrorHandling(() => callTool<GetResult>('get', { ids: [id] }))
      .then((result) => {
        setSelectedNote(result?.notes?.[0] ?? null)
      })
      .finally(() => setLoadingNote(false))
  }

  if (accessExpired) {
    return (
      <div className="access-expired">
        <p>Your session with mnemonic has expired or wasn't authenticated.</p>
        <a href={MCP_ORIGIN} target="_blank" rel="noreferrer">
          Re-authenticate at {MCP_ORIGIN}
        </a>
        <button type="button" onClick={() => setAccessExpired(false)}>
          I've re-authenticated, retry
        </button>
      </div>
    )
  }

  return (
    <div className={selectedId ? 'app-shell note-open' : 'app-shell'}>
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-mark">Mnemonic</p>
          <p className="brand-sub">memory vault</p>
        </div>
        <SearchBox onSearch={handleSearch} onClear={loadRecent} />
        {loadingList ? (
          <p className="note-list-empty">Loading…</p>
        ) : (
          <NoteList notes={notes} selectedId={selectedId} onSelect={handleSelect} />
        )}
        {error && <p className="error-banner">{error}</p>}
      </aside>
      <main className="content">
        <button type="button" className="back-button" onClick={() => setSelectedId(null)}>
          ← Drawer
        </button>
        <NoteView note={selectedNote} loading={loadingNote} />
      </main>
    </div>
  )
}
