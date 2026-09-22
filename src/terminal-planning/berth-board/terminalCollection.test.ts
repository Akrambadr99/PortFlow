import { describe, expect, it } from 'vitest'
import { archiveTerminal, claimTerminalCall, claimTerminalCalls, readTerminalCollection,
  saveTerminalCollection, seedTerminalCollection, setRestriction, terminalById, terminalInbox } from './terminalCollection'

function storage() { const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } }
describe('persisted terminal berth collection', () => {
  it('has independent terminal boards and hazardous assignment queue', () => {
    const state = seedTerminalCollection()
    expect(state.terminals).toHaveLength(3)
    expect(terminalInbox(state).map(item => item.terminalId)).toEqual(['TERM-EAST', 'TERM-WEST'])
  })
  it('assigns only the named terminal call and preserves it through reload', () => {
    const port = storage(); const state = seedTerminalCollection()
    const next = claimTerminalCall(state, 'TERM-EAST', 'CALL-41-E', 'planner-ravi', terminalById(state, 'TERM-EAST').plan.revision)
    saveTerminalCollection(port, next)
    expect(terminalInbox(readTerminalCollection(port)).find(item => item.terminalId === 'TERM-EAST')?.assigneeId).toBe('planner-ravi')
    expect(terminalInbox(readTerminalCollection(port)).find(item => item.terminalId === 'TERM-WEST')?.assigneeId).toBeNull()
  })
  it('propagates berth restriction to linked terminal calls only', () => {
    const state = seedTerminalCollection(); const result = setRestriction(state, 'BERTH-B04', true, 1)
    expect(result.updated).toEqual(['TERM-NORTH', 'TERM-EAST'])
    expect(terminalById(result.collection, 'TERM-EAST').restrictedCallIds).toContain('CALL-41-E')
    expect(terminalById(result.collection, 'TERM-WEST').plan.revision).toBe(terminalById(state, 'TERM-WEST').plan.revision)
    expect(() => claimTerminalCall(result.collection, 'TERM-EAST', 'CALL-41-E', 'planner-ravi', 2)).toThrow('Restricted')
    expect(() => setRestriction(result.collection, 'BERTH-B04', false, 1)).toThrow('revision changed')
  })
  it('returns partial selected claim results and archive blockers', () => {
    const state = seedTerminalCollection()
    const result = claimTerminalCalls(state, [
      { terminalId: 'TERM-EAST', callId: 'CALL-41-E' },
      { terminalId: 'TERM-WEST', callId: 'CALL-41-W' },
      { terminalId: 'TERM-EAST', callId: 'missing' },
    ], 'planner-ravi')
    expect(result.updated).toEqual(['TERM-EAST/CALL-41-E', 'TERM-WEST/CALL-41-W'])
    expect(result.blocked.map(item => item.id)).toEqual(['TERM-EAST/missing'])
    expect(() => archiveTerminal(state, 'TERM-EAST')).toThrow('berth assignments')
  })
})
