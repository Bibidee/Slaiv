import { execFileSync } from 'node:child_process';
import { protocolEvidence } from '../src/protocol-evidence.js';

const arg=name=>{const index=process.argv.indexOf(name);return index<0?'':process.argv[index+1]||''};
const claimId=arg('--claim-id');
const eventId=arg('--event-id'); const dryRun=process.argv.includes('--dry-run');
if(!claimId)throw Error('Usage: npm run adapter:finality -- --claim-id clm_… --event-id official-event-id');
const address=process.env.SLAIV_CLAIMS_ADDRESS||process.env.NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS;
const rpc=process.env.GENLAYER_RPC_URL||process.env.NEXT_PUBLIC_GENLAYER_RPC_URL||'https://studio.genlayer.com/api';
const template=process.env.PROTOCOL_FINALITY_SOURCE_URL;
const allowed=(process.env.PROTOCOL_FINALITY_ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean);
if(!address)throw Error('Set SLAIV_CLAIMS_ADDRESS.');
const cli=(args)=>execFileSync('npx',['--yes','genlayer@0.39.2',...args],{encoding:'utf8',stdio:['ignore','pipe','inherit']});
const decode=output=>{const match=output.match(/Result:\s*\n([\s\S]*?)\n\n√/);if(!match)throw Error('Unable to parse GenLayer CLI result.');return JSON.parse(match[1]);};
const claim=JSON.parse(decode(cli(['call',address,'get_claim','--args',claimId,'--rpc',rpc])));
let record;
if(template){
  const sourceUrl=template.replace('{claimId}',encodeURIComponent(claimId)); const origin=new URL(sourceUrl).origin;
  if(!allowed.includes(origin))throw Error(`Source origin is not allowlisted: ${origin}`);
  const response=await fetch(sourceUrl,{headers:{accept:'application/json'}}); if(!response.ok)throw Error(`Authoritative source returned HTTP ${response.status}.`);
  record=await response.json();
}else{
  if(!eventId)throw Error('Official CLI mode requires --event-id. Refusing to infer a slash from validator history.');
  const history=cli(['staking','validator-history',claim.validator,'--all','--rpc',rpc]);
  if(!history.includes(eventId))throw Error('The supplied event ID was not found in official GenLayer validator history.');
  record={claim_id:claimId,validator:claim.validator,finality:'FINAL',observed_at_ts:Math.floor(Date.now()/1000),reference:`${rpc}/validator-history/${claim.validator}?event=${encodeURIComponent(eventId)}`,network:process.env.GENLAYER_NETWORK||process.env.NEXT_PUBLIC_GENLAYER_NETWORK||'studionet',event_id:eventId,official_history:history};
}
const evidence=await protocolEvidence(record,{claimId,validator:claim.validator});
if(!dryRun)cli(['write',address,'record_protocol_finality','--args',claimId,JSON.stringify(evidence),'--rpc',rpc]);
console.log(JSON.stringify({claimId,evidence},null,2));
