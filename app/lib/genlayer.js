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
export async function injectedClient(address){if(!window.ethereum)throw new Error('No injected wallet found. Open SLAIV inside your wallet browser or install and unlock a compatible injected wallet.');const client=createClient({chain:CHAIN,endpoint:ENDPOINT,account:address,provider:window.ethereum});await client.connect(NETWORK);return client}
export async function read(functionName,args=[]){const value=await readClient().readContract({address:ensureDeployment(),functionName,args,stateStatus:'accepted'});return value}
export async function write(client,functionName,args=[],value=0n,onStage=()=>{}){onStage('SIGNING');const hash=await client.writeContract({address:ensureDeployment(),functionName,args,value});onStage('FINALIZING',hash);const receipt=await readClient().waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,interval:5000,retries:90});onStage('VERIFYING',hash);if(receipt.txExecutionResultName!==ExecutionResult.FINISHED_WITH_RETURN){const result=receipt.txExecutionResultName||receipt.txExecutionResult||'UNKNOWN';throw new Error(`Transaction finalized, but GenVM execution failed (${result}).`)}onStage('CONFIRMED',hash);return {hash,receipt}}
export const parse=(value,fallback=null)=>{if(typeof value!=='string')return value??fallback;try{return JSON.parse(value)}catch{return fallback}};
export async function paginate(method,prefix=[]){const ids=[];for(let offset=0;;offset+=50){const page=parse(await read(method,[...prefix,offset,50]),[]);ids.push(...page);if(page.length<50)return ids}}
export async function allPolicies(){const ids=await paginate('list_policy_ids');return Promise.all(ids.map(async id=>parse(await read('get_policy',[id]),null))).then(rows=>rows.filter(Boolean))}
export async function allClaims(){const ids=await paginate('list_claim_ids');return Promise.all(ids.map(async id=>parse(await read('get_claim',[id]),null))).then(rows=>rows.filter(Boolean))}
export async function loadClaimDossier(readFn,id){const claim=parse(await readFn('get_claim',[id]),null);if(!claim)return null;const [policy,evidence,review,effectiveReview,payout]=await Promise.all([readFn('get_policy',[claim.policy_id]),readFn('get_evidence',[id]),readFn('get_review',[id]),readFn('get_effective_review',[id]),readFn('get_payout',[id])]);return {claim,policy:parse(policy,{}),evidence:parse(evidence,[]),review:parse(review,null),effectiveReview:parse(effectiveReview,null),payout:String(payout)}}
export const claimDossier=id=>loadClaimDossier(read,id);
export async function allEvidence(){const claims=await allClaims();const records=await Promise.all(claims.map(async claim=>({claim,evidence:parse(await read('get_evidence',[claim.claim_id]),[])})));return records}
