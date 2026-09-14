import { requireThat } from '../workspace/values'
export const workflowKey = "container-hold"
export const workflowLabel = "Container customs holds"
export const ruleKind = "dependency"
export interface ContainerHoldRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: ContainerHoldRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured === record.limit, 'Manifest revision does not match Cleared manifest revision.')
  requireThat(record.evidence.trim().length >= 8, 'Container customs holds require traceable evidence.')
  requireThat(record.revision > 0, 'Container customs holds require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
