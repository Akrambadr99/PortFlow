import { describe, expect, it, vi } from 'vitest'
import { StoredDataError } from '../../workspace/storageValidation'
import { terminalCollectionRule } from './collectionValidation'
import { cancelCall, initialPortPlan, reassignCall } from './portPlanLedger'
import { readTerminalCollection, saveTerminalCollection, seedTerminalCollection, setRestriction, terminalById } from './terminalCollection'

const key = 'portflow:terminal-collection:v1'
const legacyKey = 'portflow:berth-plan:v1'
function storage(entries: [string, string][] = []) {
  const values = new Map(entries)
  return { values, getItem: (id: string) => values.get(id) ?? null,
    setItem: vi.fn((id: string, raw: string) => { values.set(id, raw) }) }
}
function changed(path: string, value: unknown) {
  const collection = structuredClone(seedTerminalCollection())
  const segments = path.split('.'); const field = segments.pop()
  if (!field) throw new Error('A fixture path is required.')
  let parent: unknown = collection
  for (const segment of segments) parent = (parent as Record<string, unknown>)[segment]
  ;(parent as Record<string, unknown>)[field] = value
  return collection
}

describe('terminal collection storage integrity', () => {
  it.each([
    ['terminals.0', null], ['terminals.0.plan', null], ['terminals.1.plan.berthAssignments.0', null],
    ['terminals.1.plan.berthAssignments', {}], ['terminals.1.plan.berthAssignments.0.status', 'PRIVATE-INVALID-STATE'],
    ['terminals.1.plan.berthAssignments.0.assigneeId', 42], ['terminals.1.plan.berthAssignments.0.reason', null],
    ['terminals.1.plan.berthAssignments.0.sourceRevision', -1], ['terminals.0.plan.revision', 0.5],
    ['terminals.0.plan.calls.0', null], ['terminals.0.plan.calls.0.hazardous', 'false'],
    ['terminals.0.plan.calls.0.start', '8'], ['terminals.0.plan.calls.0.moves', null],
    ['terminals.0.plan.callOwners', null], ['terminals.0.plan.callOwners.PRIVATE-CALL-ID', false],
    ['terminals.0.plan.recoveryFor', [null]], ['terminals.1.plan.history.0', null],
    ['terminals.1.plan.history.0.actor', false], ['terminals.0.archived', null], ['terminals.0.restrictedCallIds', [false]],
    ['restrictions.0', null], ['restrictions.0.active', 'false'], ['restrictions.0.callRefs.0', null],
    ['restrictions.0.callRefs.0.terminalId', 'missing'], ['audit', [null]],
  ])('rejects malformed %s without changing saved text', (path, value) => {
    const raw = JSON.stringify(changed(path, value)); const port = storage([[key, raw]])
    expect(() => readTerminalCollection(port)).toThrow(StoredDataError)
    expect(() => readTerminalCollection(port)).not.toThrow('PRIVATE-INVALID-STATE')
    expect(() => readTerminalCollection(port)).not.toThrow('PRIVATE-CALL-ID')
    expect(port.values.get(key)).toBe(raw); expect(port.setItem).not.toHaveBeenCalled()
  })

  it('rejects duplicate terminal, restriction, call and assignment identities', () => {
    const seed = seedTerminalCollection()
    const candidates = [
      { ...seed, terminals: [...seed.terminals, seed.terminals[0]] },
      { ...seed, restrictions: [...seed.restrictions, seed.restrictions[0]] },
      changed('terminals.0.plan.calls', Array(2).fill(seed.terminals[0]?.plan.calls[0])),
      changed('terminals.1.plan.berthAssignments', Array(2).fill(seed.terminals[1]?.plan.berthAssignments?.[0])),
    ]
    for (const value of candidates) expect(() => readTerminalCollection(storage([[key, JSON.stringify(value)]]))).toThrow('duplicate')
  })

  it.each(['', '{private damaged data'])('preserves unreadable primary text instead of seeding: %j', raw => {
    const port = storage([[key, raw]])
    expect(() => readTerminalCollection(port)).toThrow(StoredDataError)
    expect(port.values.get(key)).toBe(raw); expect(port.setItem).not.toHaveBeenCalled()
  })

  it('roundtrips optional assignment fields and unknown metadata unchanged', () => {
    const value = changed('terminals.0.plan.berthAssignments', undefined)
    Object.assign(value, { importMetadata: { source: 'harbor archive', version: 7 } })
    Object.assign(terminalById(value, 'TERM-EAST').plan, { sourceNote: ['retained', 123] })
    const raw = JSON.stringify(value); const port = storage([[key, raw]])
    const loaded = readTerminalCollection(port)
    expect(terminalCollectionRule(loaded)).toBe(loaded)
    expect(saveTerminalCollection(port, loaded)).toBe(loaded)
    expect(port.values.get(key)).toBe(raw)
  })

  it('validates legacy migration output while retaining supported normalization', () => {
    const legacy = { calls: initialPortPlan.calls, recoveryFor: [], revision: 0, history: [], sourceNote: 'kept' }
    const raw = JSON.stringify(legacy); const port = storage([[legacyKey, raw]])
    expect(terminalById(readTerminalCollection(port), 'TERM-NORTH').plan).toEqual({ ...legacy, callOwners: {}, berthAssignments: [] })
    expect(port.values.get(legacyKey)).toBe(raw); expect(port.setItem).not.toHaveBeenCalled()
    const malformed = JSON.stringify({ ...initialPortPlan, calls: [null] }); const damaged = storage([[legacyKey, malformed]])
    expect(() => readTerminalCollection(damaged)).toThrow(expect.objectContaining({ key: legacyKey, operation: 'read' }))
    expect(damaged.values.get(legacyKey)).toBe(malformed); expect(damaged.setItem).not.toHaveBeenCalled()
  })

  it.each(['', '{private legacy data'])('reports the legacy recovery key for unreadable legacy text: %j', raw => {
    const port = storage([[legacyKey, raw]])
    expect(() => readTerminalCollection(port)).toThrow(expect.objectContaining({ key: legacyKey, operation: 'read' }))
    expect(port.values.get(legacyKey)).toBe(raw); expect(port.setItem).not.toHaveBeenCalled()
  })

  it('rejects unchecked runtime saves before writing, including non-finite call numbers', () => {
    const raw = JSON.stringify(seedTerminalCollection()); const port = storage([[key, raw]])
    for (const value of [changed('terminals.0', null), changed('terminals.0.plan.calls.0.end', Infinity)]) {
      expect(() => saveTerminalCollection(port, value)).toThrow(expect.objectContaining({ key, operation: 'write' }))
      expect(port.values.get(key)).toBe(raw); expect(port.setItem).not.toHaveBeenCalled()
    }
  })

  it('preserves cancelled-call ownership, assignment history and restriction references', () => {
    const seed = seedTerminalCollection(); const terminal = terminalById(seed, 'TERM-EAST')
    const reassigned = reassignCall(terminal.plan, 'CALL-41-E', 'terminal planner', 'hazmat supervisor', 'Reassign for the morning planning shift.')
    expect(reassigned.berthAssignments?.map(item => item.status)).toEqual(['superseded', 'open'])
    const cancelled = cancelCall(reassigned, 'CALL-41-E')
    const history = { ...seed, terminals: seed.terminals.map(item => item.id === terminal.id ?
      { ...item, plan: cancelled, restrictedCallIds: ['CALL-41-E'] } : item) }
    const result = setRestriction(history, 'BERTH-B04', true, 1)
    expect(result.blocked).toContainEqual({ id: 'TERM-EAST', reason: 'Call CALL-41-E was removed.' })
    const port = storage(); saveTerminalCollection(port, result.collection)
    expect(readTerminalCollection(port)).toEqual(result.collection)
    expect(terminalById(result.collection, 'TERM-EAST').plan.callOwners['CALL-41-E']).toBe('terminal planner')
    expect(terminalById(result.collection, 'TERM-EAST').plan.berthAssignments?.at(-1)?.status).toBe('cancelled')
  })
})
