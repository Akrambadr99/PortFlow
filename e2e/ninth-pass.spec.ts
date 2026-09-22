import { expect, test } from '@playwright/test'

test('committed berth window changes demurrage and protects published recovery', async ({ page }) => {
  await page.goto('/terminal/vessels/CALL-43/demurrage?delay=2')
  await page.getByLabel('Decision authority').selectOption('commercial manager')
  await expect(page.getByRole('button', { name: 'Publish recovery scenario' })).toBeDisabled()
  await page.goto('/terminal/berths/2026-09-14')
  await page.getByLabel('Start hour').fill('14')
  await page.getByRole('button', { name: 'Commit call' }).click()
  await page.goto('/terminal/vessels/CALL-43/demurrage?delay=2')
  await expect(page.getByText('Effective delay 6 h')).toBeVisible()
  await page.getByLabel('Decision authority').selectOption('commercial manager')
  await page.getByRole('button', { name: 'Publish recovery scenario' }).click()
  await page.goto('/terminal/berths/2026-09-14')
  await page.getByRole('button', { name: 'Cancel CALL-43' }).click()
  await expect(page.getByRole('status')).toContainText('Published recovery depends')
})
