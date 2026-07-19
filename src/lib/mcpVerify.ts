import { callTool, configureMcp } from '../mcp/client'

interface DetectProjectResult {
  projectId?: string
  projectName?: string
  name?: string
  id?: string
}

export interface ProjectPathCheck {
  ok: boolean
  label: string
}

// Confirms a local cwd path actually resolves to the given repo on the
// machine running the MCP server, by asking the server to detect the
// project there and comparing it against the repo's own name.
export async function checkProjectPath(mcpUrl: string, cwd: string, repoFullName: string): Promise<ProjectPathCheck> {
  configureMcp(mcpUrl)
  const result = await callTool<DetectProjectResult>('detect_project', { cwd })
  const detected = result.projectName ?? result.name ?? result.projectId ?? result.id ?? ''
  const repoName = repoFullName.split('/').pop() ?? repoFullName
  const ok = detected.trim().length > 0 && detected.toLowerCase().includes(repoName.toLowerCase())
  return { ok, label: detected || 'no project detected' }
}
