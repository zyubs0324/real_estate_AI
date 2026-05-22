import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const E2E_EMAIL = process.env.E2E_EMAIL ?? 'zyubs0324@gmail.com'
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'RealEstate2026!'

export async function ensureDevAccount(request: APIRequestContext) {
  const response = await request.get('/api/dev/setup')
  if (![200, 400].includes(response.status())) {
    throw new Error(`Failed to ensure dev account: ${response.status()} ${await response.text()}`)
  }
}

export async function login(page: Page, request?: APIRequestContext) {
  if (request) {
    const response = await request.get('/api/dev/e2e-login')
    if (!response.ok()) {
      throw new Error(`E2E login failed: ${response.status()} ${await response.text()}`)
    }
    await page.context().addCookies((await request.storageState()).cookies)
  } else {
    await page.goto('/login')
    const email = page.locator('input[type="email"]')
    const password = page.locator('input[type="password"]')
    const submit = page.locator('button[type="submit"]')

    await email.fill(E2E_EMAIL)
    await password.fill(E2E_PASSWORD)
    await expect(email).toHaveValue(E2E_EMAIL)
    await expect(password).toHaveValue(E2E_PASSWORD)
    await submit.click()
    await expect(page).toHaveURL(/\/dashboard$/)
    return
  }

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)
}
