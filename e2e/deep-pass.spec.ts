import { expect, test } from '@playwright/test'
test('berth board resolves conflicts before committing a call', async ({ page }) => {
  await page.goto('/terminal/berths/2026-09-14')
  await expect(page.getByText('Berth conflicts with Aurora.')).toBeVisible()
  await page.getByLabel('Start hour').fill('14')
  await page.getByRole('button', { name: 'Commit call' }).click()
  await expect(page.getByRole('status')).toContainText('Meridian plan committed')
})
