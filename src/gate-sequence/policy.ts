import { requireThat } from '../workspace/values'
export const workflowKey = "gate-sequence"
export const workflowLabel = "Truck gate sequence"
export const ruleKind = "sequence"
export interface GateSequenceRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: GateSequenceRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured >= record.limit, 'Completed gate step have not reached Required gate step.')
  requireThat(record.evidence.trim().length >= 8, 'Truck gate sequence require traceable evidence.')
  requireThat(record.revision > 0, 'Truck gate sequence require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
