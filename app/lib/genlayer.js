'use client';
import { createAccount, createClient } from 'genlayer-js';
import { localnet, studionet, testnetAsimov, testnetBradbury } from 'genlayer-js/chains';
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types';

const chains={localnet,studionet,testnetAsimov,testnetBradbury};
export const NETWORK=process.env.NEXT_PUBLIC_GENLAYER_NETWORK||'studionet';
export const ENDPOINT=process.env.NEXT_PUBLIC_GENLAYER_RPC_URL||'https://studio.genlayer.com/api';
export const CONTRACT_ADDRESS=process.env.NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS||'';
export const RELEASE=process.env.NEXT_PUBLIC_SLAIV_RELEASE||'unreleased';
export const CHAIN=chains[NETWORK];
export function ensureDeployment(){if(!CHAIN)throw new Error('Unsupported GenLayer network configuration.');if(!CONTRACT_ADDRESS)throw new Error('SLAIV contract is not configured.');return CONTRACT_ADDRESS}
export function readClient(){return createClient({chain:CHAIN,endpoint:ENDPOINT,account:createAccount()})}
const providerErrorCode=error=>error&&typeof error==='object'?(error.code??error.data?.originalError?.code??error.data?.code):undefined;
const providerErrorMessage=error=>[error?.shortMessage,error?.data?.message,error?.error?.message,error?.cause?.message,error?.message].find(value=>typeof value==='string'&&value.trim())||'';
export async function ensureInjectedNetwork(provider){
  if(!provider||typeof provider.request!=='function')throw new Error('The selected injected wallet is unavailable. Select the wallet again and reconnect.');
  if(!CHAIN)throw new Error('Unsupported GenLayer network configuration.');
  const chainId=`0x${CHAIN.id.toString(16)}`;
  const same=value=>String(value||'').toLowerCase()===chainId.toLowerCase();
  const current=await provider.request({method:'eth_chainId'});
  if(same(current))return chainId;
  const explorer=CHAIN.blockExplorers?.default?.url;
  const chainParams={chainId,chainName:CHAIN.name,rpcUrls:[ENDPOINT],nativeCurrency:CHAIN.nativeCurrency,...(explorer?{blockExplorerUrls:[explorer]}:{})};
  try{
    await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});
  }catch(error){
    const code=providerErrorCode(error),message=providerErrorMessage(error);
    const missing=code===4902||/unknown chain|unrecognized chain|not added|does not exist/i.test(message);
    if(!missing)throw error;
    await provider.request({method:'wallet_addEthereumChain',params:[chainParams]});
    await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});
  }
  const selected=await provider.request({method:'eth_chainId'});
  if(!same(selected))throw new Error(`Wallet did not switch to ${CHAIN.name}. Select GenLayer ${NETWORK} in your wallet and try again.`);
  return chainId;
}
export async function injectedClient(address,provider){
  if(!provider||typeof provider.request!=='function')throw new Error('The selected injected wallet is unavailable. Select the wallet again and reconnect.');
  await ensureInjectedNetwork(provider);
  return createClient({chain:CHAIN,endpoint:ENDPOINT,account:address,provider});
}
export async function read(functionName,args=[]){const value=await readClient().readContract({address:ensureDeployment(),functionName,args,stateStatus:'accepted'});return value}

const executionValues=receipt=>{
  const values=[receipt?.txExecutionResultName,receipt?.tx_execution_result_name,receipt?.txExecutionResult,receipt?.tx_execution_result];
  const leader=receipt?.consensus_data?.leader_receipt;
  const receipts=Array.isArray(leader)?leader:leader?[leader]:[];
  for(const item of receipts)values.push(item?.execution_result,item?.genvm_result);
  return values.filter(value=>value!==undefined&&value!==null&&value!=='');
};
const normalizeExecution=value=>String(value).trim().toUpperCase().replace(/[\s-]+/g,'_');
export function receiptExecutionOutcome(receipt){
  for(const value of executionValues(receipt)){
    if(typeof value==='number'||/^\d+$/.test(String(value))){
      const code=Number(value);
      if(code===1)return {status:'success',label:ExecutionResult.FINISHED_WITH_RETURN};
      if([2,3,4].includes(code))return {status:'failure',label:code===2?ExecutionResult.FINISHED_WITH_ERROR:code===3?ExecutionResult.TIMEOUT:ExecutionResult.NONDET_DISAGREE};
      continue;
    }
    const normalized=normalizeExecution(value);
    if(['FINISHED_WITH_RETURN','SUCCESS','SUCCEEDED','OK'].includes(normalized))return {status:'success',label:normalized};
    if(['FINISHED_WITH_ERROR','ERROR','FAILED','FAILURE','TIMEOUT','NONDET_DISAGREE'].includes(normalized))return {status:'failure',label:normalized};
  }
  return {status:'unknown',label:'UNKNOWN'};
}
export async function verifyFinalizedExecution(receipt,hash,clientFactory=readClient){
  const direct=receiptExecutionOutcome(receipt);
  if(direct.status!=='unknown')return direct;
  try{
    const trace=await clientFactory().debugTraceTransaction({hash,round:0});
    const code=Number(trace?.result_code);
    if(code===0)return {status:'success',label:'TRACE_SUCCESS'};
    if(code===1||code===2)return {status:'failure',label:`TRACE_ERROR_${code}`};
  }catch{/* receipt remains authoritative when trace is unavailable */}
  return direct;
}
export async function write(client,functionName,args=[],value=0n,onStage=()=>{}){
  onStage('SIGNING');
  const hash=await client.writeContract({address:ensureDeployment(),functionName,args,value});
  onStage('FINALIZING',hash);
  const receipt=await readClient().waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,interval:5000,retries:90});
  onStage('VERIFYING',hash);
  const execution=await verifyFinalizedExecution(receipt,hash);
  if(execution.status==='failure')throw new Error(`Transaction finalized, but GenVM execution failed (${execution.label}).`);
  if(execution.status==='unknown')throw new Error('Transaction finalized, but SLAIV could not verify the GenVM execution result automatically. Check the Studionet Explorer before retrying.');
  onStage('CONFIRMED',hash);
  return {hash,receipt};
}
export const parse=(value,fallback=null)=>{if(typeof value!=='string')return value??fallback;try{return JSON.parse(value)}catch{return fallback}};
export async function paginate(method,prefix=[]){const ids=[];for(let offset=0;;offset+=50){const page=parse(await read(method,[...prefix,offset,50]),[]);ids.push(...page);if(page.length<50)return ids}}
export async function allPolicies(){const ids=await paginate('list_policy_ids');return Promise.all(ids.map(async id=>parse(await read('get_policy',[id]),null))).then(rows=>rows.filter(Boolean))}
export async function allClaims(){const ids=await paginate('list_claim_ids');return Promise.all(ids.map(async id=>parse(await read('get_claim',[id]),null))).then(rows=>rows.filter(Boolean))}
export async function loadClaimDossier(readFn,id){const claim=parse(await readFn('get_claim',[id]),null);if(!claim)return null;const [policy,evidence,review,effectiveReview,payout,quotas]=await Promise.all([readFn('get_policy',[claim.policy_id]),readFn('get_evidence',[id]),readFn('get_review',[id]),readFn('get_effective_review',[id]),readFn('get_payout',[id]),readFn('get_evidence_quotas',[id])]);return {claim,policy:parse(policy,{}),evidence:parse(evidence,[]),review:parse(review,null),effectiveReview:parse(effectiveReview,null),payout:String(payout),quotas:parse(quotas,{})}}
export const claimDossier=id=>loadClaimDossier(read,id);
export async function allEvidence(){const claims=await allClaims();const records=await Promise.all(claims.map(async claim=>({claim,evidence:parse(await read('get_evidence',[claim.claim_id]),[])})));return records}
