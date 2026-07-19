import { useState } from 'react'
import type { Settings } from '../lib/settings'
import { pingMcp } from '../lib/mcpVerify'
import { RepoPicker } from './RepoPicker'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
  canCancel: boolean
}

type McpConnectionState = 'idle' | 'checking' | 'ok' | 'error'

export function SettingsPanel({ settings, onSave, onClose, canCancel }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [mcpState, setMcpState] = useState<McpConnectionState>('idle')
  const [mcpMessage, setMcpMessage] = useState('')

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function handleConnect() {
    const url = draft.mcpUrl.trim()
    if (!url) return
    setMcpState('checking')
    pingMcp(url).then((result) => {
      setMcpState(result.ok ? 'ok' : 'error')
      setMcpMessage(result.message)
    })
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <h2>Connect to a vault</h2>

        <label className="settings-field">
          GitHub personal access token
          <input
            type="password"
            value={draft.githubPat}
            onChange={(e) => update('githubPat', e.target.value)}
            placeholder="github_pat_..."
          />
        </label>
        <p className="settings-hint">
          Optional for public repos. Stored only in this browser&apos;s local storage. Use a{' '}
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            fine-grained token
          </a>{' '}
          with read-only Contents access, scoped to the repos below if your vault is private. Adding a token also
          lets you pick repos from a list instead of typing them.
        </p>

        <label className="settings-field">
          <span className="settings-field-label-row">
            Global vault repo
            {mcpState === 'ok' && <span className="settings-mcp-tag">mcp</span>}
          </span>
          <RepoPicker
            mode="single"
            expectedKind="global"
            pat={draft.githubPat}
            value={draft.githubVaultRepo}
            onChange={(v) => update('githubVaultRepo', v)}
          />
        </label>

        <label className="settings-field">
          Project repos
          <RepoPicker
            mode="multi"
            expectedKind="project"
            pat={draft.githubPat}
            value={draft.githubProjectRepos}
            onChange={(v) => update('githubProjectRepos', v)}
            mcpUrl={draft.mcpUrl}
            mcpConnected={mcpState === 'ok'}
            paths={draft.projectRepoPaths}
            onPathsChange={(v) => update('projectRepoPaths', v)}
          />
        </label>

        <label className="settings-field">
          MCP server URL (optional)
          <div className="mcp-url-row">
            <input
              value={draft.mcpUrl}
              onChange={(e) => {
                update('mcpUrl', e.target.value)
                setMcpState('idle')
                setMcpMessage('')
              }}
              placeholder="https://mnemonic.example.com/mcp"
            />
            <button
              type="button"
              className="mcp-connect-button"
              onClick={handleConnect}
              disabled={!draft.mcpUrl.trim() || mcpState === 'checking'}
            >
              {mcpState === 'checking' ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </label>
        {mcpState === 'ok' && <p className="mcp-status mcp-status-ok">✓ {mcpMessage}</p>}
        {mcpState === 'error' && <p className="mcp-status mcp-status-error">✗ {mcpMessage}</p>}
        <p className="settings-hint">
          Adds semantic search on top of the GitHub browsing above. Searches the global vault; connect above, then add
          a local path next to a project repo (above) to also get project-scoped semantic search for it — the server
          needs a real filesystem path it can inspect to resolve project identity.
        </p>

        <div className="settings-actions">
          {canCancel && (
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="settings-save"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
