import { callTool, configureMcp } from '../mcp/client'
import { createGithubSource } from './githubSource'
import type { RecallResult } from '../mcp/types'
import type { NoteSummary, VaultSource } from './vaultSource'
import type { Settings } from './settings'

// mnemonic's `recall` tool caps `limit` at 20 — the app's own result limit
// (e.g. 50) is enforced afterward by slicing the merged results, not by
// asking the tool for more than it allows.
const RECALL_MAX_LIMIT = 20

// GitHub is always the source of truth for browsing and content (listRecent,
// getNote). When an MCP server is also configured, search additionally fans
// out to `recall` — once for the global vault, plus once per project repo
// that has a real local cwd path configured (semantic search needs the
// server to resolve project identity from an actual filesystem path it can
// inspect; a repo with no path stays on GitHub's plain substring search).
export function createSource(settings: Settings): VaultSource {
  const repos = [settings.githubVaultRepo, ...settings.githubProjectRepos].filter(Boolean)
  const github = createGithubSource({ pat: settings.githubPat, repos })

  const mcpUrl = settings.mcpUrl.trim()
  if (!mcpUrl) return github

  configureMcp(mcpUrl)
  const cwds = Object.values(settings.projectRepoPaths).filter((p) => p.trim().length > 0)

  return {
    ...github,
    supportsSemanticSearch: true,
    async search(query, limit) {
      // Sequenced, not concurrent: a --stateful MCP bridge spawns one
      // subprocess per session, and this client reuses a single shared
      // session for every recall call — firing them concurrently against
      // that one session/subprocess corrupts the responses.
      const recallLimit = Math.min(limit, RECALL_MAX_LIMIT)
      const settled: RecallResult[] = []
      settled.push(await callTool<RecallResult>('recall', { query, limit: recallLimit }))
      for (const cwd of cwds) {
        settled.push(await callTool<RecallResult>('recall', { query, limit: recallLimit, cwd }))
      }

      const byId = new Map<string, NoteSummary>()
      for (const result of settled) {
        for (const note of result.results ?? []) {
          const existing = byId.get(note.id)
          if (!existing || (note.score ?? 0) > (existing.score ?? 0)) {
            byId.set(note.id, note)
          }
        }
      }

      // Repos with no configured cwd path aren't reachable via `recall` at
      // all (no project scope to resolve), so they'd silently disappear from
      // search once MCP is on. Fall back to GitHub's plain substring search
      // to cover them too — scored entries above always sort first.
      const textResults = await github.search(query, limit)
      for (const note of textResults) {
        if (!byId.has(note.id)) byId.set(note.id, note)
      }

      return [...byId.values()]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit)
    },
  }
}
