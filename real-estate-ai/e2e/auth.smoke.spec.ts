import { expect, test } from '@playwright/test'
import { ensureDevAccount, login } from './helpers/auth'

test('current development account can sign in', async ({ page, request }) => {
  await ensureDevAccount(request)
  await login(page, request)

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('main')).toBeVisible()
})
