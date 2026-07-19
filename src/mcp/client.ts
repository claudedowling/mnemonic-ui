// Minimal JSON-RPC client for the mnemonic MCP server over streamable HTTP.
// Confirmed live against mnemonic.dowling.nz (2026-07-18): POST-only works,
// session id arrives via the `mcp-session-id` response header, no GET stream
// needs to be held open for normal read/write calls.

// Runtime-configurable (via Settings), not a build-time env var, so anyone
// deploying their own copy of this app configures it in-app rather than
// needing their own build.
let mcpUrl = import.meta.env.VITE_MCP_URL ?? '/mcp'

export function configureMcp(url: string) {
  mcpUrl = url
  sessionId = null
  initPromise = null
}

export function getMcpOrigin(): string {
  return new URL(mcpUrl, window.location.href).origin
}

export class AccessExpiredError extends Error {
  constructor() {
    super('Cloudflare Access session expired or missing')
    this.name = 'AccessExpiredError'
  }
}

export class McpToolError extends Error {
  data?: unknown
  constructor(message: string, data?: unknown) {
    super(message)
    this.name = 'McpToolError'
    this.data = data
  }
}

let sessionId: string | null = null
let requestId = 0
let initPromise: Promise<void> | null = null

async function rpcRequest(method: string, params?: unknown, expectResult = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const body: Record<string, unknown> = { jsonrpc: '2.0', method }
  if (params !== undefined) body.params = params
  if (expectResult) body.id = ++requestId

  const res = await fetch(mcpUrl, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
  })

  const newSessionId = res.headers.get('mcp-session-id')
  if (newSessionId) sessionId = newSessionId

  const contentType = res.headers.get('content-type') ?? ''

  // A redirect to an Access login page or an HTML interstitial shows up here
  // as an HTML response — that's the Access-expiry signal. Checked via a
  // content-type denylist (not an allowlist) so legitimate non-JSON/non-SSE
  // responses like the 202 text/plain ack for fire-and-forget notifications
  // aren't mistaken for an expired session.
  if (contentType.includes('text/html')) {
    throw new AccessExpiredError()
  }

  if (!expectResult) return undefined

  const text = await res.text()
  const jsonLine = text
    .split('\n')
    .find((line) => line.startsWith('data:'))
    ?.slice(5)
    .trim()
  const payload = JSON.parse(jsonLine ?? text)

  if (payload.error) {
    throw new McpToolError(payload.error.message ?? 'MCP tool error', payload.error.data)
  }
  return payload.result
}

async function ensureInitialized() {
  if (sessionId) return
  if (!initPromise) {
    initPromise = (async () => {
      await rpcRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mnemonic-ui', version: '0.0.1' },
      })
      await rpcRequest('notifications/initialized', undefined, false)
    })()
  }
  await initPromise
}

export async function callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  await ensureInitialized()
  const result = await rpcRequest('tools/call', { name, arguments: args })
  const structured = (result as { structuredContent?: T })?.structuredContent
  if (structured !== undefined) return structured
  const text = (result as { content?: Array<{ type: string; text?: string }> })?.content?.[0]?.text
  return (text ? JSON.parse(text) : result) as T
}
