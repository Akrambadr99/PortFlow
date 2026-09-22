import type { StoragePort } from '../../workspace/repository'
import { planFindings, portCalls } from './berthPlan'
import type { PortCall } from './berthPlan'

export interface PortPlan {
  revision: number
  calls: readonly PortCall[]
  recoveryFor: readonly string[]
  history: readonly { revision: number; action: string; callId: string }[]
}
const key = 'portflow:berth-plan:v1'
export const initialPortPlan: PortPlan = { revision: 0, calls: portCalls, recoveryFor: [], history: [] }
export function readPortPlan(storage: StoragePort): PortPlan {
  const raw = storage.getItem(key)
  if (!raw) return initialPortPlan
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('revision' in value) || typeof value.revision !== 'number' ||
    !('calls' in value) || !Array.isArray(value.calls) || !('history' in value) || !Array.isArray(value.history) ||
    !('recoveryFor' in value) || !Array.isArray(value.recoveryFor)) throw new Error('Invalid berth-plan record.')
  return value as PortPlan
}
export function callForRoute(plan: PortPlan, routeId: string): PortCall | undefined {
  return plan.calls.find(call => call.id === routeId || (routeId === 'VSL-AURORA' && call.id === 'CALL-41'))
}
export function effectiveDelay(plan: PortPlan, routeId: string, proposedDelay: number): number {
  const call = callForRoute(plan, routeId)
  return proposedDelay + (call ? Math.max(0, call.end - 14) : 0)
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
