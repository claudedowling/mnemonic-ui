import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessExpiredError, getMcpOrigin } from './mcp/client'
import { createSource } from './lib/compositeSource'
import type { NoteDetail, NoteSummary } from './lib/vaultSource'
import { isConfigured, loadSettings, saveSettings, type Settings } from './lib/settings'
import { labelForProject } from './lib/projectColor'
import { SearchBox } from './components/SearchBox'
import { NoteList } from './components/NoteList'
import { NoteView } from './components/NoteView'
import { TagFilter } from './components/TagFilter'
import { ProjectFilter } from './components/ProjectFilter'
import { SettingsPanel } from './components/SettingsPanel'
import './App.css'

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)

  const source = useMemo(() => (isConfigured(settings) ? createSource(settings) : null), [settings])

  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingNote, setLoadingNote] = useState(false)
  const [accessExpired, setAccessExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [activeProject, setActiveProject] = useState<string | null>(null)

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
    if (!source) return
    setLoadingList(true)
    withErrorHandling(() => source.listRecent(50))
      .then((result) => {
        if (result) setNotes(result)
      })
      .finally(() => setLoadingList(false))
  }, [source, withErrorHandling])

  useEffect(() => {
    setActiveTags([])
    setActiveProject(null)
    loadRecent()
  }, [loadRecent])

  function handleSearch(query: string) {
    if (!source) return
    setLoadingList(true)
    withErrorHandling(() => source.search(query, 50))
      .then((result) => {
        if (result) setNotes(result)
      })
      .finally(() => setLoadingList(false))
  }

  function handleSelect(id: string) {
    if (!source) return
    setSelectedId(id)
    setLoadingNote(true)
    withErrorHandling(() => source.getNote(id))
      .then((result) => {
        setSelectedNote(result ?? null)
      })
      .finally(() => setLoadingNote(false))
  }

  function handleTagToggle(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleTagClickFromNote(tag: string, additive: boolean) {
    setActiveTags((prev) => {
      if (additive) {
        return prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      }
      return prev.length === 1 && prev[0] === tag ? [] : [tag]
    })
  }

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const note of notes) {
      for (const tag of note.tags ?? []) tagSet.add(tag)
    }
    return [...tagSet].sort()
  }, [notes])

  const projectOptions = useMemo(() => {
    const vaults = new Set<string>()
    for (const note of notes) {
      if (note.vault) vaults.add(note.vault)
    }
    return [...vaults]
      .map((vault) => ({ value: vault, label: labelForProject(vault, settings.githubVaultRepo) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [notes, settings.githubVaultRepo])

  const visibleNotes = useMemo(
    () =>
      notes
        .filter((n) => activeTags.every((tag) => n.tags?.includes(tag)))
        .filter((n) => !activeProject || n.vault === activeProject),
    [notes, activeTags, activeProject],
  )

  function handleSaveSettings(next: Settings) {
    saveSettings(next)
    setSettings(next)
    setSelectedId(null)
    setSelectedNote(null)
    setAccessExpired(false)
  }

  if (!source) {
    return (
      <SettingsPanel
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => {}}
        canCancel={false}
      />
    )
  }

  if (accessExpired) {
    const origin = getMcpOrigin()
    return (
      <div className="access-expired">
        <p>Your session with mnemonic has expired or wasn't authenticated.</p>
        <a href={origin} target="_blank" rel="noreferrer">
          Re-authenticate at {origin}
        </a>
        <button type="button" onClick={() => setAccessExpired(false)}>
          I've re-authenticated, retry
        </button>
      </div>
    )
  }

  return (
    <div className={selectedId ? 'app-shell note-open' : 'app-shell'}>
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          canCancel
        />
      )}
      <aside className="sidebar">
        <div className="brand">
          <p className="brand-mark">Mnemonic</p>
          <p className="brand-sub">
            memory vault
            {source.supportsSemanticSearch && <span className="semantic-badge">semantic search</span>}
          </p>
          <button type="button" className="settings-gear" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
        <SearchBox onSearch={handleSearch} onClear={loadRecent} />
        <ProjectFilter projects={projectOptions} activeProject={activeProject} onSelect={setActiveProject} />
        <TagFilter tags={allTags} activeTags={activeTags} onToggle={handleTagToggle} />
        {loadingList ? (
          <p className="note-list-empty">Loading…</p>
        ) : (
          <NoteList notes={visibleNotes} selectedId={selectedId} onSelect={handleSelect} />
        )}
        {error && <p className="error-banner">{error}</p>}
      </aside>
      <main className="content">
        <button type="button" className="back-button" onClick={() => setSelectedId(null)}>
          ← Drawer
        </button>
        <NoteView
          note={selectedNote}
          loading={loadingNote}
          onSelectRelated={handleSelect}
          onTagClick={handleTagClickFromNote}
        />
      </main>
    </div>
  )
}
