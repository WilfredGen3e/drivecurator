import { test, expect } from '@playwright/test'

/**
 * Landingspagina — geen login nodig (App toont LandingPage zolang je niet
 * bent ingelogd). Dit is meteen de marketing-pagina, dus de screenshot is
 * bruikbaar voor de website én dient als eerste e2e-rooktest.
 */
test('landingspagina rendert en levert marketing-screenshot', async ({ page }) => {
  await page.goto('/')

  // Wacht tot de hero-kop zichtbaar is — bewijst dat de app gebouwd is en draait.
  await expect(
    page.getByRole('heading', { name: /Je OneDrive staat vol/i }),
  ).toBeVisible()

  // De "Beginnen met Microsoft"-knop hoort er te staan (komt meermaals voor).
  await expect(
    page.getByRole('button', { name: /beginnen met microsoft/i }).first(),
  ).toBeVisible()

  // Volledige pagina-screenshot voor de website.
  await page.screenshot({
    path: 'e2e/screenshots/landing.png',
    fullPage: true,
  })
})
