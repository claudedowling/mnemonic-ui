export type ConnectionMode = 'github' | 'mcp'

export interface Settings {
  connectionMode: ConnectionMode
  githubPat: string
  githubVaultRepo: string
  githubProjectRepos: string[]
  mcpUrl: string
}

const STORAGE_KEY = 'mnemonic-ui:settings'

const DEFAULTS: Settings = {
  connectionMode: 'github',
  githubPat: '',
  githubVaultRepo: '',
  githubProjectRepos: [],
  mcpUrl: '',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function isConfigured(settings: Settings): boolean {
  if (settings.connectionMode === 'mcp') return settings.mcpUrl.trim().length > 0
  return settings.githubVaultRepo.trim().length > 0
}
