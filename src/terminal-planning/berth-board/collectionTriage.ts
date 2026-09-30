import type { ExplorerPolicy } from '../../workspace/collectionExplorer'
import type { TerminalRecord } from './terminalCollection'

export const terminalTriage: ExplorerPolicy<TerminalRecord> = {
  searchText: record => [record.id, ...record.plan.calls.flatMap(call => [call.id, call.vessel, call.berth])].join(' '),
  revision: record => record.plan.revision,
  state(record) {
    if (record.restrictedCallIds.length) return 'restricted'
    const open = (record.plan.berthAssignments ?? []).filter(item => item.status === 'open')
    if (open.some(item => !item.assigneeId && record.plan.calls.some(call => call.id === item.callId && call.hazardous))) return 'hazmat'
    if (open.some(item => !item.assigneeId)) return 'unclaimed'
    return open.length ? 'assigned' : 'clear'
  },
  states: [
    { value: 'restricted', label: 'Restricted berth calls' },
    { value: 'hazmat', label: 'Hazmat handoff needed' },
    { value: 'unclaimed', label: 'Standard calls · unclaimed' },
    { value: 'assigned', label: 'Open assignments · claimed' },
    { value: 'clear', label: 'No open berth assignments' },
  ],
}
