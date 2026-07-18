---
title: 'Plan: mnemonic web UI v1'
tags:
  - workflow
  - plan
  - mnemonic
  - ui
lifecycle: temporary
createdAt: '2026-07-18T00:07:22.686Z'
updatedAt: '2026-07-18T01:28:45.053Z'
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

- Phase 0 answers recorded before Phase 1 starts.
- Phase 1 done = browse/search/read working on both PC and Pixel through Access.
- Phase 2 done = a full edit round-trip lands as a git commit in the vault with refreshed embedding, verified via a Claude session recalling the edited content.
