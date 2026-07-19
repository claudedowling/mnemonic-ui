import { callTool, configureMcp } from '../mcp/client'
import type { GetResult, RecallResult, RecentMemoriesResult } from '../mcp/types'
import type { NoteDetail, VaultSource } from './vaultSource'

export function createMcpSource(mcpUrl: string): VaultSource {
  configureMcp(mcpUrl)
  return {
    kind: 'mcp',
    supportsSemanticSearch: true,
    async listRecent(limit) {
      const result = await callTool<RecentMemoriesResult>('recent_memories', { limit })
      return result.notes ?? []
    },
    async search(query, limit) {
      const result = await callTool<RecallResult>('recall', { query, limit })
      return result.results ?? []
    },
    async getNote(id) {
      const result = await callTool<GetResult>('get', { ids: [id] })
      return (result.notes?.[0] as NoteDetail | undefined) ?? null
    },
  }
}
