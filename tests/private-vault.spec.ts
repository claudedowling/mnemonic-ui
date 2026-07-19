import { test, expect } from '@playwright/test'

// Verifies the private-repo path: a real PAT (injected via the
// MNEMONIC_TEST_PAT env var, never hard-coded) reading a private vault repo.
// Skipped when no token is available (e.g. local dev without the secret).
const PAT = process.env.MNEMONIC_TEST_PAT

test.skip(!PAT, 'MNEMONIC_TEST_PAT not set — skipping private vault test')

test('reads notes from a private vault repo with a PAT', async ({ page }) => {
  await page.addInitScript(
    ([pat]) => {
      window.localStorage.setItem(
        'mnemonic-ui:settings',
        JSON.stringify({
          connectionMode: 'github',
          githubPat: pat,
          githubVaultRepo: 'claudedowling/mnemonic-vault',
          githubProjectRepos: [],
          mcpUrl: '',
        }),
      )
    },
    [PAT],
  )

  await page.goto('/')
  const firstNote = page.locator('.note-list-item').first()
  await expect(firstNote).toBeVisible()
})
