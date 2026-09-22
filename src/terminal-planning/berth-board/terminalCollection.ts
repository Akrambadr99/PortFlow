import type { StoragePort } from '../../workspace/repository'
import { assignBerthCall, initialPortPlan, readPortPlan } from './portPlanLedger'
import type { PortPlan } from './portPlanLedger'
import { berthInbox, berthPlanners, claimBerthCall, directAssignHazmat } from './berthWorkload'

export interface TerminalRecord { id: string; plan: PortPlan; restrictedCallIds: readonly string[]; archived: boolean }
export interface BerthRestriction { id: string; revision: number; active: boolean; callRefs: readonly { terminalId: string; callId: string }[] }
export interface TerminalCollection { terminals: readonly TerminalRecord[]; restrictions: readonly BerthRestriction[]; audit: readonly { action: string; id: string; related: readonly string[] }[] }
export interface TerminalBatch { collection: TerminalCollection; updated: string[]; skipped: string[]; blocked: { id: string; reason: string }[] }
const key = 'portflow:terminal-collection:v1'
function terminalPlan(suffix: string): PortPlan {
  const calls = initialPortPlan.calls.map(item => ({ ...item, id: `${item.id}-${suffix}` }))
  return assignBerthCall({ ...initialPortPlan, calls }, calls[0]?.id ?? '', 'hazmat supervisor', 'hazmat supervisor',
    'Hazardous cargo handoff to berth team.')
}
export function seedTerminalCollection(legacy: PortPlan = initialPortPlan): TerminalCollection {
  return { terminals: [
    { id: 'TERM-NORTH', plan: legacy, restrictedCallIds: [], archived: false },
    { id: 'TERM-EAST', plan: terminalPlan('E'), restrictedCallIds: [], archived: false },
    { id: 'TERM-WEST', plan: terminalPlan('W'), restrictedCallIds: [], archived: false },
  ], restrictions: [
    { id: 'BERTH-B04', revision: 1, active: false, callRefs: [
      { terminalId: 'TERM-NORTH', callId: 'CALL-41' }, { terminalId: 'TERM-EAST', callId: 'CALL-41-E' }] },
    { id: 'BERTH-B05', revision: 1, active: false, callRefs: [
      { terminalId: 'TERM-WEST', callId: 'CALL-42-W' }] },
  ], audit: [] }
}
export function readTerminalCollection(storage: StoragePort): TerminalCollection {
  const raw = storage.getItem(key)
  if (!raw) return seedTerminalCollection(readPortPlan(storage))
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('terminals' in value) || !Array.isArray(value.terminals) ||
    !('restrictions' in value) || !Array.isArray(value.restrictions) || !('audit' in value) || !Array.isArray(value.audit))
    throw new Error('Invalid terminal collection.')
  return value as TerminalCollection
}
export function saveTerminalCollection(storage: StoragePort, value: TerminalCollection): TerminalCollection { storage.setItem(key, JSON.stringify(value)); return value }
export function terminalById(value: TerminalCollection, id: string): TerminalRecord {
  const record = value.terminals.find(item => item.id === id)
  if (!record) throw new Error(`Terminal ${id} was not found.`)
  return record
}
export function terminalRows(value: TerminalCollection, query = '', filter = 'active'): TerminalRecord[] {
  const needle = query.trim().toLowerCase()
  return value.terminals.filter(item => (filter === 'all' || (filter === 'archived') === item.archived) &&
    (!needle || [item.id, ...item.plan.calls.map(call => call.vessel)].some(field => field.toLowerCase().includes(needle))))
    .toSorted((a, b) => a.id.localeCompare(b.id))
}
export function terminalInbox(value: TerminalCollection) {
  return value.terminals.filter(item => !item.archived).flatMap(item => berthInbox(item.plan).map(work => ({ ...work, terminalId: item.id,
    restricted: item.restrictedCallIds.includes(work.callId) })))
}
export function claimTerminalCall(value: TerminalCollection, terminalId: string, callId: string, plannerId: string,
  expectedRevision: number): TerminalCollection {
  const terminal = terminalById(value, terminalId)
  if (terminal.archived || terminal.restrictedCallIds.includes(callId)) throw new Error('Restricted or archived terminal call cannot be claimed.')
  if (terminal.plan.revision !== expectedRevision) throw new Error('Terminal plan revision changed.')
  const planner = berthPlanners.find(item => item.id === plannerId)
  if (planner && terminalInbox(value).filter(item => item.assigneeId === plannerId).length >= planner.maxOpenCalls)
    throw new Error('Planner is at cross-terminal capacity.')
  const call = terminal.plan.calls.find(item => item.id === callId)
  const plan = call?.hazardous ? directAssignHazmat(terminal.plan, callId, plannerId, 'hazmat supervisor',
    'Hazardous berth call requires direct assignment.') : claimBerthCall(terminal.plan, callId, plannerId, expectedRevision)
  return { ...value, terminals: value.terminals.map(item => item.id === terminalId ? { ...item, plan } : item),
    audit: [...value.audit, { action: 'berth-claimed', id: `${terminalId}/${callId}`, related: [plannerId] }] }
}
export function setRestriction(value: TerminalCollection, id: string, active: boolean, expectedRevision: number): TerminalBatch {
  const restriction = value.restrictions.find(item => item.id === id)
  if (restriction?.revision !== expectedRevision) throw new Error('Berth restriction revision changed.')
  const updated: string[] = []; const skipped: string[] = []; const blocked: TerminalBatch['blocked'] = []
  const terminals = value.terminals.map(item => {
    const refs = restriction.callRefs.filter(ref => ref.terminalId === item.id)
    if (!refs.length || item.archived) { skipped.push(item.id); return item }
    const missing = refs.find(ref => !item.plan.calls.some(call => call.id === ref.callId))
    if (missing) { blocked.push({ id: item.id, reason: `Call ${missing.callId} was removed.` }); return item }
    const nextRestricted = active ? [...new Set([...item.restrictedCallIds, ...refs.map(ref => ref.callId)])] :
      item.restrictedCallIds.filter(callId => !refs.some(ref => ref.callId === callId))
    const revision = item.plan.revision + 1
    const plan: PortPlan = { ...item.plan, revision, berthAssignments: item.plan.berthAssignments?.map(assignment =>
      active && refs.some(ref => ref.callId === assignment.callId) && assignment.status === 'open' ?
        { ...assignment, status: 'superseded' as const } : assignment),
      history: [...item.plan.history, ...refs.map(ref => ({ revision, action: active ? 'berth-restricted' : 'berth-restored', callId: ref.callId }))] }
    updated.push(item.id); return { ...item, plan, restrictedCallIds: nextRestricted }
  })
  return { collection: { ...value, terminals, restrictions: value.restrictions.map(item => item.id === id ?
    { ...item, revision: item.revision + 1, active } : item),
    audit: [...value.audit, { action: active ? 'restriction-active' : 'restriction-cleared', id, related: updated }] }, updated, skipped, blocked }
}
export function claimTerminalCalls(value: TerminalCollection, refs: readonly { terminalId: string; callId: string }[], plannerId: string): TerminalBatch {
  let collection = value; const updated: string[] = []; const skipped: string[] = []; const blocked: TerminalBatch['blocked'] = []
  for (const ref of refs) {
    const id = `${ref.terminalId}/${ref.callId}`
    if (updated.includes(id) || skipped.includes(id)) { skipped.push(id); continue }
    try { collection = claimTerminalCall(collection, ref.terminalId, ref.callId, plannerId, terminalById(collection, ref.terminalId).plan.revision); updated.push(id) }
    catch (error) { blocked.push({ id, reason: error instanceof Error ? error.message : 'Claim blocked.' }) }
  }
  return { collection, updated, skipped, blocked }
}
export function archiveTerminal(value: TerminalCollection, id: string): TerminalCollection {
  const record = terminalById(value, id)
  if (record.archived || record.plan.berthAssignments?.some(item => item.status === 'open') || record.plan.recoveryFor.length)
    throw new Error('Resolve berth assignments and published recoveries before archiving terminal.')
  return { ...value, terminals: value.terminals.map(item => item.id === id ? { ...item, archived: true } : item),
    audit: [...value.audit, { action: 'terminal-archived', id, related: [] }] }
}
