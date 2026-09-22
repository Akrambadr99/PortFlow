import { describe, expect, it } from 'vitest'
import { appendCall, assignBerthCall, initialPortPlan, rescheduleCall } from './portPlanLedger'
import { berthClaimBlockers, berthInbox, bulkClaimBerths, claimBerthCall, directAssignHazmat, plannerWorkload, releaseBerthClaim } from './berthWorkload'

function queued() {
  let plan = appendCall(initialPortPlan, { id: 'CALL-43', vessel: 'Meridian', berth: 'B04',
    crane: 'QC-7', start: 14, end: 18, moves: 140, hazardous: false })
  for (const id of ['CALL-41', 'CALL-42', 'CALL-43']) {
    plan = assignBerthCall(plan, id, id === 'CALL-41' ? 'hazmat supervisor' : 'terminal planner',
      'hazmat supervisor', 'Supervisor opened a named planner work item.')
  }
  return plan
}

describe('named berth workload', () => {
  it('orders multiple calls and reports partial bulk success', () => {
    const plan = queued()
    expect(berthInbox(plan).map(item => item.callId)).toEqual(['CALL-41', 'CALL-42', 'CALL-43'])
    const result = bulkClaimBerths(plan, ['CALL-42', 'CALL-43', 'CALL-41', 'CALL-42'], 'planner-ava')
    expect(result.applied).toEqual(['CALL-42', 'CALL-43'])
    expect(result.failed.map(item => item.callId)).toEqual(['CALL-41'])
    expect(result.skipped.map(item => item.callId)).toEqual(['CALL-42'])
    expect(plannerWorkload(result.plan, 'planner-ava')).toBe(2)
    expect(berthInbox(result.plan, 'planner-ava').map(item => item.callId)).toEqual(['CALL-42', 'CALL-43'])
    expect(() => rescheduleCall(result.plan, 'CALL-43', 15, 19, 'terminal planner', 'planner-ravi')).toThrow(/another named planner/)
  })

  it('requires direct qualified hazardous assignment and supports release before recovery publication', () => {
    const plan = queued()
    expect(berthClaimBlockers(plan, 'CALL-41', 'planner-ava')).toContain('Hazardous calls require direct supervisor assignment.')
    expect(() => claimBerthCall(plan, 'CALL-41', 'planner-ravi', plan.revision)).toThrow(/direct supervisor/)
    const assigned = directAssignHazmat(plan, 'CALL-41', 'planner-ravi', 'hazmat supervisor',
      'Qualified hazmat planner takes the call.')
    expect(berthInbox(assigned, 'planner-ravi')).toHaveLength(1)
    expect(releaseBerthClaim(assigned, 'CALL-41', 'planner-ravi').berthAssignments?.find(item =>
      item.callId === 'CALL-41')?.assigneeId).toBeNull()
  })
})
