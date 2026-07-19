import { useEffect, useMemo, useState } from 'react'
import { fetchAccessibleRepos, repoHasVault, type RepoSummary } from '../lib/githubApi'

const PAGE_SIZE = 20

type VaultStatus = 'checking' | boolean

interface SingleProps {
  mode: 'single'
  value: string
  onChange: (value: string) => void
}

interface MultiProps {
  mode: 'multi'
  value: string[]
  onChange: (value: string[]) => void
}

type Props = (SingleProps | MultiProps) & { pat: string }

export function RepoPicker(props: Props) {
  const { pat } = props
  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [vaultStatus, setVaultStatus] = useState<Map<string, VaultStatus>>(new Map())

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

  const visible = filtered.slice(0, visibleCount)

  useEffect(() => {
    const trimmed = pat.trim()
    if (!trimmed) return
    for (const repo of visible) {
      if (vaultStatus.has(repo.fullName)) continue
      setVaultStatus((m) => new Map(m).set(repo.fullName, 'checking'))
      repoHasVault(trimmed, repo.fullName)
        .then((has) => {
          setVaultStatus((m) => new Map(m).set(repo.fullName, has))
        })
        .catch(() => {
          setVaultStatus((m) => new Map(m).set(repo.fullName, false))
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((r) => r.fullName).join(','), pat])

  const checkingInitialBatch =
    loading || visible.some((r) => vaultStatus.get(r.fullName) === 'checking')

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

  function isSelected(fullName: string): boolean {
    return props.mode === 'single' ? props.value === fullName : props.value.includes(fullName)
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
        placeholder="Filter repos…"
        disabled={loading}
      />
      {error && <p className="repo-picker-error">{error}</p>}
      <ul className="repo-picker-list">
        {loading && repos.length === 0 && <li className="repo-picker-loading">Loading repos…</li>}
        {visible.map((repo) => {
          const status = vaultStatus.get(repo.fullName)
          return (
            <li key={repo.fullName} className="repo-picker-row">
              <label>
                <input
                  type={props.mode === 'single' ? 'radio' : 'checkbox'}
                  name={props.mode === 'single' ? 'repo-picker-single' : undefined}
                  checked={isSelected(repo.fullName)}
                  onChange={() => toggle(repo.fullName)}
                  disabled={checkingInitialBatch}
                />
                <span className="repo-picker-name">{repo.fullName}</span>
                {!repo.isOwner && <span className="repo-picker-badge repo-picker-badge-collab">collaborator</span>}
                {status === 'checking' && <span className="repo-picker-badge repo-picker-badge-checking">…</span>}
                {status === true && <span className="repo-picker-badge repo-picker-badge-vault">.mnemonic</span>}
              </label>
            </li>
          )
        })}
      </ul>
      {visible.length < filtered.length && (
        <button
          type="button"
          className="repo-picker-more"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          disabled={loading}
        >
          Load more
        </button>
      )}
    </div>
  )
}
