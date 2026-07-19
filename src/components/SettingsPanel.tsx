import { useState } from 'react'
import type { Settings } from '../lib/settings'
import { RepoPicker } from './RepoPicker'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
  canCancel: boolean
}

export function SettingsPanel({ settings, onSave, onClose, canCancel }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <h2>Connect to a vault</h2>

        <div className="settings-mode-row">
          <label className="settings-mode">
            <input
              type="radio"
              checked={draft.connectionMode === 'github'}
              onChange={() => update('connectionMode', 'github')}
            />
            GitHub (read-only)
          </label>
          <label className="settings-mode">
            <input
              type="radio"
              checked={draft.connectionMode === 'mcp'}
              onChange={() => update('connectionMode', 'mcp')}
            />
            MCP server (adds semantic search)
          </label>
        </div>

        {draft.connectionMode === 'github' ? (
          <>
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
              with read-only Contents access, scoped to the repos below if your vault is private.
            </p>
            <label className="settings-field">
              Global vault repo
              <RepoPicker
                mode="single"
                pat={draft.githubPat}
                value={draft.githubVaultRepo}
                onChange={(v) => update('githubVaultRepo', v)}
              />
            </label>
            <label className="settings-field">
              Project repos
              <RepoPicker
                mode="multi"
                pat={draft.githubPat}
                value={draft.githubProjectRepos}
                onChange={(v) => update('githubProjectRepos', v)}
              />
            </label>
          </>
        ) : (
          <label className="settings-field">
            MCP server URL
            <input
              value={draft.mcpUrl}
              onChange={(e) => update('mcpUrl', e.target.value)}
              placeholder="https://mnemonic.example.com/mcp"
            />
          </label>
        )}

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
