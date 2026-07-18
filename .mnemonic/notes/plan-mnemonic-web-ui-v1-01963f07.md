---
title: 'Plan: mnemonic web UI v1'
tags:
  - workflow
  - plan
  - mnemonic
  - ui
lifecycle: temporary
createdAt: '2026-07-18T00:07:22.686Z'
updatedAt: '2026-07-18T09:18:15.341Z'
role: plan
alwaysLoad: false
project: https-github-com-claudedowling-mnemonic-ui
projectName: mnemonic-ui
relatedTo:
  - id: request-mnemonic-web-ui-read-write-pwa-via-mcp-1a8ce379
    type: related-to
  - id: research-mnemonic-ui-approach-decisions-and-constraints-from-492cbaf2
    type: related-to
memoryVersion: 1
---
Executable plan for v1 of the mnemonic web UI. Supersede or update this note if the plan changes materially.

## Phase 0 — Settle the transport questions (before code)

**Decided (2026-07-18):** the mnemonic MCP origin (`mnemonic.dowling.nz`) is confirmed to be both the tunnel's published route and the Access application hostname on the same hostname — no separate `-origin` hostname exists (corrected in \[\[mnemonic-stdio-http-bridge-for-claude-ai-proven-supergateway-5ed9f7b1]]). Because of this, the PWA cannot share that hostname. **The PWA will be hosted at its own new Access application: `notes.dowling.nz`** (unused, verified free via DNS lookup), specifically so different WAF rules can be applied to it than to the MCP origin.

1. Decide direct-to-origin vs via-portal. Working assumption: direct to the mnemonic origin hostname (e.g. `mnemonic-origin.dowling.nz`) — the portal's tool\_search indirection adds nothing for a purpose-built client. Requires the UI to be served from that same hostname or an Access-shared origin.
2. Verify from the mnemonic/supergateway setup: session handshake (`initialize` → session id → `notifications/initialized`), whether POST-only works without a GET event stream, and session lifetime behaviour for a long-lived browser tab.
3. Confirm CORS is a non-issue by serving the SPA from the same hostname as the MCP endpoint.

## Phase 1 — Read-only UI

Design: consult \[\[frontend-design skill]] for distinctive, intentional visual direction (typography, aesthetic, avoid templated defaults).

1. Scaffold React + Vite + vite-plugin-pwa. Minimal shell: note list, note view, search box.
2. MCP client module: fetch-based JSON-RPC, session handling, and Access-expiry detection (non-JSON or redirect response → show re-auth action).
3. Wire `recall` (search), `list` (browse by tag/scope), `get` (full note render as markdown), `recent_memories` (home screen).
4. PWA install + test on Pixel 6 Pro. Set Access session duration long on the application.

## Phase 2 — Writes

1. Edit flow: `get` → edit markdown in a textarea/editor → re-read for fresh `if_version` → `update` (full content for v1; `semanticPatch` later if wanted).
2. Create flow: `recall` first for dupes (show matches before allowing create), then `remember` with title/tags/lifecycle/role fields.
3. Delete flow: `get` for version → confirm → `forget`.
4. Surface tool-result errors verbatim (lint failures, version conflicts). On version conflict, show server-returned current content for manual merge.

## Phase 3 — Nice-to-haves (only if wanted after use)

- `memory_graph` visualisation
- relate/unrelate from the note view
- offline note cache

## Validation gates

**Phase 1 status (2026-07-18): DONE.** Read-only browsing (search, note list, note view) confirmed working end-to-end in a live browser at `notes.dowling.nz` against the mnemonic MCP origin. Final working configuration:

- **Hostname split:** PWA at `notes.dowling.nz`, MCP origin traffic routed through `mnemonic-mcp.dowling.nz` (a new tunnel route to the same origin service), kept separate from `mnemonic.dowling.nz` (used by claude.ai's connector via the `mcp`-typed Access app, which enforces the MCP OAuth/Bearer flow and is incompatible with plain cookie-based browser fetch).
- **Access application:** `mnemonic-mcp.dowling.nz` was merged in as an additional domain on the same (non-`mcp`-type) Access application as `notes.dowling.nz`, rather than kept as its own standalone app. This was necessary, not just simpler — a `type: mcp` Access app enforces the MCP Authorization spec (OAuth, Bearer tokens), which a plain browser client can't satisfy; the merged plain-type app uses ordinary cookie-session auth, and since both hostnames share one Access application, the `CF_Authorization` JWT minted for either hostname is valid for both.
- **CORS Transform Rule** on `mnemonic-mcp.dowling.nz` (Rules → Transform Rules → Modify Response Header), unconditionally on `/mcp` responses, setting all four:
  - `Access-Control-Allow-Origin: https://notes.dowling.nz`
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Headers: content-type,mcp-session-id`
  - `Access-Control-Expose-Headers: mcp-session-id`
    (Needed because supergateway's own CORS handling doesn't set credentials or expose headers — see \[\[mnemonic-stdio-http-bridge-for-claude-ai-proven-supergateway-5ed9f7b1]].)
- **Access application cookie settings:** `Same Site Attribute` set explicitly to `None` (not left blank) to guarantee the session cookie is sent on cross-origin requests from `notes.dowling.nz`.
- **Client-side fix:** `src/mcp/client.ts`'s Access-expiry detection was a content-type allowlist that misfired on the legitimate `202 text/plain` response to the fire-and-forget `notifications/initialized` call. Fixed to a `text/html` denylist instead (see commit `4ef0d16`).

- Phase 0 answers recorded before Phase 1 starts. **Status (2026-07-18): done.** Origin hostname confirmed (`mnemonic.dowling.nz`, same as Access app), POST-only handshake verified live (see \[\[research-mnemonic-ui-approach-decisions-and-constraints-from-492cbaf2]]), PWA hostname decided (`notes.dowling.nz`). Session lifetime deferred as non-blocking (controllable via Access session duration). **Proceeding to Phase 1.**

- Phase 0 answers recorded before Phase 1 starts. **Status (2026-07-18): mostly done** — origin hostname confirmed (`mnemonic.dowling.nz`, same as Access app), POST-only handshake verified live (see \[\[research-mnemonic-ui-approach-decisions-and-constraints-from-492cbaf2]]), PWA hostname decided (`notes.dowling.nz`). Only remaining open item: session lifetime under a long-lived tab, untested.

- Phase 1 done = browse/search/read working on both PC and Pixel through Access.

- Phase 2 done = a full edit round-trip lands as a git commit in the vault with refreshed embedding, verified via a Claude session recalling the edited content.
