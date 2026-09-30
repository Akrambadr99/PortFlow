import type { TerminalCollection } from './terminalCollection'

type Record = TerminalCollection['terminals'][number]
function selected(path: string, id: string) { return path + (path.includes('?') ? '&' : '?') + 'record=' + encodeURIComponent(id) }
export function recordDetailPath(record: Record) { return selected('/terminal/berths/2026-09-14', record.id) }
export function recordDecisionPath(record: Record) { return selected('/terminal/vessels/' + (record.plan.calls[0]?.id ?? 'missing') + '/demurrage', record.id) }
