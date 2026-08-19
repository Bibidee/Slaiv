'use client';
import Link from 'next/link';
import { Docket, Empty, PageHead } from '../components';
import { allPolicies } from '../lib/genlayer';
import { compactId, docket, fmtDate, useLive } from '../live-data';

export default function Coverage(){
  const live=useLive(allPolicies,[]);
  return <main className="app-page">
    <PageHead eyebrow="COVERAGE MARKETPLACE" title="Available coverage">
      <p>Immutable policy schedules currently bound on the configured SLAIV contract.</p>
      <Link className="button page-action" href="/coverage/new">Bind a policy</Link>
    </PageHead>
    <div className="market">
      <aside className="filters"><b>POLICY CLAUSES</b><p>Protocol<br/><strong>GenLayer</strong></p><p>Event classes<br/><strong>Execution / appeal windows</strong></p><p>Records<br/><strong>{live.data?.length??'—'}</strong></p></aside>
      <section className="docket-grid">
        {live.loading?<p className="loading">Reading contract ledger…</p>:live.error?<div className="read-error">{live.error}<button onClick={()=>void live.refresh()}>Retry read</button></div>:live.data?.length?live.data.map(policy=><Link key={policy.policy_id} href={`/coverage/${encodeURIComponent(policy.policy_id)}`}><Docket id={docket(policy.policy_id)} state="BOUND"><p className="case-label">BOUND POLICY SCHEDULE</p><h2 className="identifier-title" title={policy.validator}>{compactId(policy.validator)}</h2><div className="policy-facts"><span>Network <b>{policy.subject_network}</b></span><span>Window <b>{fmtDate(policy.coverage_start_ts)} — {fmtDate(policy.coverage_end_ts)}</b></span><span>Limit <b>{policy.coverage_limit} GEN</b></span><span>Deductible <b>{Number(policy.deductible_bps)/100}%</b></span></div></Docket></Link>):<Empty href="/coverage/new" label="Bind the first policy →">No live coverage is currently bound on this contract.</Empty>}
      </section>
    </div>
  </main>;
}
