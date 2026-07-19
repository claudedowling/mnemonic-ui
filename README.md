# mnemonic-ui

A small PWA for browsing a [mnemonic](https://github.com/danielmarbach/mnemonic) memory vault from a browser — search, tags, related-note navigation, installable on desktop and mobile.

GitHub is the baseline connection, and an MCP server is an optional add-on:

- **GitHub (read-only), always the base.** mnemonic stores each note as a markdown file with YAML frontmatter — under `.mnemonic/notes/` in a project's own repo, or at `notes/` in a standalone global vault repo (both are checked). This app reads those files directly from GitHub with a personal access token — browse your global vault and any project's vault with nothing else to run. Public repos work without a token at all.
- **MCP server, optional.** If you also have a mnemonic MCP server reachable over HTTP (see the [Cloudflare setup guide](docs/cloudflare-mcp-setup.md) for one way to expose a self-hosted instance), adding its URL layers semantic search (`recall`) on top of the same GitHub-backed browsing — it doesn't replace it. By default this searches your global vault; add a local filesystem path next to a project repo in Settings to also get project-scoped semantic search for it (the server resolves project identity from a real path on its own disk, not from a repo name).

## Getting started

1. Open the app and click **Settings**.
2. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with **read-only Contents** access, scoped to the repo(s) holding your vault (your global vault repo, plus any project repos with a `.mnemonic/` folder) — or skip this for a public vault repo.
3. Paste the token (if any); the repo pickers then list repos you have access to, flagging which ones have a detected vault.
4. Pick your global vault repo and any project repos, save.
5. Optionally add an MCP server URL for semantic search.

Everything is stored only in your browser's local storage — nothing is sent anywhere except GitHub's API (and your MCP server, if you configure one).

## Development

```bash
npm install
npm run dev
```

`npm run build` typechecks and produces a static `dist/` — deployable to any static host (Cloudflare Pages, Netlify, GitHub Pages, etc.). No build-time configuration needed; connection details are all set at runtime via the in-app Settings panel.

## Contributing

Other auth methods (GitHub OAuth device flow, a different MCP auth scheme, etc.) are welcome as PRs — the two connection modes are implemented behind a small `VaultSource` interface (`src/lib/vaultSource.ts`), so adding a third is additive rather than a rewrite.
