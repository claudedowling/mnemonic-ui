# Exposing a self-hosted mnemonic MCP server via Cloudflare

mnemonic ships as a stdio-only MCP server. To let this browser app (or any browser client) reach it, you need an HTTP bridge in front of it, gated by some form of auth. This is one working way to do that, using Cloudflare Tunnel + Access. It's not the only way — if you use something else, a PR adding an alternative guide (or a different `VaultSource` auth method) is welcome.

Replace `example.com` below with your own domain throughout.

## 1. Bridge stdio to HTTP with supergateway

mnemonic has no native HTTP transport, so wrap it with [supergateway](https://github.com/supercorp-ai/supergateway):

```bash
GEMINI_API_KEY=<key> VAULT_PATH=/path/to/your/mnemonic-vault \
  EMBED_PROVIDER=gemini EMBED_MODEL=gemini-embedding-2 \
  npx -y supergateway --stdio mnemonic \
    --outputTransport streamableHttp --streamableHttpPath /mcp \
    --port 8100 --stateful
```

With `--stateful`, supergateway spawns one mnemonic subprocess per HTTP session (not a shared singleton) — each browser tab is its own writer to the vault. Fine for a single user; a low-probability git `index.lock` race is the only real risk.

## 2. Tunnel + Access application

Standard Cloudflare Tunnel + Zero Trust Access pattern:

- `cloudflared` tunnel publishing a hostname (e.g. `mnemonic.example.com`) to the supergateway port.
- A Cloudflare Access application on that **same** hostname (the tunnel's published route and the Access app both sit on it — there's no separate "-origin" hostname needed).
- An Access policy allowing your own identity (e.g. "Allow, emails ending in `@yourdomain.com`" via Google or another IdP).
- **Cookie settings**: set the Access application's cookie `Same Site Attribute` explicitly to `None` (not left blank) — required for the session cookie to be sent on cross-origin `fetch()` calls from this app if it's hosted on a different hostname than the MCP origin.
- If this app and the MCP origin are on **different hostnames**, put both on the **same, non-`mcp`-type** Access application (add both as domains on one app) rather than giving the MCP origin its own separate app. A `type: mcp` Access application enforces the full MCP OAuth Authorization spec (protected-resource metadata, Bearer tokens) rather than plain cookie auth — a browser `fetch()` client can't satisfy that. A plain Access application just checks the session cookie, which is what this app needs, and sharing one application across both hostnames means logging into either authenticates you for both (the JWT's audience is the *application*, not the hostname).

## 3. CORS — the origin must set it, not just Access

Cloudflare Access's own CORS settings only shape the `OPTIONS` preflight it answers on your behalf; the real `GET`/`POST` response is proxied straight through from your origin and needs its own CORS headers. supergateway's `--cors` flag sets `Access-Control-Allow-Origin` but not `Access-Control-Allow-Credentials` or `Access-Control-Expose-Headers`, both of which a credentialed browser client needs. The simplest fix without patching supergateway: a Cloudflare **Transform Rule** (Rules → Transform Rules → Modify Response Header) on the MCP origin hostname, unconditionally adding, on `/mcp` responses:

```
Access-Control-Allow-Origin: https://<this-app's-hostname>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: content-type,mcp-session-id
Access-Control-Expose-Headers: mcp-session-id
```

The last one matters even though it looks obscure: `Mcp-Session-Id` is a custom response header, and without `Access-Control-Expose-Headers` listing it, browser JS can't read it cross-origin (`Response.headers.get(...)` silently returns `null`) — the session handshake will look like it's failing with "invalid session ID" even though the header is genuinely on the wire.
