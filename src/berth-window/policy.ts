import { requireThat } from '../workspace/values'
export const workflowKey = "berth-window"
export const workflowLabel = "Berth window allocation"
export const ruleKind = "window"
export interface BerthWindowRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: BerthWindowRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Departure tide slot falls outside Latest berth release slot.')
  requireThat(record.evidence.trim().length >= 8, 'Berth window allocation require traceable evidence.')
  requireThat(record.revision > 0, 'Berth window allocation require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
