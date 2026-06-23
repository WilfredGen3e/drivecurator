import { test, expect } from '@playwright/test'

/**
 * Marketing-screenshots via de dev-only harness (?harness=<view>). Geen login,
 * geen Graph — nep-foto's met ingebouwde thumbnails. Zie src/harness/.
 *
 * Output komt in e2e/screenshots/ (samen met landing.png) voor gebruik op de
 * website. Draaien: `npm run screenshots` of `npx playwright test marketing`.
 */

// Wacht tot de eerste mock-foto echt geladen is, anders schiet je een leeg frame.
async function waitForPhoto(page: import('@playwright/test').Page) {
  const img = page.locator('img[src*="/mock/"]').first()
  await expect(img).toBeVisible()
  await img.evaluate((el: HTMLImageElement) =>
    el.complete ? Promise.resolve() : new Promise((r) => el.addEventListener('load', r, { once: true })),
  )
}

test('triage — desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?harness=triage')
  await waitForPhoto(page)
  await page.screenshot({ path: 'e2e/screenshots/triage-desktop.png' })
})

test('triage — mobiel (touch)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?harness=triage&touch=1')
  await waitForPhoto(page)
  await page.screenshot({ path: 'e2e/screenshots/triage-mobile.png' })
})

test('organize — keuzescherm', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?harness=organize')
  await expect(page.getByText(/handmatig/i).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/organize.png' })
})

test('slim sorteren — dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?harness=smartsort')
  await expect(page.getByText(/kies een categorie/i)).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/smartsort-dashboard.png' })
})

test('slim sorteren — cluster-grid', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?harness=cluster')
  await waitForPhoto(page)
  await page.screenshot({ path: 'e2e/screenshots/smartsort-cluster.png' })
})
