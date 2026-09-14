import { requireThat } from '../workspace/values'
export const workflowKey = "vessel-clearance"
export const workflowLabel = "Vessel arrival clearance"
export const ruleKind = "qualification"
export interface VesselClearanceRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: VesselClearanceRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured >= record.limit, 'Clearance score fall below Minimum clearance score.')
  requireThat(record.evidence.trim().length >= 8, 'Vessel arrival clearance require traceable evidence.')
  requireThat(record.revision > 0, 'Vessel arrival clearance require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
