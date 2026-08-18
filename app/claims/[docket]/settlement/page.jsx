'use client';
import { useParams } from 'next/navigation';
import { PageHead, Stamp } from '../../../components';
import { claimDossier } from '../../../lib/genlayer';
import { docket, useLive } from '../../../live-data';

export default function Settlement(){
  const params=useParams(),claimId=decodeURIComponent(params.docket);
  const live=useLive(()=>claimDossier(claimId),[claimId]);
  if(live.loading)return <main className="app-page"><p className="loading">Reading settlement receipt…</p></main>;
  if(live.error||!live.data)return <main className="app-page"><div className="read-error">{live.error||'Settlement not found.'}</div></main>;
  const {claim,policy,effectiveReview,payout}=live.data;
  const eligible=Number(effectiveReview?.eligible_loss||0),deductible=Math.floor(eligible*Number(policy.deductible_bps||0)/10000),after=eligible-deductible;
  return <main className="app-page receipt-page"><PageHead eyebrow={docket(claim.claim_id)} title="Settlement receipt"><Stamp state={Number(payout)>0?'SETTLED':'DENIED'}/></PageHead><section className="receipt"><div><span>Eligible loss</span><b>{eligible} GEN</b></div><div><span>Deductible</span><b>−{deductible} GEN</b></div><div><span>After deductible</span><b>{after} GEN</b></div><div><span>Coverage limit</span><b>{policy.coverage_limit} GEN</b></div><div className="receipt-total"><span>Payout instruction</span><b>{payout} GEN</b></div><small>The contract’s stored payout is authoritative. This page does not recalculate or initiate a transfer.</small></section></main>;
}
