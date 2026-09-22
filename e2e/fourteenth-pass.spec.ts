import { expect, test } from '@playwright/test'

test('berth claim and shared restriction remain scoped across navigation', async ({ page }) => {
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST')
  await expect(page.getByLabel('Berth queue')).toContainText('TERM-EAST')
  await page.getByRole('button', { name: 'Claim selected berth call', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('claimed')
  await page.goto('/operations')
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST')
  await expect(page.getByLabel('Berth queue')).toContainText('planner-ravi')
  await page.getByRole('button', { name: 'Toggle linked berth restriction' }).click()
  await expect(page.getByRole('status')).toContainText('related terminals updated')
  await expect(page.getByLabel('Selected terminal')).toContainText('restricted')
  await page.reload()
  await expect(page.getByLabel('Selected terminal')).toContainText('restricted')
  await page.getByLabel('Terminal collection').getByRole('button', { name: 'TERM-WEST' }).click()
  await expect(page.getByLabel('Selected terminal')).toContainText('2 committed calls')
  await expect(page.getByLabel('Selected terminal')).toContainText('available')
})
