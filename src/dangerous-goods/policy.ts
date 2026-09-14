import { requireThat } from '../workspace/values'
export const workflowKey = "dangerous-goods"
export const workflowLabel = "Dangerous goods segregation"
export const ruleKind = "reserve"
export interface DangerousGoodsRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: DangerousGoodsRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured >= record.limit, 'Separation distance meters fall below Minimum separation distance.')
  requireThat(record.evidence.trim().length >= 8, 'Dangerous goods segregation require traceable evidence.')
  requireThat(record.revision > 0, 'Dangerous goods segregation require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
