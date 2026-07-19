import { test, expect } from '@playwright/test'

// Seeds settings directly into localStorage so the test doesn't depend on a
// GitHub PAT secret — the public claudedowling/mnemonic-ui repo's own vault
// notes are readable unauthenticated.
const SETTINGS = {
  connectionMode: 'github',
  githubPat: '',
  githubVaultRepo: 'claudedowling/mnemonic-ui',
  githubProjectRepos: [],
  mcpUrl: '',
}

test.beforeEach(async ({ page }) => {
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
