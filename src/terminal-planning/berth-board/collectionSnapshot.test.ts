import { describe, expect, it } from 'vitest'
import { compareCollectionSnapshot, createCollectionSnapshot } from '../../workspace/collectionSnapshot'
import { collectionSnapshotAdapter as adapter } from './collectionSnapshot'
import { seedTerminalCollection, setRestriction } from './terminalCollection'
import { initialPortPlan } from './portPlanLedger'

const key = 'portflow:terminal-collection:v1'
const seed = seedTerminalCollection()
function storage(entries: [string, string][] = [[key, JSON.stringify(seed)]]) {
  const values = new Map(entries), writes: string[] = []
  return { values, writes, getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, raw: string) => { writes.push(name); values.set(name, raw) } }
}
function snapshot(payload: unknown) {
  return JSON.stringify({ format: 'collection-snapshot', version: 1, product: 'PortFlow',
    scope: 'terminal-collection', createdAt: '2026-09-30T12:00:00.000Z', payload })
}

describe('PortFlow collection snapshot adapter', () => {
  it('exports the complete validated domain collection and compares it without writes', () => {
    const port = storage(), before = new Map(port.values)
    const raw = createCollectionSnapshot(adapter, port, '2026-09-30T12:00:00.000Z')
    expect(JSON.parse(raw)).toMatchObject({ product: 'PortFlow', scope: 'terminal-collection', payload: seed })
    const comparison = compareCollectionSnapshot(raw, adapter, port)
    expect(comparison.payloadChanged).toBe(false)
    expect(comparison.rows.every(row => row.status === 'unchanged')).toBe(true)
    expect(adapter.groups(seed).map(group => group.key)).toEqual(['terminals', 'restrictions'])
    expect(adapter.groups(seed).flatMap(group => group.records).map(record => record.id)).toContain('BERTH-B04')
    expect(port.values).toEqual(before)
    expect(port.writes).toEqual([])
  })

  it.each([
    ['malformed nested evidence', { ...seed, terminals: [{ ...seed.terminals[0], plan: { ...seed.terminals[0]!.plan, revision: -1 } }] }],
    ['duplicate primary identities', { ...seed, terminals: [...seed.terminals, seed.terminals[0]] }],
    ['duplicate related identities', { ...seed, restrictions: [...seed.restrictions, seed.restrictions[0]] }],
  ])('rejects %s without changing the current collection', (_name, payload) => {
    const port = storage(), before = new Map(port.values)
    expect(() => compareCollectionSnapshot(snapshot(payload), adapter, port)).toThrow()
    expect(port.values).toEqual(before)
    expect(port.writes).toEqual([])
  })

  it('compares a genuine linked domain transition including its related source record', () => {
    const changed = setRestriction(seed, 'BERTH-B04', true, 1).collection, port = storage()
    const comparison = compareCollectionSnapshot(snapshot(changed), adapter, port)
    expect(comparison.payloadChanged).toBe(true)
    expect(comparison.rows.filter(row => row.status === 'changed').length).toBeGreaterThanOrEqual(2)
    expect(comparison.rows.find(row => row.id === 'BERTH-B04')?.status).toBe('changed')
    expect(adapter.validate(changed)).toBe(changed)
    expect(port.values.get(key)).toBe(JSON.stringify(seed))
    expect(port.writes).toEqual([])
  })

  it('detects collection history and metadata changes without inventing duplicate audit rows', () => {
    const payload = { ...seed, audit: [{ action: 'reviewed', id: 'TERM-NORTH', related: [] }, { action: 'reviewed', id: 'TERM-NORTH', related: [] }], reviewMetadata: { note: 'Retain collection history' } }, port = storage()
    const comparison = compareCollectionSnapshot(snapshot(payload), adapter, port)
    expect(comparison.payloadChanged).toBe(true)
    expect(comparison.rows.every(row => row.status === 'unchanged')).toBe(true)
    expect(adapter.groups(payload)).toHaveLength(2)
    expect(adapter.validate(payload)).toBe(payload)
    expect(port.writes).toEqual([])
  })

  it('exports a valid optional-field legacy read without materializing or modifying storage', () => {
    const legacyRaw = JSON.stringify({ ...initialPortPlan, berthAssignments: undefined })
    const port = storage([['portflow:berth-plan:v1', legacyRaw], ['unrelated:fixture', 'retained']])
    const before = new Map(port.values)
    const raw = createCollectionSnapshot(adapter, port, '2026-09-30T12:00:00.000Z')
    expect(compareCollectionSnapshot(raw, adapter, port).payloadChanged).toBe(false)
    expect(port.values).toEqual(before)
    expect(port.values.has(key)).toBe(false)
    expect(port.writes).toEqual([])
  })
})
