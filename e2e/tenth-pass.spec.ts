import { expect, test } from '@playwright/test'

test('berth rescheduling recalculates delay but published recovery blocks another edit', async ({ page }) => {
  await page.goto('/terminal/berths/2026-09-14')
  await page.getByLabel('Start hour').fill('14')
  await page.getByRole('button', { name: 'Commit call' }).click()
  await page.getByRole('button', { name: 'Delay CALL-43 one hour' }).click()
  await page.goto('/terminal/vessels/CALL-43/demurrage?delay=2')
  await expect(page.getByText('Effective delay 7 h')).toBeVisible()
  await page.getByLabel('Decision authority').selectOption('commercial manager')
  await page.getByRole('button', { name: 'Publish recovery scenario' }).click()
  await page.goto('/terminal/berths/2026-09-14')
  await page.getByRole('button', { name: 'Delay CALL-43 one hour' }).click()
  await expect(page.getByRole('status')).toContainText('Published recovery depends')
})
