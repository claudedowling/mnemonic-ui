export interface Settings {
  githubPat: string
  githubVaultRepo: string
  githubProjectRepos: string[]
  // repo fullName -> absolute local filesystem path on the machine running
  // the MCP server, e.g. "/home/steve/repos/mnemonic-ui". Only meaningful
  // when mcpUrl is set — enables project-scoped (not just global) semantic
  // search for that repo, since the server can only resolve project identity
  // from a real cwd it can inspect, not from a repo name alone.
  projectRepoPaths: Record<string, string>
  mcpUrl: string
}

const STORAGE_KEY = 'mnemonic-ui:settings'

const DEFAULTS: Settings = {
  githubPat: '',
  githubVaultRepo: '',
  githubProjectRepos: [],
  projectRepoPaths: {},
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
  return settings.githubVaultRepo.trim().length > 0
}
