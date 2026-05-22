import { expect, test } from '@playwright/test'
import { ensureDevAccount, login } from './helpers/auth'

test.describe('CRM imported data', () => {
  test.beforeEach(async ({ page, request }) => {
    await ensureDevAccount(request)
    await login(page, request)
  })

  test('properties list renders imported property rows', async ({ page }) => {
    await page.goto('/properties')

    await expect(page.locator('tbody tr').first()).toBeVisible()
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(100)
  })

  test('properties duplicate filter can be opened from URL', async ({ page }) => {
    await page.goto('/properties?duplicateOnly=1')

    await expect(page.locator('button[aria-pressed="true"]').filter({ hasText: /\uC911\uBCF5 \uC758\uC2EC/ })).toBeVisible()
    await expect(page).toHaveURL(/duplicateOnly=1/)
  })

  test('properties search filter can be opened from URL', async ({ page }) => {
    await page.goto('/properties?q=Needle')

    await expect(page.locator('main input').first()).toHaveValue('Needle')
    await expect(page).toHaveURL(/q=Needle/)
  })

  test('people list renders owner counts from co_ownership', async ({ page }) => {
    await page.goto('/people')

    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('tbody tr button').filter({ hasText: /^[1-9]\d*$/ }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('people owner count opens the filtered properties list', async ({ page }) => {
    await page.goto('/people')
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 })

    const rowIndex = await page.locator('tbody tr').evaluateAll((rows) =>
      rows.findIndex((row) => {
        const button = row.querySelectorAll('td')[5]?.querySelector('button')
        return Number(button?.textContent?.trim() ?? '0') > 0
      })
    )
    expect(rowIndex).toBeGreaterThanOrEqual(0)

    const ownerButton = page.locator('tbody tr').nth(rowIndex).locator('td').nth(5).locator('button')
    await expect(ownerButton).toBeVisible()
    await ownerButton.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    await Promise.all([
      page.waitForURL(/\/properties\?ownerPersonId=/),
      ownerButton.click({ force: true }),
    ])

    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('person detail groups same-unit owned listings by deal type', async ({ page }) => {
    await page.goto('/people/dc853c97-ea7c-4ee8-9163-08ea0eae6e43')

    await expect(page.getByTestId('owned-properties-section')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/등록 2건/).first()).toBeVisible()
    await expect(page.getByText('전세').first()).toBeVisible()
    await expect(page.getByText('반월세').first()).toBeVisible()
  })

  test('agencies list renders handling and co-broker counts', async ({ page }) => {
    await page.goto('/agencies')

    await expect(page.getByText(/한자리/).first()).toBeVisible()
    await expect(page.getByText(/핸들링\s+[1-9]\d*/).first()).toBeVisible()
    await expect(page.getByText(/공동 중개\s+[1-9]\d*/).first()).toBeVisible()
  })

  test('agency co-broker count opens the filtered properties list', async ({ page }) => {
    await page.goto('/agencies')

    const coBrokerButton = page.getByRole('button', { name: /공동 중개\s+[1-9]\d*/ }).first()
    await expect(coBrokerButton).toBeVisible()
    await coBrokerButton.click()

    await expect(page).toHaveURL(/\/properties\?coBrokerAgencyId=/)
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })
})
