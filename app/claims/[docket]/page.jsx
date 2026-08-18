'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHead, Stamp } from '../../components';
import { allowedActions } from '../../lib/actions';
import { evidenceFrom, newId } from '../../lib/evidence';
import { claimDossier, parse, read } from '../../lib/genlayer';
import { docket, fmtDate, stampFor, useLive } from '../../live-data';
import { TxStatus } from '../../tx-status';
import { useTransaction } from '../../use-transaction';
import { useWallet } from '../../wallet-provider';

const stages=['FILED','EVIDENCE ASSEMBLED','GENLAYER JUDGMENT','DECISION','FINAL'];
function EvidenceFields(){return <><label>Evidence ID<input name="evidenceId" defaultValue={newId('evd')} required minLength="3" maxLength="80"/></label><label>Source<input name="source" required maxLength="500"/></label><label>HTTPS reference<input name="reference" type="url" required maxLength="2000"/></label><label>Evidence content<textarea name="content" required maxLength="4000"/></label></>}
function AppealForm({claim,run}){return <details><summary>Appeal ruling</summary><form onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget),evidence=await evidenceFrom(event.currentTarget,claim.claim_id);await run('record_appeal',[claim.claim_id,data.get('ground'),evidence])}}><label>Grounds<textarea name="ground" minLength="20" maxLength="2000" required/></label><EvidenceFields/><button className="button">Record appeal</button></form></details>}

function ActionPanel({claim,isClaimant,isAuthority,connected,run,tx}){
  const actions=allowedActions(claim.state,{isClaimant,connected});
  if(claim.state==='FINAL')return <section className="case-panel"><p className="eyebrow">DOCKET CLOSED</p><p className="empty-copy">Final state is terminal and read-only.</p></section>;
  return <section className="case-panel action-panel"><p className="eyebrow">AUTHORIZED ACTIONS</p>
    {!connected?<p className="form-note">Connect an injected wallet to expose its authorized actions.</p>:null}
    {claim.state==='AWAITING_FINALITY'?<div className="finality-boundary"><strong>Protocol finality pending</strong><p>SLAIV only advances after the configured operator adapter verifies an authoritative GenLayer staking or slashing record.</p>{isAuthority?<small>Finality must be recorded through the verified operator adapter.</small>:null}</div>:null}
    {actions.includes('APPEND_EVIDENCE')?<details><summary>Add claimant evidence</summary><form onSubmit={async event=>{event.preventDefault();const evidence=await evidenceFrom(event.currentTarget,claim.claim_id);await run('append_evidence',[claim.claim_id,evidence,evidence.content_hash])}}><EvidenceFields/><button className="button">Add exhibit</button></form></details>:null}
    {actions.includes('REVIEW')?<button className="button" onClick={()=>void run('review_slashing_claim',[claim.claim_id])}>Run GenLayer judgment</button>:null}
    {actions.includes('FINALIZE')?<button className="button" onClick={()=>void run('finalize_claim',[claim.claim_id])}>Finalize instruction</button>:null}
    {actions.includes('APPEAL')?<AppealForm claim={claim} run={run}/>:null}
    {actions.includes('REVIEW_APPEAL')?<button className="button" onClick={()=>void run('review_appeal',[claim.claim_id])}>Run appeal judgment</button>:null}
    {!actions.length&&connected?<p className="form-note">No wallet action is permitted in this state.</p>:null}<TxStatus tx={tx}/>
  </section>;
}

export default function Case(){
  const params=useParams(),claimId=decodeURIComponent(params.docket),wallet=useWallet(),transaction=useTransaction();
  const live=useLive(async()=>{const dossier=await claimDossier(claimId);const authority=parse(await read('get_protocol_authority'),{});return {dossier,authority}},[claimId]);
  const run=async(method,args)=>{try{await transaction.execute(method,args);await live.refresh()}catch{}};
  if(live.loading)return <main className="app-page"><p className="loading">Assembling docket…</p></main>;
  if(live.error||!live.data?.dossier)return <main className="app-page"><div className="read-error">{live.error||'Claim docket not found.'}</div></main>;
  const {claim,policy,evidence,review,effectiveReview,payout}=live.data.dossier;
  const account=wallet.address?.toLowerCase(),claimant=String(claim.claimant).toLowerCase(),authority=String(live.data.authority.authority||'').toLowerCase(),isClaimant=account===claimant,isAuthority=account===authority,current=effectiveReview||review;
  return <main className="app-page"><PageHead eyebrow={docket(claim.claim_id)} title="Adjudication docket"><div className="schedule-head"><Stamp state={stampFor(claim.state,payout)}/><span>{claim.state.replaceAll('_',' ')}</span></div></PageHead>
    <div className="case-rail">{stages.map((stage,index)=><span className={index<=({AWAITING_FINALITY:1,UNDER_REVIEW:2,APPROVED:3,PARTIALLY_APPROVED:3,DENIED:3,UNRESOLVED:3,APPEALED:3,FINAL:4}[claim.state]??0)?'reached':''} key={stage}>{stage}</span>)}</div>
    <section className="case-layout"><article>
      <section className="case-panel"><p className="eyebrow">FACTUAL RECORD</p><div className="fact-grid"><span>Claimant<b>{claim.claimant}</b></span><span>Policy ID<b><Link href={`/coverage/${claim.policy_id}`}>{claim.policy_id}</Link></b></span><span>Validator<b>{claim.validator}</b></span><span>Incident<b>{fmtDate(claim.incident_at_ts)}</b></span><span>Documented loss<b>{claim.documented_loss} GEN</b></span><span>Protocol finality<b>{claim.underlying_finality}</b></span></div></section>
      <section className="case-panel"><p className="eyebrow">JUDGMENT</p>{current?<div className="judgment"><div><span>Eligibility</span><b>{current.eligibility}</b></div><div><span>Incident class</span><b>{current.incident_class}</b></div><div><span>Policy covers event</span><b>{String(current.covered_event)}</b></div><div><span>Exclusion triggered</span><b>{String(current.exclusion_triggered)}</b></div><div><span>Eligible loss</span><b>{current.eligible_loss} GEN</b></div><p>{current.reasoning_summary}</p><small>Evidence weighed: {(current.supported_evidence_ids||[]).join(', ')}</small></div>:<p className="empty-copy">No GenLayer ruling has been recorded.</p>}</section>
      <ActionPanel claim={claim} isClaimant={isClaimant} isAuthority={isAuthority} connected={Boolean(account)} run={run} tx={transaction.tx}/>
    </article><aside className="exhibits"><p className="eyebrow">EXHIBITS</p>{evidence.map((item,index)=><div className="exhibit" key={item.evidence_id}><code>EX-{String.fromCharCode(65+index)} · {item.evidence_id}</code><Stamp state={item.kind==='PROTOCOL_FACT'?'SETTLED':'BOUND'}/><b>{item.kind.replaceAll('_',' ')}</b><span>{item.source}</span><a href={item.reference} target="_blank" rel="noreferrer">Source record ↗</a><small>{fmtDate(item.submitted_at)} · {item.content_hash} · {item.submitted_by||'submitter unavailable'}</small></div>)}{!evidence.length?<p className="empty-copy">No exhibits recorded.</p>:null}
      <section className="policy-mini"><p className="eyebrow">DETERMINISTIC POLICY BOUNDARY</p><span>Coverage network<b>{policy.subject_network}</b></span><span>Validator<b>{policy.validator}</b></span><span>Coverage period<b>{fmtDate(policy.coverage_start_ts)} — {fmtDate(policy.coverage_end_ts)}</b></span><span>Covered events<b>{(policy.covered_events||[]).join(', ')}</b></span><span>Exclusions<b>{(policy.exclusions||[]).join(', ')||'None recorded'}</b></span><span>Coverage limit<b>{policy.coverage_limit} GEN</b></span><span>Deductible<b>{Number(policy.deductible_bps)/100}%</b></span></section>{claim.state==='FINAL'?<Link className="button" href={`/claims/${claim.claim_id}/settlement`}>View settlement</Link>:null}
    </aside></section>
  </main>;
}
