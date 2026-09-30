import { berthPlanners, berthInbox } from './berthWorkload'
import type { StoragePort } from '../../platform/storage-port'
import { bindRecord } from '../../workspace/recordStorage'
import { readTerminalCollection, saveTerminalCollection } from './terminalCollection'
import { readPortPlan } from './portPlanLedger'

export function openSelectedRecord(storage: StoragePort, id = 'TERM-NORTH') {
  return bindRecord(storage, id, {
    key: 'portflow:berth-plan:v1',
    collectionKey: 'portflow:terminal-collection:v1',
    read: readTerminalCollection, save: saveTerminalCollection,
    find: (collection, target) => collection.terminals.find(item => item.id === target),
    value: record => record.plan, archived: record => record.archived,
    replace: (collection, target, raw) => {
      const value = readPortPlan({ getItem: () => raw })
      const previous = collection.terminals.find(item => item.id === target)
      if (!previous) throw new Error('Terminal not found.')
      const newClaims = (value.berthAssignments ?? []).filter(item => item.status === 'open' && item.assigneeId &&
        !previous.plan.berthAssignments?.some(old => old.id === item.id && old.assigneeId === item.assigneeId && old.status === 'open'))
      for (const claim of newClaims) {
        if (previous.restrictedCallIds.includes(claim.callId)) throw new Error('Restricted berth call cannot be claimed.')
        const planner = berthPlanners.find(item => item.id === claim.assigneeId)
        const elsewhere = collection.terminals.filter(item => !item.archived && item.id !== target)
          .flatMap(item => berthInbox(item.plan, claim.assigneeId ?? undefined)).length
        if (!planner || elsewhere + berthInbox(value, planner.id).length > planner.maxOpenCalls)
          throw new Error('Planner is at cross-terminal capacity.')
      }
      return { ...collection, terminals: collection.terminals.map(item => item.id === target ? { ...item, plan: value } : item),
        audit: [...collection.audit, { action: 'detail-updated', id: target, related: [] }] }
    },
  })
}
