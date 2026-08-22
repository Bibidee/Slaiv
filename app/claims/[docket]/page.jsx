'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHead, Stamp } from '../../components';
import { allowedActions } from '../../lib/actions';
import { evidenceFrom, newId } from '../../lib/evidence';
import { claimDossier } from '../../lib/genlayer';
import { docket, fmtDate, stampFor, useLive } from '../../live-data';
import { TxStatus } from '../../tx-status';
import { useTransaction } from '../../use-transaction';
import { useWallet } from '../../wallet-provider';

const stages=['FILED','EVIDENCE ASSEMBLED','GENLAYER JUDGMENT','DECISION','FINAL'];
// Claimant assertions store real bounded text in contract state so GenLayer
// judgment can inspect it directly. Public-source evidence carries no
// content field at all -- the contract independently fetches the reference
// URL itself, so a "content" textarea here would only create data the
// contract discards.
function ClaimantEvidenceFields(){return <><label>Evidence ID<input name="evidenceId" defaultValue={newId('evd')} required minLength="3" maxLength="80"/></label><label>Source<input name="source" required maxLength="500"/></label><label>HTTPS reference<input name="reference" type="url" required maxLength="2000"/></label><label>Claimant statement<textarea name="content" required maxLength="4000" placeholder="State what happened, in your own words. GenLayer judgment reads this text directly."/></label></>}
function PublicEvidenceFields(){return <><label>Evidence ID<input name="evidenceId" defaultValue={newId('evd')} required minLength="3" maxLength="80"/></label><label>Source label<input name="source" required maxLength="500" placeholder="e.g. GenLayer explorer, news outlet"/></label><label>Public HTTPS URL<input name="reference" type="url" required pattern="https://.*" maxLength="2000" placeholder="https://…"/></label></>}
function AppealForm({claim,run,quotas}){const appealFull=quotas&&quotas.appeal_used>=quotas.appeal_max;return <details><summary>Appeal ruling</summary>{appealFull?<p className="form-note">Appeal evidence slot already used ({quotas.appeal_used}/{quotas.appeal_max}).</p>:null}<form onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget),evidence=await evidenceFrom(event.currentTarget,claim.claim_id);await run('record_appeal',[claim.claim_id,data.get('ground'),evidence])}}><label>Grounds<textarea name="ground" minLength="20" maxLength="2000" required/></label><ClaimantEvidenceFields/><button className="button" disabled={appealFull}>Record appeal</button></form></details>}
function PublicEvidenceForm({claim,run,quotas}){
  const full=quotas&&quotas.public_used>=quotas.public_max;
  if(full)return <div className="form-note">Public-source evidence quota reached for this claim ({quotas.public_used}/{quotas.public_max}). No further public exhibits can be added.</div>;
  return <details><summary>Add public-source evidence{quotas?` (${quotas.public_used}/${quotas.public_max} used)`:''}</summary><form onSubmit={async event=>{event.preventDefault();const evidence=await evidenceFrom(event.currentTarget,claim.claim_id,'PUBLIC_SOURCE');await run('append_evidence',[claim.claim_id,evidence,evidence.content_hash])}}><p className="form-note">Any wallet may bind a public source URL to the open dossier (per-wallet cap: {quotas?.public_per_wallet_max}). GenLayer judgment retrieves the URL itself; public evidence is not protocol finality and cannot by itself unlock judgment.</p><PublicEvidenceFields/><button className="button">Add public exhibit</button></form></details>;
}
function FinalityForm({claim,run}){return <details open><summary>Verify protocol event</summary><form onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await run('verify_protocol_finality',[claim.claim_id,String(data.get('eventId')||'').trim()])}}><p className="form-note">Anyone can submit a candidate GenLayer transaction hash. The caller does not set finality, validator identity, or incident class -- SLAIV queries the official GenLayer node RPC for the policy&apos;s network itself, and GenLayer validators must independently agree on what that RPC returns.</p><label>GenLayer transaction hash<input name="eventId" placeholder="0x…" pattern="0x[0-9a-fA-F]{64}" required/></label><button className="button">Verify with GenLayer consensus</button></form></details>}

function ActionPanel({claim,isClaimant,connected,run,tx,quotas}){
  const actions=allowedActions(claim.state,{isClaimant,connected,appealDeadlineTs:claim.appeal_deadline_ts,appealResolved:Boolean(claim.appeal_resolved)});
  if(claim.state==='FINAL')return <section className="case-panel"><p className="eyebrow">DOCKET CLOSED</p><p className="empty-copy">Final state is terminal and read-only.</p></section>;
  const claimantFull=quotas&&quotas.claimant_used>=quotas.claimant_max;
  return <section className="case-panel action-panel"><p className="eyebrow">AVAILABLE ACTIONS</p>
    {!connected?<p className="form-note">Connect an injected wallet to trigger permissionless protocol actions.</p>:null}
    {claim.state==='AWAITING_FINALITY'?<div className="finality-boundary"><strong>Protocol finality pending</strong><p>No operator approval is required. Any connected wallet may add public-source evidence or submit an official GenLayer event for consensus verification. SLAIV advances only if independent validators agree that the official source proves a matching final protocol event.</p></div>:null}
    {actions.includes('APPEND_EVIDENCE')?(claimantFull?<p className="form-note">Claimant evidence quota reached ({quotas.claimant_used}/{quotas.claimant_max}).</p>:<details><summary>Add claimant evidence{quotas?` (${quotas.claimant_used}/${quotas.claimant_max} used)`:''}</summary><form onSubmit={async event=>{event.preventDefault();const evidence=await evidenceFrom(event.currentTarget,claim.claim_id);await run('append_evidence',[claim.claim_id,evidence,evidence.content_hash])}}><ClaimantEvidenceFields/><button className="button">Add claimant exhibit</button></form></details>):null}
    {actions.includes('APPEND_PUBLIC_EVIDENCE')?<PublicEvidenceForm claim={claim} run={run} quotas={quotas}/>:null}
    {actions.includes('VERIFY_FINALITY')?<FinalityForm claim={claim} run={run}/>:null}
    {actions.includes('REVIEW')?<button className="button" onClick={()=>void run('review_slashing_claim',[claim.claim_id])}>Run GenLayer judgment</button>:null}
    {actions.includes('FINALIZE')?<button className="button" onClick={()=>void run('finalize_claim',[claim.claim_id])}>Finalize claim</button>:null}
    {actions.includes('APPEAL')?<AppealForm claim={claim} run={run} quotas={quotas}/>:null}
    {actions.includes('REVIEW_APPEAL')?<button className="button" onClick={()=>void run('review_appeal',[claim.claim_id])}>Run appeal judgment</button>:null}
    {!actions.length&&connected?<p className="form-note">No action is currently available for this wallet and claim state.</p>:null}<TxStatus tx={tx}/>
  </section>;
}

export default function Case(){
  const params=useParams(),claimId=decodeURIComponent(params.docket),wallet=useWallet(),transaction=useTransaction();
  const live=useLive(async()=>({dossier:await claimDossier(claimId)}),[claimId]);
  const run=async(method,args)=>{try{await transaction.execute(method,args);await live.refresh()}catch{}};
  if(live.loading)return <main className="app-page"><p className="loading">Assembling docket…</p></main>;
  if(live.error||!live.data?.dossier)return <main className="app-page"><div className="read-error">{live.error||'Claim docket not found.'}</div></main>;
  const {claim,policy,evidence,review,effectiveReview,payout,quotas}=live.data.dossier;
  const account=wallet.address?.toLowerCase(),claimant=String(claim.claimant).toLowerCase(),isClaimant=account===claimant,current=effectiveReview||review;
  return <main className="app-page"><PageHead eyebrow={docket(claim.claim_id)} title="Adjudication docket"><div className="schedule-head"><Stamp state={stampFor(claim.state,payout)}/><span>{claim.state.replaceAll('_',' ')}</span></div></PageHead>
    <div className="case-rail">{stages.map((stage,index)=><span className={index<=({AWAITING_FINALITY:1,UNDER_REVIEW:2,APPROVED:3,PARTIALLY_APPROVED:3,DENIED:3,UNRESOLVED:3,APPEALED:3,FINAL:4}[claim.state]??0)?'reached':''} key={stage}>{stage}</span>)}</div>
    <section className="case-layout"><article>
      <section className="case-panel"><p className="eyebrow">FACTUAL RECORD</p><div className="fact-grid"><span>Claimant<b>{claim.claimant}</b></span><span>Policy ID<b><Link href={`/coverage/${claim.policy_id}`}>{claim.policy_id}</Link></b></span><span>Validator<b>{claim.validator}</b></span><span>Incident<b>{fmtDate(claim.incident_at_ts)}</b></span><span>Documented loss<b>{claim.documented_loss} GEN</b></span><span>Protocol finality<b>{claim.underlying_finality}</b></span>{claim.protocol_event_id?<span>Verified event<b>{claim.protocol_event_id}</b></span>:null}{claim.appeal_deadline_ts?<span>Appeal deadline<b>{fmtDate(claim.appeal_deadline_ts)}</b></span>:null}</div></section>
      <section className="case-panel"><p className="eyebrow">JUDGMENT</p>{current?<div className="judgment"><div><span>Eligibility</span><b>{current.eligibility}</b></div><div><span>Incident class</span><b>{current.incident_class}</b></div><div><span>Policy covers event</span><b>{String(current.covered_event)}</b></div><div><span>Exclusion triggered</span><b>{String(current.exclusion_triggered)}</b></div><div><span>Eligible loss</span><b>{current.eligible_loss} GEN</b></div><p>{current.reasoning_summary}</p><small>Evidence weighed: {(current.supported_evidence_ids||[]).join(', ')}</small></div>:<p className="empty-copy">No GenLayer ruling has been recorded.</p>}</section>
      <ActionPanel claim={claim} isClaimant={isClaimant} connected={Boolean(account)} run={run} tx={transaction.tx} quotas={quotas}/>
    </article><aside className="exhibits"><p className="eyebrow">EXHIBITS</p>{evidence.map((item,index)=><div className="exhibit" key={item.evidence_id}><code>EX-{String.fromCharCode(65+index)} · {item.evidence_id}</code><Stamp state={item.kind==='PROTOCOL_FACT'?'SETTLED':'BOUND'}/><b>{item.kind.replaceAll('_',' ')}</b><span>{item.source}</span><a href={item.reference} target="_blank" rel="noreferrer">Source record ↗</a><small>{fmtDate(item.submitted_at)} · {item.content_hash} · {item.submitted_by||'submitter unavailable'}</small></div>)}{!evidence.length?<p className="empty-copy">No exhibits recorded.</p>:null}
      <section className="policy-mini"><p className="eyebrow">DETERMINISTIC POLICY BOUNDARY</p><span>Coverage network<b>{policy.subject_network}</b></span><span>Validator<b>{policy.validator}</b></span><span>Coverage period<b>{fmtDate(policy.coverage_start_ts)} — {fmtDate(policy.coverage_end_ts)}</b></span><span>Covered events<b>{(policy.covered_events||[]).join(', ')}</b></span><span>Exclusions<b>{(policy.exclusions||[]).join(', ')||'None recorded'}</b></span><span>Coverage limit<b>{policy.coverage_limit} GEN</b></span><span>Deductible<b>{Number(policy.deductible_bps)/100}%</b></span></section>{claim.state==='FINAL'?<Link className="button" href={`/claims/${claim.claim_id}/settlement`}>View settlement</Link>:null}
    </aside></section>
  </main>;
}
