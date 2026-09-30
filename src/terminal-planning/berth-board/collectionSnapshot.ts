import type { SnapshotAdapter } from '../../workspace/collectionSnapshot'
import { readTerminalCollection } from './terminalCollection'
import type { TerminalCollection } from './terminalCollection'
import { terminalCollectionRule } from './collectionValidation'

/** The full payload retains history; only stable domain identities form comparison rows. */
export const collectionSnapshotAdapter: SnapshotAdapter<TerminalCollection> = {
  product: 'PortFlow',
  scope: 'terminal-collection',
  label: 'Terminal berth collection',
  read: readTerminalCollection,
  validate: terminalCollectionRule,
  groups: value => [
    { key: 'terminals', label: 'Terminals', records: value.terminals.map(record => ({
      id: record.id, label: `${String(record.plan.calls.length)} vessel calls · ${record.archived ? 'Archived' : 'Active'}`, value: record,
    })) },
    { key: 'restrictions', label: 'Berth restrictions', records: value.restrictions.map(record => ({
      id: record.id, label: `${String(record.callRefs.length)} linked calls · ${record.active ? 'Restriction active' : 'Restriction inactive'}`, value: record,
    })) },
  ],
}
