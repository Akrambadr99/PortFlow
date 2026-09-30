import { expect, test } from '@playwright/test'

test('terminal triage deep links survive reload and browser history', async ({ page }) => {
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST&q=Aurora&sort=id-desc&size=5')
  await expect(page.getByLabel('Search terminal or vessel')).toHaveValue('Aurora')
  await expect(page.getByLabel('Sort terminal or vessel')).toHaveValue('id-desc')
  await expect(page.getByLabel('Collection pages')).toContainText('3 matching records')
  await page.reload()
  await page.getByLabel('Work state').selectOption('hazmat')
  await expect(page.getByLabel('Collection pages')).toContainText('2 matching records')
  await page.goBack()
  await expect(page.getByLabel('Work state')).toHaveValue('all')
  await expect(page.getByLabel('Selected terminal', { exact: true })).toContainText('TERM-EAST')
  await page.goForward()
  await expect(page.getByLabel('Work state')).toHaveValue('hazmat')
})

test('berth detail and decision workflows restore filters and selected call', async ({ page }) => {
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST&call=CALL-42-E&q=B05&state=hazmat&sort=revision-desc&size=5&source=handoff')
  for (const name of ['Open record details', 'Open decision workflow']) {
    await page.getByRole('link', { name }).click()
    await expect(page.getByLabel('Selected record context')).toContainText('TERM-EAST')
    await page.reload()
    await page.getByRole('link', { name: 'Back to workspace' }).click()
    await expect(page.getByLabel('Search terminal or vessel')).toHaveValue('B05')
    await expect(page.getByLabel('Work state')).toHaveValue('hazmat')
    await expect(page.getByLabel('Sort terminal or vessel')).toHaveValue('revision-desc')
    await expect(page).toHaveURL(/call=CALL-42-E/)
    await expect(page).toHaveURL(/source=handoff/)
    await expect(page.getByLabel('Selected terminal', { exact: true }).getByRole('button', { name: /Seabird/ })).toHaveAttribute('aria-current', 'true')
  }
})

test('berth-call selection remains explicit across terminals and hidden views', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST')
  await page.getByRole('button', { name: 'Select this page' }).click()
  await page.getByLabel('Terminal collection').getByRole('button', { name: 'TERM-WEST', exact: true }).click()
  await expect(page.getByLabel('Bulk selection')).toContainText('2 berth calls selected · 2 outside this page')
  await page.getByRole('button', { name: 'Select this page' }).click()
  await expect(page.getByLabel('Bulk selection')).toContainText('4 berth calls selected · 2 outside this page')
  await page.getByLabel('Search terminal or vessel').fill('TERM-EAST')
  await expect(page.getByLabel('Bulk selection')).toContainText('4 berth calls selected · 4 outside this page')
  await expect(page.getByLabel('Selected terminal', { exact: true })).toContainText('outside this collection page or view')
  await expect(page.getByRole('button', { name: 'Select this page' })).toBeDisabled()
  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect(page.getByLabel('Bulk selection')).toContainText('4 berth calls selected · 2 outside this page')
  await page.screenshot({ path: '../UI_SCREENSHOTS/sixteenth-PortFlow-triage.png', fullPage: true })
  await page.getByRole('button', { name: 'Clear selection' }).click()
  await expect(page.getByRole('button', { name: 'Claim selected berth calls', exact: true })).toBeDisabled()
})

test('expanded terminal boards page deterministically and clamp after filtering', async ({ page }) => {
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST')
  await page.getByRole('button', { name: 'Claim selected berth call', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('claimed')
  await page.evaluate(() => {
    const key = 'portflow:terminal-collection:v1'
    const storage = (globalThis as unknown as { localStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void } }).localStorage
    const state = JSON.parse(storage.getItem(key) ?? '{}') as {
      terminals: { id: string; plan: { calls: { id: string }[]; berthAssignments: unknown[] }; restrictedCallIds: string[]; archived: boolean }[]
    }
    const source = state.terminals[0]
    if (!source) throw new Error('Persisted terminal fixture is missing')
    for (let index = 1; index <= 8; index++) state.terminals.push({ ...source, id: `TERM-EXTRA-0${String(index)}`,
      plan: { ...source.plan, calls: source.plan.calls.map(call => ({ ...call, id: `${call.id}-X${String(index)}` })), berthAssignments: [] },
      restrictedCallIds: [], archived: false })
    storage.setItem(key, JSON.stringify(state))
  })
  await page.goto('/terminal/berth-workspace?terminal=TERM-EAST&size=5')
  await expect(page.getByLabel('Collection pages')).toContainText('11 matching records · Page 1 of 3')
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByLabel('Terminal collection').getByRole('button', { name: 'TERM-WEST', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Collection pages')).toContainText('Page 3 of 3')
  await page.getByLabel('Search terminal or vessel').fill('TERM-EAST')
  await expect(page.getByLabel('Collection pages')).toContainText('1 matching records · Page 1 of 1')
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  await expect(page.getByLabel('Selected terminal', { exact: true })).toContainText('TERM-EAST')
})
