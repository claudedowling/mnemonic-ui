---
title: >-
  Research: mnemonic UI approach — decisions and constraints from initial design
  discussion
tags:
  - workflow
  - research
  - mnemonic
  - ui
lifecycle: temporary
createdAt: '2026-07-18T00:06:45.410Z'
updatedAt: '2026-07-18T02:08:39.325Z'
role: research
alwaysLoad: false
project: https-github-com-claudedowling-mnemonic-ui
projectName: mnemonic-ui
relatedTo:
  - id: request-mnemonic-web-ui-read-write-pwa-via-mcp-1a8ce379
    type: related-to
  - id: plan-mnemonic-web-ui-v1-01963f07
    type: related-to
memoryVersion: 1
---
Findings and decisions from the 2026-07-18 design conversation for the mnemonic web UI.

## Approach chosen

Tier 2 expanded to writes: a web UI that is an MCP client, calling the mnemonic server's own tools (`list`, `recall`, `get`, `memory_graph` for read; `remember`, `update`, `forget` for write). Rationale: all write-path invariants (lint, embedding refresh, git commit, dedup, versioning) live in the server, so the UI inherits them instead of re-implementing them. MCP is JSON-RPC over streamable HTTP, callable from a browser with fetch.

Rejected: direct filesystem/Obsidian editing (bypasses embedding refresh and git flow, safe read-only at best) and a custom CRUD API (re-implements server invariants).

## Decisions

- **Stack:** React + Vite PWA, installable on the Pixel. Hosted same-origin with the MCP endpoint (Cloudflare Pages/Worker or served from the same hostname) to get cookie auth and avoid CORS.
- **Auth:** Cloudflare Access session cookie, same pattern as the rest of the portal estate. No service token in client-side code (extractable).
- **Versioning:** no expected concurrent writes (single user). Strategy: re-read just before write and merge if changed, using the `if_version` token from that read.
- **Errors:** single user, no need to soften; surface mnemonic's lint failures and version conflicts verbatim. Anticipate error shapes from the mnemonic source.

## Constraints and known risks

- **Access session expiry in a standalone PWA:** fetch to the MCP endpoint gets a 302 to the Access login flow, arriving as HTML-where-JSON-expected or a CORS failure. UI must detect this and offer a re-auth action (open in browser tab). Mitigate with long Access session duration (up to a month). Inferred from Access behaviour, not yet tested in a PWA.
- **Transport/bridge:** mnemonic is stdio-only; HTTP access goes through supergateway (`--stateful`, one mnemonic subprocess per HTTP session — see \[\[mnemonic-stdio-http-bridge-for-claude-ai-proven-supergateway-5ed9f7b1]]). The UI is another concurrent session/writer alongside Claude sessions; git index.lock races are the known low-probability risk.
- **Offline:** service worker caches app shell only. Data and recall are server-side (embeddings). Offline note caching is a possible later feature, not v1.
- **Hostname/Access setup** follows the established two-policy portal pattern in \[\[cloudflare-mcp-server-portal-exposes-home-mcp-servers-to-cla-7cc64365]], though a browser UI may hit the MCP origin directly rather than via the portal — to be settled in planning.

## Open questions

**Resolved (2026-07-18), tested live against `mnemonic.dowling.nz` via `cloudflared access curl`:**

- **Direct-to-origin vs via-portal:** moot for transport testing — the origin is directly reachable and Access-gated on its own hostname; confirmed direct-to-origin works end-to-end.
- **Session handshake:** `initialize` (POST) returns a session id via the `mcp-session-id` response header, with the result delivered as a single `text/event-stream`-formatted chunk on that same POST response (not a held-open stream).
- **POST-only vs GET stream:** POST-only works. After sending `notifications/initialized` and passing `Mcp-Session-Id` on subsequent requests, `tools/list` succeeded via plain POST with no GET stream ever opened. The UI does not need to hold a persistent GET connection for basic read/write calls.
- **GET behaviour:** a bare `GET /mcp` with `Accept: text/event-stream` blocks indefinitely (tested to 2 minutes without returning) — it opens a genuine long-lived stream, evidently for optional server-push notifications, not required for normal operation.
- **Still open:** session lifetime under a long-lived browser tab. Not yet tested (needs a time-gapped retest of `tools/list` with the same session id). Plan: revisit if the deployed UI starts hitting unexpected 401s, or test explicitly before Phase 1 sign-off.
