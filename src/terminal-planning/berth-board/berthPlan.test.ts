import { describe, expect, it } from 'vitest'
import { planFindings, portCalls } from './berthPlan'

describe('berth and crane plan', () => {
  const candidate = { ...portCalls[0]!, id: 'CALL-43' }
  it('identifies independent berth and crane conflicts', () => {
    expect(planFindings(candidate, portCalls)).toEqual(['Berth conflicts with Aurora.', 'Crane conflicts with Aurora.'])
  })
  it('allows non-overlapping use of resources', () => {
    expect(planFindings({ ...candidate, start: 14, end: 19 }, portCalls)).toEqual([])
  })
  it('enforces dangerous-goods qualification and capacity', () => {
    expect(planFindings({ ...candidate, berth: 'B05', crane: 'QC-8', moves: 200 }, []))
      .toEqual(expect.arrayContaining(['Berth B05 cannot handle 200 moves.', 'Crane QC-8 cannot handle 200 moves.', 'Dangerous goods require a qualified berth and crane.']))
  })
  it('rejects invalid time windows', () => {
    expect(planFindings({ ...candidate, start: 14, end: 14 }, [])).toContain('A valid same-day berth window is required.')
  })
})
