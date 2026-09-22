import type { StoragePort } from '../../workspace/repository'
import { planFindings, portCalls } from './berthPlan'
import type { PortCall } from './berthPlan'

export interface PortPlan {
  revision: number
  calls: readonly PortCall[]
  recoveryFor: readonly string[]
  callOwners: Record<string, string>
  history: readonly { revision: number; action: string; callId: string; actor?: string; reason?: string }[]
}
const key = 'portflow:berth-plan:v1'
export const initialPortPlan: PortPlan = { revision: 0, calls: portCalls, recoveryFor: [], callOwners: {}, history: [] }
export function readPortPlan(storage: StoragePort): PortPlan {
  const raw = storage.getItem(key)
  if (!raw) return initialPortPlan
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('revision' in value) || typeof value.revision !== 'number' ||
    !('calls' in value) || !Array.isArray(value.calls) || !('history' in value) || !Array.isArray(value.history) ||
    !('recoveryFor' in value) || !Array.isArray(value.recoveryFor)) throw new Error('Invalid berth-plan record.')
  const record = value as Omit<PortPlan, 'callOwners'> & Partial<Pick<PortPlan, 'callOwners'>>
  return { ...record, callOwners: record.callOwners ?? {} }
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
  if (call?.hazardous && actor !== 'hazmat supervisor') blockers.push('Hazardous cargo rescheduling requires hazmat supervisor approval.')
  if (call && !call.hazardous && actor !== owner) blockers.push(`Berth planning for ${id} belongs to ${owner}.`)
  return { allowed: blockers.length === 0, blockers, queue: blockers.some(item => item.includes('Published recovery')) ? 'blocked' : call?.hazardous ? 'hazmat-review' : 'planning' }
}
export function rescheduleCall(plan: PortPlan, id: string, start: number, end: number, actor: string): PortPlan {
  const decision = reschedulePolicy(plan, id, start, end, actor)
  if (!decision.allowed) throw new Error(decision.blockers.join(' '))
  const revision = plan.revision + 1
  return { ...plan, revision, calls: plan.calls.map(item => item.id === id ? { ...item, start, end } : item),
    history: [...plan.history, { revision, action: 'berth-rescheduled', callId: id, actor }] }
}
export function reassignCall(plan: PortPlan, id: string, owner: string, actor: string, reason: string): PortPlan {
  if (actor !== 'hazmat supervisor') throw new Error('Only the terminal supervisor may reassign a berth call.')
  if (!plan.calls.some(call => call.id === id)) throw new Error('Call was not found.')
  if (plan.recoveryFor.includes(id)) throw new Error('Published recovery protects berth ownership.')
  if (owner !== 'terminal planner' && owner !== 'hazmat supervisor') throw new Error('New owner is not eligible.')
  if (reason.trim().length < 12) throw new Error('Explain the berth ownership change.')
  const revision = plan.revision + 1
  return { ...plan, revision, callOwners: { ...plan.callOwners, [id]: owner }, history: [...plan.history,
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
    history: [...plan.history, { revision, action: 'berth-cancelled', callId: id }] }
}
export function savePortPlan(storage: StoragePort, plan: PortPlan): PortPlan {
  storage.setItem(key, JSON.stringify(plan))
  return plan
}
