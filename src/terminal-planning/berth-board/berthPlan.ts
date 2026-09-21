export interface PortCall { id: string; vessel: string; berth: string; crane: string; start: number; end: number; moves: number; hazardous: boolean }
export interface Resource { id: string; maxMoves: number; hazardousQualified: boolean }
export const berths: readonly Resource[] = [
  { id: 'B04', maxMoves: 240, hazardousQualified: true },
  { id: 'B05', maxMoves: 180, hazardousQualified: false },
]
export const cranes: readonly Resource[] = [
  { id: 'QC-7', maxMoves: 220, hazardousQualified: true },
  { id: 'QC-8', maxMoves: 160, hazardousQualified: false },
]
export const portCalls: readonly PortCall[] = [
  { id: 'CALL-41', vessel: 'Aurora', berth: 'B04', crane: 'QC-7', start: 8, end: 14, moves: 150, hazardous: true },
  { id: 'CALL-42', vessel: 'Seabird', berth: 'B05', crane: 'QC-8', start: 9, end: 13, moves: 120, hazardous: false },
]
export function planFindings(candidate: PortCall, committed: readonly PortCall[]): string[] {
  const findings: string[] = []
  if (!Number.isInteger(candidate.start) || !Number.isInteger(candidate.end) || candidate.start < 0 || candidate.end > 24 || candidate.end <= candidate.start) findings.push('A valid same-day berth window is required.')
  const berth = berths.find(item => item.id === candidate.berth)
  const crane = cranes.find(item => item.id === candidate.crane)
  if (!berth || !crane) findings.push('Unknown berth or crane.')
  if (berth && candidate.moves > berth.maxMoves) findings.push(`Berth ${berth.id} cannot handle ${String(candidate.moves)} moves.`)
  if (crane && candidate.moves > crane.maxMoves) findings.push(`Crane ${crane.id} cannot handle ${String(candidate.moves)} moves.`)
  if (candidate.hazardous && (!berth?.hazardousQualified || !crane?.hazardousQualified)) findings.push('Dangerous goods require a qualified berth and crane.')
  for (const call of committed) {
    if (call.id === candidate.id || candidate.start >= call.end || candidate.end <= call.start) continue
    if (call.berth === candidate.berth) findings.push(`Berth conflicts with ${call.vessel}.`)
    if (call.crane === candidate.crane) findings.push(`Crane conflicts with ${call.vessel}.`)
  }
  return findings
}
