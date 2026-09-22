import type { BerthAssignment, PortPlan } from './portPlanLedger'

export interface BerthPlanner {
  id: string
  name: string
  berths: readonly string[]
  hazmatQualified: boolean
  maxOpenCalls: number
  available: boolean
}
export interface BerthInboxItem {
  assignmentId: string
  callId: string
  vessel: string
  berth: string
  start: number
  hazardous: boolean
  assigneeId: string | null
  sourceRevision: number
}
export interface BerthBulkResult {
  plan: PortPlan
  applied: readonly string[]
  skipped: readonly { callId: string; reason: string }[]
  failed: readonly { callId: string; reason: string }[]
}

export const berthPlanners: readonly BerthPlanner[] = [
  { id: 'planner-ava', name: 'Ava Mensah', berths: ['B04', 'B05'], hazmatQualified: false, maxOpenCalls: 2, available: true },
  { id: 'planner-ravi', name: 'Ravi Shah', berths: ['B03', 'B04'], hazmatQualified: true, maxOpenCalls: 2, available: true },
  { id: 'planner-lena', name: 'Lena Ortiz', berths: ['B04'], hazmatQualified: true, maxOpenCalls: 1, available: false },
]

export function berthInbox(plan: PortPlan, actorId?: string): BerthInboxItem[] {
  return (plan.berthAssignments ?? []).filter(item => item.status === 'open' &&
    (actorId === undefined || item.assigneeId === actorId)).flatMap(item => {
    const call = plan.calls.find(candidate => candidate.id === item.callId)
    return call ? [{ assignmentId: item.id, callId: call.id, vessel: call.vessel, berth: call.berth,
      start: call.start, hazardous: call.hazardous, assigneeId: item.assigneeId ?? null,
      sourceRevision: item.sourceRevision }] : []
  }).sort((a, b) => Number(b.hazardous) - Number(a.hazardous) || a.start - b.start || a.callId.localeCompare(b.callId))
}

export function plannerWorkload(plan: PortPlan, actorId: string): number {
  return berthInbox(plan, actorId).length
}

export function berthClaimBlockers(plan: PortPlan, callId: string, actorId: string): string[] {
  const actor = berthPlanners.find(item => item.id === actorId)
  const call = plan.calls.find(item => item.id === callId)
  const assignment = (plan.berthAssignments ?? []).find(item => item.callId === callId && item.status === 'open')
  const blockers: string[] = []
  if (!call || !assignment) blockers.push('An open berth assignment is required.')
  if (assignment?.assigneeId) blockers.push('Berth call is already claimed.')
  if (!actor?.available) blockers.push('Planner is unavailable.')
  if (call && actor && !actor.berths.includes(call.berth)) blockers.push('Planner is outside this berth scope.')
  if (call?.hazardous && !actor?.hazmatQualified) blockers.push('Hazardous cargo requires a qualified planner.')
  if (call?.hazardous) blockers.push('Hazardous calls require direct supervisor assignment.')
  if (actor && plannerWorkload(plan, actorId) >= actor.maxOpenCalls) blockers.push('Planner is at capacity.')
  if (plan.recoveryFor.includes(callId)) blockers.push('Published recovery protects the berth assignment.')
  return blockers
}

function assignNamed(plan: PortPlan, assignment: BerthAssignment, actorId: string, action: string, reason?: string): PortPlan {
  const revision = plan.revision + 1
  return { ...plan, revision, berthAssignments: plan.berthAssignments?.map(item => item.id === assignment.id ?
    { ...item, assigneeId: actorId, sourceRevision: revision } : item),
    history: [...plan.history, { revision, action, callId: assignment.callId, actor: actorId, ...(reason ? { reason } : {}) }] }
}

export function claimBerthCall(plan: PortPlan, callId: string, actorId: string, expectedRevision: number): PortPlan {
  if (plan.revision !== expectedRevision) throw new Error('Berth plan revision changed before claim.')
  const blockers = berthClaimBlockers(plan, callId, actorId)
  if (blockers.length) throw new Error(blockers[0])
  const assignment = plan.berthAssignments?.find(item => item.callId === callId && item.status === 'open')
  if (!assignment) throw new Error('No active berth assignment.')
  return assignNamed(plan, assignment, actorId, 'berth-claimed')
}

export function directAssignHazmat(plan: PortPlan, callId: string, actorId: string, supervisor: string, reason: string): PortPlan {
  if (supervisor !== 'hazmat supervisor' || reason.trim().length < 12) throw new Error('Supervisor and handoff reason are required.')
  const call = plan.calls.find(item => item.id === callId)
  const assignment = plan.berthAssignments?.find(item => item.callId === callId && item.status === 'open')
  const actor = berthPlanners.find(item => item.id === actorId)
  if (!call?.hazardous || !assignment || assignment.assigneeId) throw new Error('An unclaimed hazardous call is required.')
  if (!actor?.available || !actor.hazmatQualified || !actor.berths.includes(call.berth)) throw new Error('Planner lacks hazmat or berth eligibility.')
  if (plannerWorkload(plan, actorId) >= actor.maxOpenCalls) throw new Error('Planner is at capacity.')
  return assignNamed(plan, assignment, actorId, 'hazmat-direct-assigned', reason)
}

export function releaseBerthClaim(plan: PortPlan, callId: string, actorId: string): PortPlan {
  const assignment = plan.berthAssignments?.find(item => item.callId === callId && item.status === 'open')
  if (assignment?.assigneeId !== actorId) throw new Error('Only the named planner may release this claim.')
  if (plan.recoveryFor.includes(callId)) throw new Error('Published recovery protects the berth assignment.')
  const revision = plan.revision + 1
  return { ...plan, revision, berthAssignments: plan.berthAssignments?.map(item => item.id === assignment.id ?
    { ...item, assigneeId: null, sourceRevision: revision } : item),
    history: [...plan.history, { revision, action: 'berth-claim-released', callId, actor: actorId }] }
}

export function bulkClaimBerths(plan: PortPlan, callIds: readonly string[], actorId: string): BerthBulkResult {
  let current = plan
  const applied: string[] = []
  const skipped: { callId: string; reason: string }[] = []
  const failed: { callId: string; reason: string }[] = []
  for (const callId of callIds) {
    if (applied.includes(callId) || skipped.some(item => item.callId === callId)) {
      skipped.push({ callId, reason: 'Duplicate call in bulk request.' })
      continue
    }
    try {
      current = claimBerthCall(current, callId, actorId, current.revision)
      applied.push(callId)
    } catch (error) {
      failed.push({ callId, reason: error instanceof Error ? error.message : 'Claim failed.' })
    }
  }
  return { plan: current, applied, skipped, failed }
}
