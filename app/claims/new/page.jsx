'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHead, Stamp } from '../../components';
import { newId, sha256 } from '../../lib/evidence';
import { parse, read } from '../../lib/genlayer';
import { TxStatus } from '../../tx-status';
import { useTransaction } from '../../use-transaction';
import { useWallet } from '../../wallet-provider';

function ClaimForm(){
  const query=useSearchParams(),router=useRouter(),wallet=useWallet(),transaction=useTransaction();
  const preset=query.get('policy')||'';
  const submit=async event=>{
    event.preventDefault();
    try{
      const form=new FormData(event.currentTarget),policyId=String(form.get('policyId'));
      const policy=parse(await read('get_policy',[policyId]),null);
      if(!policy)throw new Error('Policy docket not found.');
      const claimId=newId('clm');
      const claim={policy_id:policyId,claimant:wallet.address.toLowerCase(),validator:policy.validator,incident_at_ts:Math.floor(Date.parse(String(form.get('incident')))/1000),documented_loss:Number(form.get('loss'))};
      // The contract requires evidence_commitment to be a proper 64-hex
      // sha256 digest, not an arbitrary label -- commit to the claim's own
      // content so the hash is at least meaningfully derived.
      const evidenceCommitment=await sha256(JSON.stringify(claim));
      await transaction.execute('submit_claim',[claimId,policyId,claim,evidenceCommitment]);
      router.push(`/claims/${claimId}`);
    }catch(error){transaction.fail(error)}
  };
  return <main className="app-page narrow"><PageHead eyebrow="ASSEMBLE THE RECORD" title="File a claim"><p>Build the factual record before the case is docketed.</p></PageHead><section className="record-form"><div className="form-intro"><Stamp state="UNDER REVIEW"/><p>Once filed, any wallet may permissionlessly submit a candidate GenLayer transaction hash for protocol-finality verification -- the caller cannot choose the verified outcome.</p></div><form onSubmit={event=>void submit(event)}><label>Policy ID<input name="policyId" defaultValue={preset} required placeholder="pol_…"/></label><label>Incident time<input name="incident" type="datetime-local" required/></label><label>Documented loss<input name="loss" type="number" min="1" required placeholder="GEN"/></label><button className="button" disabled={!wallet.address||Boolean(transaction.tx.stage&&transaction.tx.stage!=='ERROR')}>File claim</button></form><TxStatus tx={transaction.tx}/>{!wallet.address?<p className="form-note">Connect the policy-holder wallet before filing.</p>:null}</section></main>;
}

export default function Claim(){return <Suspense fallback={<main className="app-page"><p className="loading">Preparing claim record…</p></main>}><ClaimForm/></Suspense>}
