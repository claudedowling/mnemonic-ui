export interface NoteSummary {
  id: string
  title: string
  vault?: string
  tags?: string[]
  lifecycle?: string
  updatedAt?: string
  score?: number
}

export interface NoteDetail {
  id: string
  title: string
  content: string
  tags?: string[]
  lifecycle?: string
  role?: string
  vault?: string
  createdAt?: string
  updatedAt?: string
}

export interface RecallResult {
  results: NoteSummary[]
}

export interface ListResult {
  notes: NoteSummary[]
}

export interface RecentMemoriesResult {
  notes: NoteSummary[]
}

export interface GetResult {
  notes: NoteDetail[]
  notFound?: string[]
}
