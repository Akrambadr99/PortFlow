import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { berths, cranes, planFindings } from './berthPlan'
import type { PortCall } from './berthPlan'
import { appendCall, cancelCall, readPortPlan, savePortPlan } from './portPlanLedger'
export function BerthCranePlanningBoardPage() {
  const { date } = useParams()
  const [plan, setPlan] = useState(() => readPortPlan(window.localStorage))
  const calls = plan.calls
  const [candidate, setCandidate] = useState<PortCall>({
    id: 'CALL-43', vessel: 'Meridian', berth: 'B04', crane: 'QC-7',
    start: 12, end: 18, moves: 140, hazardous: false,
  })
  const [notice, setNotice] = useState('')
  const findings = planFindings(candidate, calls)
  function update<K extends keyof PortCall>(key: K, value: PortCall[K]) {
    setCandidate(current => ({ ...current, [key]: value }))
  }
  function commit() {
    if (findings.length) { setNotice('Resolve resource conflicts before committing.'); return }
    setPlan(savePortPlan(window.localStorage, appendCall(plan, candidate)))
    setCandidate(current => ({ ...current, id: 'CALL-' + String(Number(current.id.slice(5)) + 1) }))
    setNotice(`${candidate.vessel} plan committed.`)
  }
  function cancel(id: string) {
    try { setPlan(savePortPlan(window.localStorage, cancelCall(plan, id))); setNotice(`${id} cancelled.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Cancellation failed.') }
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>TERMINAL / RESOURCE PLAN</small>
      <h1>Berth and crane planning board</h1><p>{date ?? '2026-09-14'} · Vessel, crane, and dangerous-goods constraints</p>
    </div></header>
    <section className="suite-card">
      <h2>Committed calls</h2>
      <table><caption>Vessel Aurora and terminal resource plan</caption>
        <thead><tr><th>Vessel</th><th>Berth</th><th>Window</th><th>Crane</th><th>Moves</th><th>Action</th></tr></thead>
        <tbody>{calls.map(call => <tr key={call.id}><th scope="row">{call.vessel}</th>
          <td>Berth {call.berth}</td><td>{call.start}:00–{call.end}:00</td><td>Crane {call.crane}</td><td>{call.moves}</td>
          <td>{call.id === 'CALL-41' || call.id === 'CALL-42' ? 'Baseline' : <button onClick={() => { cancel(call.id) }}>Cancel {call.id}</button>}</td>
        </tr>)}</tbody>
      </table>
      <p>Plan revision {plan.revision} · {plan.recoveryFor.length} recovery publication(s).</p>
    </section>
    <section className="suite-card" aria-label="Plan another vessel">
      <h2>Plan another vessel</h2>
      <label>Vessel <input value={candidate.vessel} onChange={event => { update('vessel', event.target.value); }} /></label>
      <label>Berth <select value={candidate.berth} onChange={event => { update('berth', event.target.value); }}>
        {berths.map(item => <option key={item.id}>{item.id}</option>)}</select></label>
      <label>Crane <select value={candidate.crane} onChange={event => { update('crane', event.target.value); }}>
        {cranes.map(item => <option key={item.id}>{item.id}</option>)}</select></label>
      <label>Start hour <input type="number" min="0" max="23" value={candidate.start} onChange={event => { update('start', Number(event.target.value)); }} /></label>
      <label>End hour <input type="number" min="1" max="24" value={candidate.end} onChange={event => { update('end', Number(event.target.value)); }} /></label>
      <label>Moves <input type="number" min="1" value={candidate.moves} onChange={event => { update('moves', Number(event.target.value)); }} /></label>
      <label><input type="checkbox" checked={candidate.hazardous} onChange={event => { update('hazardous', event.target.checked); }} /> Dangerous goods</label>
      <h3>Plan findings</h3>
      {findings.length ? <ul>{findings.map(item => <li key={item}>{item}</li>)}</ul> : <p>No resource conflicts.</p>}
      <button disabled={findings.length > 0 || !candidate.vessel.trim()} onClick={commit}>Commit call</button>
      <p role="status">{notice}</p>
    </section>
  </div>
}
