import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { allowedActions } from '../app/lib/actions.js';
import { loadClaimDossier } from '../app/lib/genlayer.js';

describe('release frontend boundaries',()=>{
  it('binds and displays the policy subject network',async()=>{
    const create=await readFile(new URL('../app/coverage/new/page.jsx',import.meta.url),'utf8');
    const detail=await readFile(new URL('../app/coverage/[id]/page.jsx',import.meta.url),'utf8');
    expect(create).toContain('subject_network');
    expect(create).toContain('subjectNetwork');
    expect(detail).toContain('p.subject_network');
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

  it('does not allow browser code to manufacture protocol facts',async()=>{
    const source=await readFile(new URL('../app/claims/[docket]/page.jsx',import.meta.url),'utf8');
    expect(source).not.toMatch(/evidenceFrom\([^)]*PROTOCOL_FACT/);
    expect(source).not.toContain('record_protocol_finality');
    expect(source).toContain('verified operator adapter');
  });

  it.each([
    ['APPROVED',false,['FINALIZE']],
    ['DENIED',true,['FINALIZE','APPEAL']],
    ['PARTIALLY_APPROVED',true,['FINALIZE','APPEAL']],
    ['UNRESOLVED',true,['APPEAL']],
    ['FINAL',false,[]],
  ])('maps %s to exact claimant actions', (state,appealable,expected)=>{
    const actions=allowedActions(state,{isClaimant:true,connected:true});
    expect(actions).toEqual(expected);
    expect(actions.includes('APPEAL')).toBe(appealable);
  });

  it('renders protocol evidence from stored get_evidence results',async()=>{
    const source=await readFile(new URL('../app/evidence/page.jsx',import.meta.url),'utf8');
    const client=await readFile(new URL('../app/lib/genlayer.js',import.meta.url),'utf8');
    expect(client).toContain("read('get_evidence',[claim.claim_id])");
    expect(source).toContain("item.kind==='PROTOCOL_FACT'");
    expect(source).toContain('No verified protocol facts recorded.');
  });

  it('contains no fixture imports in the live app tree',async()=>{
    const root=new URL('../app/',import.meta.url);
    const walk=async url=>{const names=await readdir(url,{withFileTypes:true});return (await Promise.all(names.map(entry=>entry.isDirectory()?walk(new URL(`${entry.name}/`,url)):entry.name.match(/\.(js|jsx)$/)?readFile(new URL(entry.name,url),'utf8'):''))).flat().join('\n')};
    expect(await walk(root)).not.toMatch(/fixtures|demoPolicy|DEMO FIXTURE/);
  });
});
