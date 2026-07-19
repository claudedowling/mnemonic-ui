import { AccessExpiredError, callTool, configureMcp } from '../mcp/client'

export interface McpConnectionResult {
  ok: boolean
  message: string
}

// A lightweight, side-effect-free call (limit: 1) used purely to prove the
// server is reachable and authenticated before relying on it elsewhere.
export async function pingMcp(url: string): Promise<McpConnectionResult> {
  try {
    configureMcp(url)
    await callTool('recent_memories', { limit: 1 })
    return { ok: true, message: 'Connected' }
  } catch (e) {
    if (e instanceof AccessExpiredError) {
      return {
        ok: false,
        message: 'Not authenticated — open the server URL in a new tab to log in, then try again.',
      }
    }
    return { ok: false, message: e instanceof Error ? e.message : 'Connection failed' }
  }
}

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
