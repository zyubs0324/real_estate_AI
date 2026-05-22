import { expect, test } from '@playwright/test'

test('login page renders the public authentication form', async ({ page }) => {
  await page.goto('/login')

  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})
