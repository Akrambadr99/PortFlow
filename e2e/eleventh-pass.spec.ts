import { expect, test } from '@playwright/test'

test('supervisor handoff changes who may reschedule an unpublished berth call', async ({ page }) => {
  await page.goto('/terminal/berths/2026-09-14')
  await page.getByLabel('Start hour').fill('14')
  await page.getByRole('button', { name: 'Commit call' }).click()
  await page.getByLabel('Planning actor').selectOption('hazmat supervisor')
  await page.getByLabel('Ownership reason').fill('Supervisor takes ownership of revised berth window.')
  await page.getByRole('button', { name: 'Take ownership' }).click()
  await expect(page.getByText('Owner: hazmat supervisor')).toBeVisible()
  await page.getByLabel('Planning actor').selectOption('terminal planner')
  await expect(page.getByRole('button', { name: 'Delay CALL-43 one hour' })).toBeDisabled()
  await page.getByLabel('Planning actor').selectOption('hazmat supervisor')
  await page.getByRole('button', { name: 'Delay CALL-43 one hour' }).click()
  await expect(page.getByRole('status')).toContainText('rescheduled by one hour')
})
