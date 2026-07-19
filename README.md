# mnemonic-ui

A small PWA for browsing a [mnemonic](https://github.com/danielmarbach/mnemonic) memory vault from a browser — search, tags, related-note navigation, installable on desktop and mobile.

It works two ways:

- **GitHub (read-only), no server required.** mnemonic stores each note as a markdown file with YAML frontmatter under `.mnemonic/notes/` in a git repo. This app can read those files directly from GitHub with a personal access token — browse your global vault and any project's vault with nothing else to run.
- **MCP server connection.** If you also have a mnemonic MCP server reachable over HTTP (see the [Cloudflare setup guide](docs/cloudflare-mcp-setup.md) for one way to expose a self-hosted instance), connecting to it adds semantic search (`recall`) on top of the same browsing UI.

## Getting started

1. Open the app and click **Settings**.
2. Pick **GitHub (read-only)**.
3. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with **read-only Contents** access, scoped to the repo(s) holding your vault (your global vault repo, plus any project repos with a `.mnemonic/` folder).
4. Paste the token, enter the repo(s), save.

Everything is stored only in your browser's local storage — nothing is sent anywhere except GitHub's API (and your MCP server, if you configure one).

## Development

```bash
npm install
npm run dev
```

`npm run build` typechecks and produces a static `dist/` — deployable to any static host (Cloudflare Pages, Netlify, GitHub Pages, etc.). No build-time configuration needed; connection details are all set at runtime via the in-app Settings panel.

## Contributing

Other auth methods (GitHub OAuth device flow, a different MCP auth scheme, etc.) are welcome as PRs — the two connection modes are implemented behind a small `VaultSource` interface (`src/lib/vaultSource.ts`), so adding a third is additive rather than a rewrite.
