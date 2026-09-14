import { requireThat } from '../workspace/values'
export const workflowKey = "crane-plan"
export const workflowLabel = "Quay crane capacity"
export const ruleKind = "capacity"
export interface CranePlanRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: CranePlanRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Required crane hours exceed Available crane hours.')
  requireThat(record.evidence.trim().length >= 8, 'Quay crane capacity require traceable evidence.')
  requireThat(record.revision > 0, 'Quay crane capacity require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
