export function authHeaders(pat: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (pat) headers.Authorization = `token ${pat}`
  return headers
}

export async function githubJson<T>(url: string, pat: string): Promise<T | null> {
  const res = await fetch(url, { headers: authHeaders(pat) })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}) for ${url}`)
  }
  return (await res.json()) as T
}

export interface RepoSummary {
  fullName: string
  isOwner: boolean
}

export async function fetchViewerLogin(pat: string): Promise<string | null> {
  const data = await githubJson<{ login: string }>('https://api.github.com/user', pat)
  return data?.login ?? null
}

// Pages through every repo the token can see (owned, collaborator, or org
// member), capped at 5 pages (500 repos) — enough for any real account
// without risking a runaway fetch loop.
export async function fetchAccessibleRepos(pat: string): Promise<RepoSummary[]> {
  const login = await fetchViewerLogin(pat)
  const all: RepoSummary[] = []
  const seen = new Set<string>()
  for (let page = 1; page <= 5; page++) {
    const data = await githubJson<{ full_name: string; owner: { login: string } }[]>(
      `https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100&page=${page}`,
      pat,
    )
    if (!data || data.length === 0) break
    for (const r of data) {
      if (seen.has(r.full_name)) continue
      seen.add(r.full_name)
      all.push({ fullName: r.full_name, isOwner: r.owner.login === login })
    }
    if (data.length < 100) break
  }
  all.sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
  return all
}

export async function repoHasVault(pat: string, repo: string): Promise<boolean> {
  const data = await githubJson(`https://api.github.com/repos/${repo}/contents/.mnemonic/notes`, pat)
  return data !== null
}
