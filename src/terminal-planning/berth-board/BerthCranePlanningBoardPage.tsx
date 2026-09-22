import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { berths, cranes, planFindings } from './berthPlan'
import type { PortCall } from './berthPlan'
import { appendCall, assignBerthCall, berthWorkQueue, cancelCall, readPortPlan, reassignCall, rescheduleCall, reschedulePolicy, savePortPlan } from './portPlanLedger'
import { berthInbox, berthPlanners, bulkClaimBerths, claimBerthCall, directAssignHazmat, plannerWorkload, releaseBerthClaim } from './berthWorkload'
export function BerthCranePlanningBoardPage() {
  const { date } = useParams()
  const [plan, setPlan] = useState(() => readPortPlan(window.localStorage))
  const calls = plan.calls
  const [candidate, setCandidate] = useState<PortCall>({
    id: 'CALL-43', vessel: 'Meridian', berth: 'B04', crane: 'QC-7',
    start: 12, end: 18, moves: 140, hazardous: false,
  })
  const [notice, setNotice] = useState('')
  const [actor, setActor] = useState('terminal planner')
  const [plannerId, setPlannerId] = useState('planner-ava')
  const [queueCallId, setQueueCallId] = useState('CALL-41')
  const [handoffReason, setHandoffReason] = useState('')
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
  function delayCall(call: PortCall) {
    try { setPlan(savePortPlan(window.localStorage, rescheduleCall(plan, call.id, call.start + 1, call.end + 1, actor, plannerId))); setNotice(`${call.id} rescheduled by one hour; demurrage recalculated.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Rescheduling failed.') }
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>TERMINAL / RESOURCE PLAN</small>
      <h1>Berth and crane planning board</h1><p>{date ?? '2026-09-14'} · Vessel, crane, and dangerous-goods constraints</p>
    </div></header>
    <section className="suite-card">
      <h2>Committed calls</h2>
      <label>Planning actor <select value={actor} onChange={event => { setActor(event.target.value) }}><option>terminal planner</option><option>hazmat supervisor</option></select></label>
      <label>Named planner <select value={plannerId} onChange={event => { setPlannerId(event.target.value) }}>
        {berthPlanners.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      {actor === 'hazmat supervisor' && <label>Ownership reason <input value={handoffReason} onChange={event => { setHandoffReason(event.target.value) }} /></label>}
      <table><caption>Vessel Aurora and terminal resource plan</caption>
        <thead><tr><th>Vessel</th><th>Berth</th><th>Window</th><th>Crane</th><th>Moves</th><th>Action</th></tr></thead>
        <tbody>{calls.map(call => <tr key={call.id}><th scope="row">{call.vessel}</th>
          <td>Berth {call.berth}</td><td>{call.start}:00–{call.end}:00</td><td>Crane {call.crane}</td><td>{call.moves}</td>
          <td>{call.id === 'CALL-41' || call.id === 'CALL-42' ? 'Baseline' : <><p>Owner: {plan.callOwners[call.id] ?? 'terminal planner'} · Queue: {reschedulePolicy(plan, call.id, call.start + 1, call.end + 1, actor).queue}</p><button onClick={() => { cancel(call.id) }}>Cancel {call.id}</button><button disabled={!reschedulePolicy(plan, call.id, call.start + 1, call.end + 1, actor).allowed} onClick={() => { delayCall(call) }}>Delay {call.id} one hour</button>{actor === 'hazmat supervisor' && <button disabled={handoffReason.trim().length < 12} onClick={() => { try { setPlan(savePortPlan(window.localStorage, reassignCall(plan, call.id, 'hazmat supervisor', actor, handoffReason))); setNotice(`${call.id} reassigned.`) } catch (error) { setNotice(error instanceof Error ? error.message : 'Reassignment failed.') } }}>Take ownership</button>}</>}</td>
        </tr>)}</tbody>
      </table>
      <p>Plan revision {plan.revision} · {plan.recoveryFor.length} recovery publication(s).</p>
      <section aria-label="Planner workload">
        <h3>Named berth workload</h3>
        <p>{plannerWorkload(plan, plannerId)} active call(s) for {plannerId}</p>
        {berthInbox(plan).map(item => <div key={item.assignmentId}>
          <p>{item.callId} · {item.vessel} · {item.berth} · {item.assigneeId ?? 'team queue'}</p>
          {!item.assigneeId && <button onClick={() => { try {
            setPlan(savePortPlan(window.localStorage, claimBerthCall(plan, item.callId, plannerId, plan.revision)))
            setNotice(item.callId + ' claimed.')
          } catch (error) { setNotice(error instanceof Error ? error.message : 'Claim failed.') } }}>Claim {item.callId}</button>}
          {!item.assigneeId && item.hazardous && actor === 'hazmat supervisor' && <button onClick={() => { try {
            setPlan(savePortPlan(window.localStorage, directAssignHazmat(plan, item.callId, plannerId, actor,
              handoffReason || 'Supervisor assigned qualified hazmat planning.')))
            setNotice(item.callId + ' directly assigned.')
          } catch (error) { setNotice(error instanceof Error ? error.message : 'Assignment failed.') } }}>Directly assign {item.callId}</button>}
          {item.assigneeId === plannerId && <button onClick={() => { try {
            setPlan(savePortPlan(window.localStorage, releaseBerthClaim(plan, item.callId, plannerId)))
            setNotice(item.callId + ' returned to team queue.')
          } catch (error) { setNotice(error instanceof Error ? error.message : 'Release failed.') } }}>Release {item.callId}</button>}
        </div>)}
        {actor === 'hazmat supervisor' && <><label>Call to queue <select value={queueCallId} onChange={event => { setQueueCallId(event.target.value) }}>
          {calls.map(call => <option key={call.id} value={call.id}>{call.id} · {call.vessel}</option>)}
        </select></label><button onClick={() => { try {
          setPlan(savePortPlan(window.localStorage, assignBerthCall(plan, queueCallId,
            calls.find(call => call.id === queueCallId)?.hazardous ? 'hazmat supervisor' : 'terminal planner', actor,
            handoffReason || 'Supervisor opened planner work queue.')))
          setNotice(queueCallId + ' queued for named planning.')
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Queue failed.') } }}>Queue planning assignment</button></>}
        <button onClick={() => {
          const result = bulkClaimBerths(plan, berthInbox(plan).filter(item => !item.assigneeId).map(item => item.callId), plannerId)
          setPlan(savePortPlan(window.localStorage, result.plan))
          setNotice(`${String(result.applied.length)} claimed; ${String(result.skipped.length)} skipped; ${String(result.failed.length)} failed.`)
        }}>Claim eligible calls</button>
      </section>
      {(plan.berthAssignments ?? []).length > 0 && <div aria-label="Berth work queue">
        <h3>Planner handoffs</h3>
        {(plan.berthAssignments ?? []).map(item => <p key={item.id}>{item.callId} · {item.assignee} · {item.status} · {item.reason}</p>)}
        <p>{berthWorkQueue(plan, actor).length} active call(s) assigned to current actor</p>
      </div>}
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
