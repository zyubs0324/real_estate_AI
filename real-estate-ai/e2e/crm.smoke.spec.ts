import { expect, test } from '@playwright/test'
import { ensureDevAccount, login } from './helpers/auth'

const protectedRoutes = ['/properties', '/people', '/agencies', '/transactions', '/schedules']

test.describe('CRM protected screens', () => {
  test.beforeEach(async ({ page, request }) => {
    await ensureDevAccount(request)
    await login(page, request)
  })

  for (const route of protectedRoutes) {
    test(`${route} renders inside the app shell`, async ({ page }) => {
      await page.goto(route)

      await expect(page).toHaveURL(new RegExp(`${route}$`))
      await expect(page.locator('aside')).toBeVisible()
      await expect(page.locator(`a[href="${route}"]`)).toBeVisible()
      await expect(page.locator('main')).toBeVisible()
    })
  }
})
