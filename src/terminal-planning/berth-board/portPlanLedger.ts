import type { StoragePort, StorageReader } from '../../platform/storage-port'
import { planFindings, portCalls } from './berthPlan'
import type { PortCall } from './berthPlan'

export interface PortPlan {
  revision: number
  calls: readonly PortCall[]
  recoveryFor: readonly string[]
  callOwners: Record<string, string>
  berthAssignments?: readonly BerthAssignment[] | undefined
  history: readonly { revision: number; action: string; callId: string; actor?: string; reason?: string }[]
}
export interface BerthAssignment {
  id: string
  callId: string
  assignee: string
  assigneeId?: string | null
  sourceRevision: number
  status: 'open' | 'completed' | 'superseded' | 'cancelled'
  supersedesId?: string | undefined
  reason: string
}
const key = 'portflow:berth-plan:v1'
export const initialPortPlan: PortPlan = { revision: 0, calls: portCalls, recoveryFor: [], callOwners: {}, berthAssignments: [], history: [] }
export function readPortPlan(storage: StorageReader): PortPlan {
  const raw = storage.getItem(key)
  if (!raw) return initialPortPlan
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('revision' in value) || typeof value.revision !== 'number' ||
    !('calls' in value) || !Array.isArray(value.calls) || !('history' in value) || !Array.isArray(value.history) ||
    !('recoveryFor' in value) || !Array.isArray(value.recoveryFor)) throw new Error('Invalid berth-plan record.')
  const record = value as Omit<PortPlan, 'callOwners'> & Partial<Pick<PortPlan, 'callOwners'>>
  return { ...record, callOwners: record.callOwners ?? {}, berthAssignments: record.berthAssignments ?? [] }
}
export function berthWorkQueue(plan: PortPlan, assignee: string): BerthAssignment[] {
  return (plan.berthAssignments ?? []).filter(item => item.assignee === assignee && item.status === 'open')
    .sort((a, b) => a.sourceRevision - b.sourceRevision)
}
export function assignBerthCall(plan: PortPlan, id: string, assignee: string, actor: string, reason: string): PortPlan {
  const call = plan.calls.find(item => item.id === id)
  if (!call) throw new Error('Call was not found.')
  if (actor !== 'hazmat supervisor' || reason.trim().length < 12) throw new Error('Supervisor handoff reason is required.')
  if (plan.recoveryFor.includes(id)) throw new Error('Published recovery protects berth ownership.')
  if (assignee !== 'terminal planner' && assignee !== 'hazmat supervisor') throw new Error('New owner is not eligible.')
  const current = (plan.berthAssignments ?? []).find(item => item.callId === id && item.status === 'open')
  if (current?.assignee === assignee) throw new Error('This berth call is already assigned to that planner.')
  const revision = plan.revision + 1
  const assignment: BerthAssignment = { id: `BERTH-${id}-${String(revision)}`, callId: id, assignee, sourceRevision: revision,
    status: 'open', reason, assigneeId: null, ...(current ? { supersedesId: current.id } : {}) }
  return { ...plan, revision, callOwners: { ...plan.callOwners, [id]: assignee },
    berthAssignments: [...(plan.berthAssignments ?? []).map(item => item.id === current?.id ?
      { ...item, status: 'superseded' as const } : item), assignment],
    history: [...plan.history, { revision, action: 'berth-assigned', callId: id, actor, reason }] }
}
export function callForRoute(plan: PortPlan, routeId: string): PortCall | undefined {
  return plan.calls.find(call => call.id === routeId || (routeId === 'VSL-AURORA' && call.id === 'CALL-41'))
}
export function effectiveDelay(plan: PortPlan, routeId: string, proposedDelay: number): number {
  const call = callForRoute(plan, routeId)
  return proposedDelay + (call ? Math.max(0, call.end - 14) : 0)
}
export function evaluateReschedule(plan: PortPlan, id: string, start: number, end: number): { allowed: boolean; conflicts: string[] } {
  const call = plan.calls.find(item => item.id === id)
  if (!call) return { allowed: false, conflicts: ['Call was not found.'] }
  const conflicts = planFindings({ ...call, start, end }, plan.calls.filter(item => item.id !== id))
  if (plan.recoveryFor.includes(id)) conflicts.push('Published recovery depends on this berth window.')
  return { allowed: conflicts.length === 0, conflicts }
}
export function reschedulePolicy(plan: PortPlan, id: string, start: number, end: number, actor: string): { allowed: boolean; blockers: string[]; queue: 'planning' | 'hazmat-review' | 'blocked' } {
  const call = plan.calls.find(item => item.id === id)
  const blockers = [...evaluateReschedule(plan, id, start, end).conflicts]
  const owner = plan.callOwners[id] ?? 'terminal planner'
  const assignment = (plan.berthAssignments ?? []).find(item => item.callId === id && item.status === 'open')
  if (assignment && (actor !== assignment.assignee || assignment.sourceRevision > plan.revision)) blockers.push('Current berth assignment belongs to another planner.')
  if (call?.hazardous && actor !== 'hazmat supervisor') blockers.push('Hazardous cargo rescheduling requires hazmat supervisor approval.')
  if (call && !call.hazardous && actor !== owner) blockers.push(`Berth planning for ${id} belongs to ${owner}.`)
  return { allowed: blockers.length === 0, blockers, queue: blockers.some(item => item.includes('Published recovery')) ? 'blocked' : call?.hazardous ? 'hazmat-review' : 'planning' }
}
export function rescheduleCall(plan: PortPlan, id: string, start: number, end: number, actor: string, plannerId?: string): PortPlan {
  const decision = reschedulePolicy(plan, id, start, end, actor)
  if (!decision.allowed) throw new Error(decision.blockers.join(' '))
  const assignment = (plan.berthAssignments ?? []).find(item => item.callId === id && item.status === 'open')
  if (assignment?.assigneeId && assignment.assigneeId !== plannerId) throw new Error('Berth call belongs to another named planner.')
  const revision = plan.revision + 1
  return { ...plan, revision, calls: plan.calls.map(item => item.id === id ? { ...item, start, end } : item),
    berthAssignments: plan.berthAssignments?.map(item => item.callId === id && item.status === 'open' ?
      { ...item, status: 'completed' as const } : item),
    history: [...plan.history, { revision, action: 'berth-rescheduled', callId: id, actor }] }
}
export function reassignCall(plan: PortPlan, id: string, owner: string, actor: string, reason: string): PortPlan {
  if (actor !== 'hazmat supervisor') throw new Error('Only the terminal supervisor may reassign a berth call.')
  if (!plan.calls.some(call => call.id === id)) throw new Error('Call was not found.')
  if (plan.recoveryFor.includes(id)) throw new Error('Published recovery protects berth ownership.')
  if (owner !== 'terminal planner' && owner !== 'hazmat supervisor') throw new Error('New owner is not eligible.')
  if (reason.trim().length < 12) throw new Error('Explain the berth ownership change.')
  const revision = plan.revision + 1
  return { ...plan, revision, callOwners: { ...plan.callOwners, [id]: owner },
    berthAssignments: [...(plan.berthAssignments ?? []).map(item => item.callId === id && item.status === 'open' ?
      { ...item, status: 'superseded' as const } : item),
      { id: `BERTH-${id}-${String(revision)}`, callId: id, assignee: owner, assigneeId: null, sourceRevision: revision, status: 'open', reason,
        ...((plan.berthAssignments ?? []).find(item => item.callId === id && item.status === 'open') ?
          { supersedesId: (plan.berthAssignments ?? []).find(item => item.callId === id && item.status === 'open')?.id } : {}) }],
    history: [...plan.history,
    { revision, action: 'berth-reassigned', callId: id, actor, reason }] }
}
export function appendCall(plan: PortPlan, call: PortCall): PortPlan {
  const findings = planFindings(call, plan.calls)
  if (findings.length) throw new Error(findings.join(' '))
  if (plan.calls.some(item => item.id === call.id)) throw new Error('Call ID is already committed.')
  const revision = plan.revision + 1
  return { ...plan, revision, calls: [...plan.calls, call],
    history: [...plan.history, { revision, action: 'berth-committed', callId: call.id }] }
}
export function publishRecovery(plan: PortPlan, routeId: string): PortPlan {
  const call = callForRoute(plan, routeId)
  if (!call) throw new Error('A committed berth window is required before recovery publication.')
  if (plan.recoveryFor.includes(call.id)) throw new Error('Recovery is already published.')
  const revision = plan.revision + 1
  return { ...plan, revision, recoveryFor: [...plan.recoveryFor, call.id],
    history: [...plan.history, { revision, action: 'recovery-published', callId: call.id }] }
}
export function cancelCall(plan: PortPlan, id: string): PortPlan {
  if (!plan.calls.some(item => item.id === id)) throw new Error('Call was not found.')
  if (plan.recoveryFor.includes(id)) throw new Error('Published recovery depends on this berth window.')
  const revision = plan.revision + 1
  return { ...plan, revision, calls: plan.calls.filter(item => item.id !== id),
    berthAssignments: plan.berthAssignments?.map(item => item.callId === id && item.status === 'open' ?
      { ...item, status: 'cancelled' as const } : item),
    history: [...plan.history, { revision, action: 'berth-cancelled', callId: id }] }
}
export function savePortPlan(storage: StoragePort, plan: PortPlan): PortPlan {
  storage.setItem(key, JSON.stringify(plan))
  return plan
}
