import { load as loadYaml } from 'js-yaml'
import { findNotesDir, githubJson } from './githubApi'
import type { NoteDetail, NoteSummary, VaultSource } from './vaultSource'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = FRONTMATTER_RE.exec(raw)
  if (!match) return { data: {}, content: raw }
  const data = (loadYaml(match[1]) as Record<string, unknown>) ?? {}
  return { data, content: match[2] }
}

interface GithubSourceOptions {
  pat: string
  repos: string[]
}

interface GithubContentItem {
  name: string
  path: string
  type: string
}

function decodeBase64Utf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function toSummary(id: string, data: Record<string, unknown>, repo: string): NoteSummary {
  return {
    id,
    title: (data.title as string) ?? id,
    vault: repo,
    tags: (data.tags as string[]) ?? [],
    lifecycle: data.lifecycle as string | undefined,
    updatedAt: data.updatedAt as string | undefined,
  }
}

export function createGithubSource({ pat, repos }: GithubSourceOptions): VaultSource {
  // id -> location, populated as notes are loaded so getNote can find the file
  // without re-listing every repo on every call.
  const noteLocation = new Map<string, { repo: string; path: string }>()

  async function fetchNoteRaw(repo: string, path: string): Promise<string | null> {
    const data = await githubJson<{ content: string; encoding: string }>(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      pat,
    )
    if (!data) return null
    return data.encoding === 'base64' ? decodeBase64Utf8(data.content) : data.content
  }

  // Re-fetches every note's content on every list/search call. Fine for
  // typical vault sizes and PAT rate limits (5000 req/hr); would need real
  // caching if vaults grow large.
  async function loadAllNotes(): Promise<{ id: string; repo: string; data: Record<string, unknown> }[]> {
    const all: { id: string; repo: string; data: Record<string, unknown> }[] = []
    for (const repo of repos) {
      const notesDir = await findNotesDir(pat, repo)
      if (!notesDir) continue
      const items = await githubJson<GithubContentItem[]>(
        `https://api.github.com/repos/${repo}/contents/${notesDir}`,
        pat,
      )
      for (const item of items ?? []) {
        if (item.type !== 'file' || !item.name.endsWith('.md')) continue
        const raw = await fetchNoteRaw(repo, item.path)
        if (raw === null) continue
        const id = item.name.replace(/\.md$/, '')
        const parsed = parseFrontmatter(raw)
        noteLocation.set(id, { repo, path: item.path })
        all.push({ id, repo, data: parsed.data })
      }
    }
    return all
  }

  return {
    kind: 'github',
    supportsSemanticSearch: false,
    async listRecent(limit) {
      const all = await loadAllNotes()
      return all
        .map((n) => toSummary(n.id, n.data, n.repo))
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        .slice(0, limit)
    },
    async search(query, limit) {
      const all = await loadAllNotes()
      const q = query.toLowerCase()
      return all
        .filter((n) => {
          const title = String(n.data.title ?? '').toLowerCase()
          const tags = ((n.data.tags as string[]) ?? []).join(' ').toLowerCase()
          return title.includes(q) || tags.includes(q)
        })
        .map((n) => toSummary(n.id, n.data, n.repo))
        .slice(0, limit)
    },
    async getNote(id): Promise<NoteDetail | null> {
      let location = noteLocation.get(id)
      if (!location) {
        await loadAllNotes()
        location = noteLocation.get(id)
      }
      if (!location) return null
      const raw = await fetchNoteRaw(location.repo, location.path)
      if (raw === null) return null
      const parsed = parseFrontmatter(raw)
      return {
        ...toSummary(id, parsed.data, location.repo),
        content: parsed.content,
        role: parsed.data.role as string | undefined,
        createdAt: parsed.data.createdAt as string | undefined,
        relatedTo: parsed.data.relatedTo as { id: string; type?: string }[] | undefined,
      }
    },
  }
}
