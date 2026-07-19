import { useEffect, useMemo, useState } from 'react'
import { fetchAccessibleRepos, repoVaultKind, type RepoSummary, type VaultKind } from '../lib/githubApi'
import { checkProjectPath, type ProjectPathCheck } from '../lib/mcpVerify'

const PAGE_SIZE = 20
const SCAN_CONCURRENCY = 5

type PathStatus = 'checking' | ProjectPathCheck | 'error'

interface SingleProps {
  mode: 'single'
  value: string
  onChange: (value: string) => void
}

interface MultiProps {
  mode: 'multi'
  value: string[]
  onChange: (value: string[]) => void
  // Only meaningful in multi mode: an optional local filesystem path per
  // selected repo, letting MCP semantic search resolve project identity for
  // that repo instead of only searching the global vault.
  mcpUrl?: string
  mcpConnected?: boolean
  paths?: Record<string, string>
  onPathsChange?: (paths: Record<string, string>) => void
}

// Which vault layout this list is looking for — a standalone global vault
// repo stores notes at `notes/` in its root, a project's own repo stores
// them at `.mnemonic/notes/`. Each picker only shows repos of its own kind.
type Props = (SingleProps | MultiProps) & { pat: string; expectedKind: 'global' | 'project' }

export function RepoPicker(props: Props) {
  const { pat, expectedKind } = props
  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [kindCache, setKindCache] = useState<Map<string, VaultKind>>(new Map())
  const [scanCursor, setScanCursor] = useState(0)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const trimmed = pat.trim()
    if (!trimmed) {
      setRepos([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetchAccessibleRepos(trimmed)
        .then((result) => {
          if (cancelled) return
          setRepos(result)
        })
        .catch(() => {
          if (cancelled) return
          setError('Could not list repos for this token.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pat])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return repos
    return repos.filter((r) => r.fullName.toLowerCase().includes(q))
  }, [repos, filter])

  useEffect(() => {
    setScanCursor(0)
  }, [filter, repos])

  const matches = useMemo(
    () => filtered.slice(0, scanCursor).filter((r) => kindCache.get(r.fullName) === expectedKind),
    [filtered, scanCursor, kindCache, expectedKind],
  )

  // Scans repos in order, checking each one's vault kind, until enough
  // matches of the expected kind are found (or the list runs out). Continues
  // from where it left off when visibleCount grows ("Load more").
  useEffect(() => {
    const trimmed = pat.trim()
    if (!trimmed || filtered.length === 0) return
    let cancelled = false
    async function scan() {
      setScanning(true)
      let idx = scanCursor
      let found = matches.length
      while (found < visibleCount && idx < filtered.length && !cancelled) {
        const batch = filtered.slice(idx, idx + SCAN_CONCURRENCY)
        const results = await Promise.all(
          batch.map(async (repo) => ({ repo, kind: await repoVaultKind(trimmed, repo.fullName) })),
        )
        if (cancelled) return
        setKindCache((m) => {
          const next = new Map(m)
          for (const { repo, kind } of results) next.set(repo.fullName, kind)
          return next
        })
        found += results.filter((r) => r.kind === expectedKind).length
        idx += batch.length
      }
      if (!cancelled) {
        setScanCursor(idx)
        setScanning(false)
      }
    }
    scan()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, visibleCount, pat, expectedKind])

  function isSelected(fullName: string): boolean {
    return props.mode === 'single' ? props.value === fullName : props.value.includes(fullName)
  }

  // Already-selected repos stay visible even before the scan reaches them —
  // otherwise a saved selection would appear to vanish while re-scanning.
  const visible = useMemo(() => {
    const seen = new Set<string>()
    const ordered: RepoSummary[] = []
    for (const repo of filtered) {
      if (isSelected(repo.fullName) && !seen.has(repo.fullName)) {
        seen.add(repo.fullName)
        ordered.push(repo)
      }
    }
    for (const repo of matches.slice(0, visibleCount)) {
      if (!seen.has(repo.fullName)) {
        seen.add(repo.fullName)
        ordered.push(repo)
      }
    }
    return ordered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, matches, visibleCount])

  const hasMore = matches.length > visibleCount || scanCursor < filtered.length

  const mcpUrl = props.mode === 'multi' ? (props.mcpUrl ?? '').trim() : ''
  const paths = props.mode === 'multi' ? (props.paths ?? {}) : {}
  const [pathStatus, setPathStatus] = useState<Map<string, PathStatus>>(new Map())

  function verifyPath(repoFullName: string, cwd: string) {
    if (!mcpUrl || !cwd.trim()) {
      setPathStatus((m) => {
        const next = new Map(m)
        next.delete(repoFullName)
        return next
      })
      return
    }
    setPathStatus((m) => new Map(m).set(repoFullName, 'checking'))
    checkProjectPath(mcpUrl, cwd.trim(), repoFullName)
      .then((result) => setPathStatus((m) => new Map(m).set(repoFullName, result)))
      .catch(() => setPathStatus((m) => new Map(m).set(repoFullName, 'error')))
  }

  function setPath(repoFullName: string, cwd: string) {
    if (props.mode !== 'multi' || !props.onPathsChange) return
    props.onPathsChange({ ...paths, [repoFullName]: cwd })
  }

  if (!pat.trim()) {
    // No PAT yet — fall back to manual entry so public-repo/no-token usage still works.
    return (
      <input
        value={props.mode === 'single' ? props.value : props.value.join(', ')}
        onChange={(e) => {
          if (props.mode === 'single') {
            props.onChange(e.target.value)
          } else {
            props.onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        }}
        placeholder="owner/repo"
      />
    )
  }

  function toggle(fullName: string) {
    if (props.mode === 'single') {
      props.onChange(fullName)
      return
    }
    const current = props.value
    if (current.includes(fullName)) {
      props.onChange(current.filter((r) => r !== fullName))
    } else {
      props.onChange([...current, fullName])
    }
  }

  return (
    <div className="repo-picker">
      <input
        className="repo-picker-filter"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value)
          setVisibleCount(PAGE_SIZE)
        }}
        placeholder={`Filter ${expectedKind} repos…`}
        disabled={loading}
      />
      {error && <p className="repo-picker-error">{error}</p>}
      <ul className="repo-picker-list">
        {loading && repos.length === 0 && <li className="repo-picker-loading">Loading repos…</li>}
        {!loading && repos.length > 0 && visible.length === 0 && (
          <li className="repo-picker-loading">
            {scanning ? `Scanning for a ${expectedKind} vault…` : `No ${expectedKind} vault found.`}
          </li>
        )}
        {visible.map((repo) => {
          const showPathField = props.mode === 'multi' && props.mcpConnected && mcpUrl && isSelected(repo.fullName)
          const pStatus = pathStatus.get(repo.fullName)
          return (
            <li key={repo.fullName} className="repo-picker-row">
              <label>
                <input
                  type={props.mode === 'single' ? 'radio' : 'checkbox'}
                  name={props.mode === 'single' ? 'repo-picker-single' : undefined}
                  checked={isSelected(repo.fullName)}
                  onChange={() => toggle(repo.fullName)}
                />
                <span className="repo-picker-name">{repo.fullName}</span>
                {!repo.isOwner && <span className="repo-picker-badge repo-picker-badge-collab">collaborator</span>}
                {pStatus && pStatus !== 'checking' && pStatus !== 'error' && (
                  <span
                    className={
                      pStatus.ok
                        ? 'repo-picker-badge repo-picker-badge-mcp-ok'
                        : 'repo-picker-badge repo-picker-badge-mcp-bad'
                    }
                    title={pStatus.label}
                  >
                    {pStatus.ok ? 'MCP ✓' : 'MCP ✗'}
                  </span>
                )}
                {pStatus === 'checking' && <span className="repo-picker-badge repo-picker-badge-checking">MCP…</span>}
              </label>
              {showPathField && (
                <div className="repo-picker-path">
                  <input
                    className="repo-picker-path-input"
                    value={paths[repo.fullName] ?? ''}
                    onChange={(e) => setPath(repo.fullName, e.target.value)}
                    onBlur={(e) => verifyPath(repo.fullName, e.target.value)}
                    placeholder="Local path on MCP server (optional, e.g. /home/you/repos/name)"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="repo-picker-more"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          disabled={loading || scanning}
        >
          {scanning ? 'Scanning…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
