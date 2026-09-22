import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../../data/memory-storage'
import { appendCall, cancelCall, effectiveDelay, evaluateReschedule, publishRecovery, readPortPlan, rescheduleCall, savePortPlan } from './portPlanLedger'
const meridian = { id: 'CALL-43', vessel: 'Meridian', berth: 'B04', crane: 'QC-7', start: 14, end: 18, moves: 140, hazardous: false }
describe('berth window to demurrage causality', () => {
  it('persists a committed call and projects its late-window delay', () => {
    const storage = new MemoryStorage()
    savePortPlan(storage, appendCall(readPortPlan(storage), meridian))
    expect(effectiveDelay(readPortPlan(storage), 'CALL-43', 2)).toBe(6)
  })
  it('blocks publication without a call and cancellation after publication', () => {
    expect(() => publishRecovery(readPortPlan(new MemoryStorage()), 'CALL-43')).toThrow(/committed berth/)
    const planned = appendCall(readPortPlan(new MemoryStorage()), meridian)
    const published = publishRecovery(planned, 'CALL-43')
    expect(published.history.map(item => item.action)).toEqual(['berth-committed', 'recovery-published'])
    expect(() => cancelCall(published, 'CALL-43')).toThrow(/depends/)
  })
  it('recomputes demurrage after a valid delay but rejects resource conflicts and published recovery edits', () => {
    const planned = appendCall(readPortPlan(new MemoryStorage()), meridian)
    expect(evaluateReschedule(planned, 'CALL-43', 12, 18).conflicts).toContain('Berth conflicts with Aurora.')
    const delayed = rescheduleCall(planned, 'CALL-43', 15, 19)
    expect(effectiveDelay(delayed, 'CALL-43', 2)).toBe(7)
    expect(delayed.history.at(-1)?.action).toBe('berth-rescheduled')
    expect(() => rescheduleCall(publishRecovery(delayed, 'CALL-43'), 'CALL-43', 16, 20)).toThrow(/Published recovery/)
  })
})
