import { test, expect } from '@playwright/test'

// Seeds settings directly into localStorage. Uses MNEMONIC_TEST_PAT when
// available (CI) to stay off GitHub's 60 req/hr unauthenticated rate limit,
// which is shared across the whole GitHub Actions runner IP pool and gets
// exhausted quickly; falls back to unauthenticated for local dev, since
// mnemonic-ui's own vault notes are public either way.
const SETTINGS = {
  githubPat: process.env.MNEMONIC_TEST_PAT ?? '',
  githubVaultRepo: 'claudedowling/mnemonic-ui',
  githubProjectRepos: [],
  projectRepoPaths: {},
  mcpUrl: '',
}

test.beforeEach(async ({ page }) => {
  page.on('response', (res) => {
    if (res.url().includes('api.github.com') && !res.ok()) {
      console.log('GITHUB API ERROR', res.status(), res.url())
    }
  })
  await page.addInitScript((settings) => {
    window.localStorage.setItem('mnemonic-ui:settings', JSON.stringify(settings))
  }, SETTINGS)
})

test('lists notes and opens one', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()

  const firstNote = page.locator('.note-list-item').first()
  await expect(firstNote).toBeVisible()
  await firstNote.click()

  await expect(page.locator('.note-view')).toBeVisible()
})

test('filters by tag', async ({ page }) => {
  await page.goto('/')
  const tagPill = page.locator('.tag-filter-pill').first()
  await expect(tagPill).toBeVisible()
  await tagPill.click()
  await expect(tagPill).toHaveClass(/active/)
})
