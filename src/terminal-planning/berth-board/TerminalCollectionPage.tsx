import { withCollectionView } from '../../workspace/collectionExplorer'
import { useCollectionExplorer } from '../../workspace/useCollectionExplorer'
import { ExplorerControls, ExplorerPagination, ExplorerSelection } from '../../workspace/CollectionExplorerControls'
import { terminalTriage } from './collectionTriage'
import { recordDetailPath, recordDecisionPath } from './recordLinks'
import { Link } from 'react-router-dom'
import { saveCurrentCollection } from '../../workspace/recordStorage'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { berthPlanners } from './berthWorkload'
import { archiveTerminal, claimTerminalCall, claimTerminalCalls, readTerminalCollection,
  saveTerminalCollection, setRestriction, terminalInbox } from './terminalCollection'

export function TerminalCollectionPage() {
  const [collection, setCollection] = useState(() => readTerminalCollection(window.localStorage))
  const [params, setParams] = useSearchParams()
  const explorer = useCollectionExplorer(collection.terminals, terminalTriage)
  const [planner, setPlanner] = useState('planner-ravi'); const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const selectedId = params.get('terminal') ?? 'TERM-EAST'; const selected = collection.terminals.find(item => item.id === selectedId)
  const selectedCallId = params.get('call') ?? selected?.plan.calls[0]?.id ?? ''
  function choose(id: string, callId?: string) { setParams(current => { const next = new URLSearchParams(current); next.set('terminal', id)
    if (callId) next.set('call', callId); else next.delete('call'); return next }) }
  function persist(next: typeof collection, message: string) { try { setCollection(saveCurrentCollection(window.localStorage, collection, next, readTerminalCollection, saveTerminalCollection)); setNotice(message); return true } catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed. Your input is preserved.'); return false } }
  function run(action: () => typeof collection, success: string) {
    try { return persist(action(), success) } catch (error) { setNotice(error instanceof Error ? error.message : 'Terminal operation failed.'); return false }
  }
  return <main className="suite-page"><header className="suite-title"><div><small>PORT / BERTH RESPONSIBILITY</small>
    <h1>Terminal berth workspace</h1><p>Independent terminal boards, shared berth restrictions and hazardous-call handoffs.</p></div></header>
    <section className="metrics" aria-label="Terminal summary">
      <article><small>Active terminals</small><strong>{collection.terminals.filter(item => !item.archived).length}</strong></article>
      <article><small>Berth assignments</small><strong>{terminalInbox(collection).length}</strong></article>
      <article><small>Restricted calls</small><strong>{collection.terminals.reduce((sum, item) => sum + item.restrictedCallIds.length, 0)}</strong></article>
    </section>
    <section className="suite-card" aria-label="Berth queue"><h2>Berth assignment queue</h2><p>This queue spans all active terminals; collection filters below do not hide responsibility.</p>
      {terminalInbox(collection).length ? <ul>{terminalInbox(collection).map(item => <li key={item.terminalId + item.assignmentId}>
        <button onClick={() => { choose(item.terminalId, item.callId) }}>{item.terminalId} / {item.callId}</button> · {item.vessel} ·
        {item.hazardous ? 'hazmat' : 'standard'} · {item.assigneeId ?? 'team queue'} · {item.restricted ? 'restricted' : 'ready'}</li>)}</ul>
        : <p>No open berth assignments.</p>}
      <label>Berth planner <select value={planner} onChange={event => { setPlanner(event.target.value) }}>
        {berthPlanners.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </section>
    <section className="suite-card" aria-label="Terminal collection"><h2>Terminal boards</h2>
      <ExplorerControls noun="terminal or vessel" view={explorer.view} onChange={explorer.setView} states={terminalTriage.states} onReset={explorer.reset} />
      {explorer.rows.length ? <ul>{explorer.rows.map(record => <li key={record.id}>
        <button aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => { choose(record.id) }}>
          {record.id}</button> · {record.plan.calls.length} calls · plan r{record.plan.revision} ·
          {record.restrictedCallIds.length} restricted{record.archived ? ' · archived' : ''} · {terminalTriage.states.find(item => item.value === terminalTriage.state(record))?.label}</li>)}</ul> : <p>{collection.terminals.length ? 'No terminals match this view. Reset the view to see available records.' : 'No terminals are available yet.'}</p>}
      <ExplorerPagination page={explorer.page} pageCount={explorer.pageCount} matchingCount={explorer.matchingCount} onPageChange={page => { explorer.setView({ page }) }} />
      <p>Bulk claims include all checked berth calls. Review the selection summary in the selected terminal before claiming.</p>
      <button disabled={!checked.length} onClick={() => { const refs = checked.map(value => {
        const [terminalId = '', callId = ''] = value.split('/'); return { terminalId, callId } })
        const result = claimTerminalCalls(collection, refs, planner)
        persist(result.collection, `${String(result.updated.length)} claimed; ${String(result.skipped.length)} skipped; ${String(result.blocked.length)} blocked.`)
      }}>Claim selected berth calls</button>
    </section>
    <section className="suite-card" aria-label="Selected terminal"><h2>{selected?.id ?? 'Select a terminal'}</h2>{selected && !explorer.rows.some(record => record.id === selected.id) && <p className="collection-context">Selected terminal is outside this collection page or view. Adjust the filters or page to locate it; its details remain open.</p>}{selected && <>
      <p>Board r{selected.plan.revision} · {selected.plan.calls.length} committed calls</p>
      <ExplorerSelection selected={checked} visible={explorer.rows.some(record => record.id === selected.id) ? selected.plan.calls.map(call => selected.id + '/' + call.id) : []} onChange={setChecked} noun="berth calls" />
      <p>Page selection applies only to the calls displayed below for this terminal when its board is on the current collection page.</p>
      <ul>{selected.plan.calls.map(call => <li key={call.id}>
        <label><input type="checkbox" checked={checked.includes(`${selected.id}/${call.id}`)} onChange={event => {
          const ref = `${selected.id}/${call.id}`
          setChecked(current => event.target.checked ? [...current, ref] : current.filter(value => value !== ref))
        }} /> Select {call.id}</label>
        <button aria-current={selectedCallId === call.id ? 'true' : undefined} onClick={() => { choose(selected.id, call.id) }}>
          {call.vessel} · {call.berth} · {call.start}:00–{call.end}:00</button> · {call.hazardous ? 'hazmat' : 'standard'} ·
          {selected.restrictedCallIds.includes(call.id) ? 'restricted' : 'available'}</li>)}</ul>
      <button onClick={() => { run(() => claimTerminalCall(collection, selected.id, selectedCallId, planner, selected.plan.revision), 'Berth call claimed.') }}>Claim selected berth call</button>
      <button onClick={() => { const restriction = collection.restrictions.find(item => item.callRefs.some(ref =>
        ref.terminalId === selected.id && ref.callId === selectedCallId))
        if (!restriction) { setNotice('No shared berth restriction links this call.'); return }
        try { const result = setRestriction(collection, restriction.id, !restriction.active, restriction.revision)
          persist(result.collection, `${String(result.updated.length)} related terminals updated; ${String(result.blocked.length)} blocked.`)
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Restriction update failed.') }
      }}>Toggle linked berth restriction</button>
      <button onClick={() => { run(() => archiveTerminal(collection, selected.id), 'Terminal archived.') }}>Archive terminal</button>
      <details><summary>Berth history</summary><ol>{selected.plan.history.map((item, index) =>
        <li key={index}>{item.action} · r{item.revision} · {item.callId}</li>)}</ol></details>
    </>}</section>
    <section className="suite-card" aria-label="Terminal audit"><h2>Collection audit</h2><ol>{collection.audit.toReversed().slice(0, 8).map((item, index) =>
      <li key={index}>{item.action} · {item.id} · {item.related.join(', ') || 'none'}</li>)}</ol></section>
    <nav aria-label="Selected record workflows">{selected && !selected.archived && <><Link to={withCollectionView(recordDetailPath(selected), params)}>Open record details</Link>{' · '}<Link to={withCollectionView(recordDecisionPath(selected), params)}>Open decision workflow</Link></>} <button onClick={() => { try { setCollection(readTerminalCollection(window.localStorage)); setNotice('Workspace refreshed; selection preserved.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Refresh failed.') } }}>Refresh workspace</button></nav>
    <p role="status">{notice}</p>
  </main>
}
