import { describe, expect, it } from 'vitest'
import type { StoragePort } from '../../workspace/repository'
import { saveCurrentCollection } from '../../workspace/recordStorage'
import { openSelectedRecord } from './selectedRecord'
import { claimTerminalCall, readTerminalCollection, saveTerminalCollection } from './terminalCollection'
import { directAssignHazmat } from './berthWorkload'
import { readPortPlan, savePortPlan, assignBerthCall } from './portPlanLedger'

class MemoryStorage implements StoragePort {
  data = new Map<string, string>()
  fail = false
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, raw: string) { if (this.fail) throw new Error('Storage full'); this.data.set(key, raw) }
}
const edit: (state: ReturnType<typeof readPortPlan>) => ReturnType<typeof readPortPlan> = state => assignBerthCall(state, state.calls[0]?.id ?? '', 'hazmat supervisor', 'hazmat supervisor', 'Qualified hazardous cargo review requested.')
const key = 'portflow:berth-plan:v1'
describe('selected terminal persistence', () => {
  it('enforces cross-terminal planner capacity when claiming from a detail page', () => {
    const storage = new MemoryStorage()
    let collection = readTerminalCollection(storage)
    for (const id of ['TERM-EAST', 'TERM-WEST']) {
      const terminal = collection.terminals.find(item => item.id === id)
      if (!terminal?.plan.calls[0]) throw new Error('Terminal fixture missing')
      collection = claimTerminalCall(collection, id, terminal.plan.calls[0].id, 'planner-ravi', terminal.plan.revision)
    }
    saveTerminalCollection(storage, collection)
    const bound = openSelectedRecord(storage)
    savePortPlan(bound, edit(readPortPlan(bound)))
    const assigned = directAssignHazmat(readPortPlan(bound), 'CALL-41', 'planner-ravi', 'hazmat supervisor', 'Supervisor requests qualified berth planner.')
    expect(() => savePortPlan(bound, assigned)).toThrow('cross-terminal capacity')
    expect(readPortPlan(openSelectedRecord(storage)).berthAssignments?.at(-1)?.assigneeId).toBeNull()
  })
  it('imports legacy history once and retains its original backup', () => {
    const storage = new MemoryStorage()
    const legacy = edit(readPortPlan(storage))
    savePortPlan(storage, legacy)
    const backup = storage.getItem(key)
    const bound = openSelectedRecord(storage)
    expect(readPortPlan(bound)).toEqual(legacy)
    savePortPlan(bound, legacy)
    expect(readTerminalCollection(storage).terminals[0]?.plan).toEqual(legacy)
    expect(storage.getItem(key)).toBe(backup)
    savePortPlan(storage, readPortPlan(new MemoryStorage()))
    expect(readPortPlan(openSelectedRecord(storage))).toEqual(legacy)
  })
  it('persists a domain action and preserves every unrelated record', () => {
    const storage = new MemoryStorage(), before = readTerminalCollection(storage)
    const bound = openSelectedRecord(storage), changed = edit(readPortPlan(bound))
    savePortPlan(bound, changed)
    const after = readTerminalCollection(storage)
    expect(after.terminals[0]?.plan).toEqual(changed)
    expect(after.terminals.slice(1)).toEqual(before.terminals.slice(1))
    expect(readPortPlan(openSelectedRecord(storage))).toEqual(changed)
    expect(after.audit.at(-1)).toMatchObject({ action: 'detail-updated', id: 'TERM-NORTH' })
  })
  it('rejects stale edits without replacing the newer domain state', () => {
    const storage = new MemoryStorage()
    const first = openSelectedRecord(storage), stale = openSelectedRecord(storage)
    const changed = edit(readPortPlan(first))
    savePortPlan(first, changed)
    expect(() => savePortPlan(stale, edit(readPortPlan(stale)))).toThrow('changed in another view')
    expect(readPortPlan(openSelectedRecord(storage))).toEqual(changed)
  })
  it('merges with an unrelated record archive without losing that edit', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readTerminalCollection(storage), peer = before.terminals[1]
    if (!peer) throw new Error('Peer fixture missing')
    const newer = { ...before, terminals: before.terminals.map(item => item.id === peer.id ? { ...item, archived: true } : item) }
    saveTerminalCollection(storage, newer)
    savePortPlan(bound, edit(readPortPlan(bound)))
    expect(readTerminalCollection(storage).terminals[1]).toEqual(newer.terminals[1])
  })
  it('rejects missing and archived targets without writing', () => {
    const storage = new MemoryStorage()
    expect(() => openSelectedRecord(storage, 'missing')).toThrow('not found')
    expect(storage.data.size).toBe(0)
    const before = readTerminalCollection(storage)
    saveTerminalCollection(storage, { ...before, terminals: before.terminals.map(item => ({ ...item, archived: true })) })
    const snapshot = [...storage.data]
    expect(() => openSelectedRecord(storage)).toThrow('archived')
    expect([...storage.data]).toEqual(snapshot)
  })
  it('rejects a record archived after the editor opened', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readTerminalCollection(storage)
    saveTerminalCollection(storage, { ...before, terminals: before.terminals.map(item => ({ ...item, archived: true })) })
    expect(() => savePortPlan(bound, edit(readPortPlan(bound)))).toThrow('changed in another view')
  })
  it('preserves retryability after a recoverable storage failure', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const changed = edit(readPortPlan(bound))
    storage.fail = true
    expect(() => savePortPlan(bound, changed)).toThrow('Storage full')
    storage.fail = false
    savePortPlan(bound, changed)
    expect(readPortPlan(openSelectedRecord(storage))).toEqual(changed)
  })
  it('protects a detail edit against a stale whole-workspace save', () => {
    const storage = new MemoryStorage(), stale = readTerminalCollection(storage)
    const bound = openSelectedRecord(storage)
    savePortPlan(bound, edit(readPortPlan(bound)))
    expect(() => saveCurrentCollection(storage, stale, stale, readTerminalCollection, saveTerminalCollection)).toThrow('Workspace changed')
    expect(readTerminalCollection(storage).terminals[0]?.plan).not.toEqual(stale.terminals[0]?.plan)
  })
})
