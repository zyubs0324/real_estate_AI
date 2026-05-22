import { expect, test } from '@playwright/test'
import { ensureDevAccount, login } from './helpers/auth'

const jusoResult = {
  roadAddr: '서울특별시 성동구 옥수로 100',
  roadAddrPart1: '서울특별시 성동구 옥수로 100',
  jibunAddr: '서울특별시 성동구 옥수동 123-45',
  zipNo: '04631',
  admCd: '1120010200',
  rnMgtSn: '112004103006',
  bdMgtSn: '1120010200101230045000000',
  detBdNmList: '101동',
  bdNm: '옥수하이츠',
  bdKdcd: '0',
  siNm: '서울특별시',
  sggNm: '성동구',
  emdNm: '옥수동',
  liNm: '',
  rn: '옥수로',
  udrtYn: '0',
  buldMnnm: 100,
  buldSlno: 0,
  mtYn: '0',
  lnbrMnnm: 123,
  lnbrSlno: 45,
  emdNo: '01',
}

test.describe('dashboard quick address search', () => {
  test.beforeEach(async ({ page, request }) => {
    await ensureDevAccount(request)
    await login(page, request)
  })

  test('selects an address even when bdKdcd differs from the selected property type', async ({ page }) => {
    await page.route('**/api/juso?**', async (route) => {
      await route.fulfill({ json: [jusoResult] })
    })
    await page.route('**/api/building-units?**', async (route) => {
      await route.fulfill({
        json: {
          units: [
            { dongNm: '101동', flrNo: '12', ho: '1201호', area: 84.5 },
          ],
        },
      })
    })
    await page.route('**/api/property-data?**', async (route) => {
      await route.fulfill({
        json: {
          building: null,
          registry: null,
          vworld: null,
          deals: [],
        },
      })
    })

    await page.goto('/dashboard')

    const input = page.locator('input[aria-autocomplete="list"]').first()
    await input.fill('옥수')

    const option = page.getByRole('option').filter({ hasText: jusoResult.roadAddr }).first()
    await expect(option).toBeVisible()
    await option.click()

    await expect(page.getByText('101동')).toBeVisible()
    await expect(page.getByRole('button', { name: '매물로 등록' })).toBeVisible()
    await expect(page.getByRole('button', { name: /상세 진단 보기/ })).toBeVisible()
  })
})
