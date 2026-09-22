import { describe, expect, it } from 'vitest'
import { assignBerthCall, berthWorkQueue, cancelCall, initialPortPlan, reassignCall } from './portPlanLedger'

describe('berth planning handoff', () => {
  it('retains superseded and cancelled call responsibility', () => {
    const assigned = assignBerthCall(initialPortPlan, 'CALL-41', 'terminal planner', 'hazmat supervisor', 'Morning berth allocation handed to planner.')
    const changed = reassignCall(assigned, 'CALL-41', 'hazmat supervisor', 'hazmat supervisor', 'Hazardous cargo supervision is required.')
    expect(berthWorkQueue(changed, 'terminal planner')).toHaveLength(0)
    expect(berthWorkQueue(changed, 'hazmat supervisor')).toHaveLength(1)
    expect(changed.berthAssignments?.map(item => item.status)).toEqual(['superseded', 'open'])
    expect(cancelCall(changed, 'CALL-41').berthAssignments?.at(-1)?.status).toBe('cancelled')
  })
})
