import { requireThat } from '../workspace/values'
export const workflowKey = "reefer-monitoring"
export const workflowLabel = "Reefer telemetry monitoring"
export const ruleKind = "freshness"
export interface ReeferMonitoringRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: ReeferMonitoringRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Sensor age (minutes) exceed Maximum sensor age.')
  requireThat(record.evidence.trim().length >= 8, 'Reefer telemetry monitoring require traceable evidence.')
  requireThat(record.revision > 0, 'Reefer telemetry monitoring require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
