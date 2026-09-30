import { describe, expect, it } from 'vitest'
import { terminalTriage } from './collectionTriage'
import { claimTerminalCall, seedTerminalCollection, setRestriction, terminalById } from './terminalCollection'

describe('terminal collection triage', () => {
  it('distinguishes hazardous handoffs from boards with no assignments', () => {
    const state = seedTerminalCollection()
    expect(terminalTriage.state(terminalById(state, 'TERM-EAST'))).toBe('hazmat')
    expect(terminalTriage.state(terminalById(state, 'TERM-NORTH'))).toBe('clear')
  })
  it('updates triage after a real eligible planner claim', () => {
    const state = seedTerminalCollection()
    const terminal = terminalById(state, 'TERM-EAST')
    const next = claimTerminalCall(state, terminal.id, terminal.plan.calls[0]?.id ?? '', 'planner-ravi', terminal.plan.revision)
    expect(terminalTriage.state(terminalById(next, terminal.id))).toBe('assigned')
    expect(terminalTriage.state(terminal)).toBe('hazmat')
  })
  it('prioritizes shared berth restrictions over ownership', () => {
    const state = seedTerminalCollection()
    const next = setRestriction(state, 'BERTH-B04', true, 1).collection
    expect(terminalTriage.state(terminalById(next, 'TERM-EAST'))).toBe('restricted')
    expect(terminalTriage.state(terminalById(next, 'TERM-WEST'))).toBe('hazmat')
  })
  it('separates standard unclaimed work from hazmat handoffs', () => {
    const terminal = terminalById(seedTerminalCollection(), 'TERM-EAST')
    expect(terminalTriage.state({ ...terminal, plan: { ...terminal.plan,
      calls: terminal.plan.calls.map(call => ({ ...call, hazardous: false })) } })).toBe('unclaimed')
  })
  it('searches call, berth and vessel identities without mutation', () => {
    const terminal = terminalById(seedTerminalCollection(), 'TERM-EAST')
    const before = JSON.stringify(terminal)
    expect(terminalTriage.searchText(terminal)).toContain('CALL-41-E')
    expect(terminalTriage.searchText(terminal)).toContain('B04')
    expect(terminalTriage.revision(terminal)).toBe(terminal.plan.revision)
    expect(terminalTriage.states.some(item => item.value === terminalTriage.state(terminal))).toBe(true)
    expect(JSON.stringify(terminal)).toBe(before)
  })
})
