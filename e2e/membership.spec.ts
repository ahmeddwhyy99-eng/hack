import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { SqliteAuthStore } from '../server/auth/store'
for (const width of [320, 375, 1280]) {
  test(`separate-site registration, consent, membership and logout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text()) })
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const email = `browser-${randomUUID()}@example.test`
    await page.goto('/')
    await fits()
    await page.getByRole('link', { name: 'Log in with Identity service' }).click()
    await expect(page).toHaveURL('http://localhost:3101/auth/login')
    await page.getByRole('link', { name: 'Create an account' }).click()
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('browser-test-password-only')
    await fits()
    await page.getByRole('button', { name: 'Register', exact: true }).click()
    await page.getByRole('link', { name: 'Log in', exact: true }).click()
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('browser-test-password-only')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Approve membership access' })).toBeVisible()
    await fits()
    await page.screenshot({ path: testInfo.outputPath('consent.png'), fullPage: true })
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(page).toHaveURL('http://localhost:4100/protected')
    await expect(page.getByRole('heading', { name: 'Active membership required' })).toBeVisible()
    const db = new SqliteAuthStore('.data/e2e.sqlite')
    try {
      await db.membership(email, true)
      await page.getByRole('link', { name: 'Check membership again' }).click()
      await expect(page.getByRole('heading', { name: 'Member access granted' })).toBeVisible()
      await expect(page.getByText(email)).toHaveCount(0)
      await fits()
      await page.screenshot({ path: testInfo.outputPath('protected.png'), fullPage: true })
      await db.membership(email, false)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Active membership required' })).toBeVisible()
      await page.getByRole('button', { name: 'Log out of MemberSpace' }).click()
      await expect(page.getByRole('heading', { name: 'Logged out', exact: true })).toBeVisible()
      await page.goto('/protected')
      await expect(page.getByRole('heading', { name: 'Login required or session expired' })).toBeVisible()
      expect(errors).toEqual([])
    } finally { db.db.close() }
  })
}
