import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { allowedActions } from '../app/lib/actions.js';
import { loadClaimDossier } from '../app/lib/genlayer.js';

describe('permissionless release frontend boundaries',()=>{
  it('binds the configured network internally and displays it as coverage network',async()=>{
    const create=await readFile(new URL('../app/coverage/new/page.jsx',import.meta.url),'utf8');
    const detail=await readFile(new URL('../app/coverage/[id]/page.jsx',import.meta.url),'utf8');
    expect(create).toContain('subject_network');
    expect(create).toContain('subject_network:NETWORK');
    expect(create).not.toContain('name="subjectNetwork"');
    expect(detail).toContain('p.subject_network');
    expect(detail).toContain('Coverage network');
  });

  it('resolves the dossier policy from claim.policy_id, never claim ID',async()=>{
    const calls=[];
    const responses={get_claim:JSON.stringify({claim_id:'clm_1',policy_id:'pol_9'}),get_policy:JSON.stringify({policy_id:'pol_9'}),get_evidence:'[]',get_review:'',get_effective_review:'',get_payout:0};
    const readFn=vi.fn(async(method,args)=>{calls.push([method,args]);return responses[method]});
    const dossier=await loadClaimDossier(readFn,'clm_1');
    expect(dossier.policy.policy_id).toBe('pol_9');
    expect(calls).toContainEqual(['get_policy',['pol_9']]);
    expect(calls).not.toContainEqual(['get_policy',['clm_1']]);
  });

  it('lets any connected wallet submit only a candidate protocol event for consensus verification',async()=>{
    const source=await readFile(new URL('../app/claims/[docket]/page.jsx',import.meta.url),'utf8');
    expect(source).toContain('verify_protocol_finality');
    expect(source).toContain('GenLayer event / transaction ID');
    expect(source).toContain('Official GenLayer explorer record');
    expect(source).toContain('caller does not set finality or the outcome');
    expect(source).not.toContain('record_protocol_finality');
    expect(source).not.toContain('get_protocol_authority');
    expect(source).not.toMatch(/evidenceFrom\([^)]*PROTOCOL_FACT/);
  });

  it('maps permissionless actions without granting identity-bound claimant rights',()=>{
    expect(allowedActions('AWAITING_FINALITY',{connected:true,isClaimant:false,nowTs:100})).toEqual(['VERIFY_FINALITY']);
    expect(allowedActions('AWAITING_FINALITY',{connected:true,isClaimant:true,nowTs:100})).toEqual(['APPEND_EVIDENCE','VERIFY_FINALITY']);
    expect(allowedActions('UNDER_REVIEW',{connected:true,isClaimant:false,nowTs:100})).toEqual(['REVIEW']);
    expect(allowedActions('APPROVED',{connected:true,isClaimant:false,nowTs:100})).toEqual(['FINALIZE']);
    expect(allowedActions('APPEALED',{connected:true,isClaimant:false,nowTs:100})).toEqual(['REVIEW_APPEAL']);
    expect(allowedActions('DENIED',{connected:true,isClaimant:false,appealDeadlineTs:200,nowTs:100})).toEqual([]);
    expect(allowedActions('DENIED',{connected:true,isClaimant:false,appealDeadlineTs:200,nowTs:201})).toEqual(['FINALIZE']);
    expect(allowedActions('DENIED',{connected:true,isClaimant:true,appealDeadlineTs:200,nowTs:100})).toEqual(['APPEAL','FINALIZE']);
    expect(allowedActions('UNRESOLVED',{connected:true,isClaimant:true,appealDeadlineTs:200,nowTs:100})).toEqual(['APPEAL']);
    expect(allowedActions('FINAL',{connected:true,isClaimant:true,nowTs:100})).toEqual([]);
  });

  it('renders consensus-verified protocol evidence from stored get_evidence results',async()=>{
    const source=await readFile(new URL('../app/evidence/page.jsx',import.meta.url),'utf8');
    const client=await readFile(new URL('../app/lib/genlayer.js',import.meta.url),'utf8');
    expect(client).toContain("read('get_evidence',[claim.claim_id])");
    expect(source).toContain("item.kind==='PROTOCOL_FACT'");
  });

  it('contains no fixture imports in the live app tree',async()=>{
    const root=new URL('../app/',import.meta.url);
    const walk=async url=>{const names=await readdir(url,{withFileTypes:true});return (await Promise.all(names.map(entry=>entry.isDirectory()?walk(new URL(`${entry.name}/`,url)):entry.name.match(/\.(js|jsx)$/)?readFile(new URL(entry.name,url),'utf8'):''))).flat().join('\n')};
    expect(await walk(root)).not.toMatch(/fixtures|demoPolicy|DEMO FIXTURE/);
  });
});
