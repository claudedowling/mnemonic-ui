export interface NoteSummary {
  id: string
  title: string
  vault?: string
  tags?: string[]
  lifecycle?: string
  updatedAt?: string
  score?: number
}

export interface RelatedNote {
  id: string
  type?: string
}

export interface NoteDetail extends NoteSummary {
  content: string
  role?: string
  createdAt?: string
  relatedTo?: RelatedNote[]
}

export interface VaultSource {
  readonly kind: 'mcp' | 'github'
  readonly supportsSemanticSearch: boolean
  listRecent(limit: number): Promise<NoteSummary[]>
  search(query: string, limit: number): Promise<NoteSummary[]>
  getNote(id: string): Promise<NoteDetail | null>
}
