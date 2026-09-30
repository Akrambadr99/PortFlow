import { array, booleanValue, dictionary, finiteNumber, nonEmptyText, nonNegativeInteger, nullable, object, oneOf, optional, refine, text, uniqueBy } from '../../workspace/storageValidation'
import type { PortCall } from './berthPlan'
import type { BerthAssignment, PortPlan } from './portPlanLedger'
import type { BerthRestriction, TerminalCollection, TerminalRecord } from './terminalCollection'

const call = object<PortCall>({
  id: nonEmptyText, vessel: text, berth: text, crane: text,
  start: finiteNumber, end: finiteNumber, moves: finiteNumber, hazardous: booleanValue,
})
const assignment = object<BerthAssignment>({
  id: nonEmptyText, callId: nonEmptyText, assignee: text, assigneeId: optional(nullable(text)),
  sourceRevision: nonNegativeInteger, status: oneOf('open', 'completed', 'superseded', 'cancelled'),
  supersedesId: optional(text), reason: text,
})
const plan = object<PortPlan>({
  revision: nonNegativeInteger, calls: uniqueBy(array(call), 'id'), recoveryFor: array(text), callOwners: dictionary(text),
  berthAssignments: optional(uniqueBy(array(assignment), 'id')),
  history: array(object<PortPlan['history'][number]>({
    revision: nonNegativeInteger, action: text, callId: text, actor: optional(text), reason: optional(text),
  })),
})
const terminal = object<TerminalRecord>({ id: nonEmptyText, plan, restrictedCallIds: array(text), archived: booleanValue })
const restriction = object<BerthRestriction>({
  id: nonEmptyText, revision: nonNegativeInteger, active: booleanValue,
  callRefs: array(object<BerthRestriction['callRefs'][number]>({ terminalId: nonEmptyText, callId: nonEmptyText })),
})

/** Removed calls may remain in cancelled assignments, ownership, restrictions and audit history. */
export const terminalCollectionRule = refine(object<TerminalCollection>({
  terminals: uniqueBy(array(terminal), 'id'), restrictions: uniqueBy(array(restriction), 'id'),
  audit: array(object<TerminalCollection['audit'][number]>({ action: text, id: text, related: array(text) })),
}), collection => {
  const terminalIds = new Set(collection.terminals.map(terminal => terminal.id))
  return collection.restrictions.every(item => item.callRefs.every(ref => terminalIds.has(ref.terminalId)))
}, 'restriction references an unknown terminal')
