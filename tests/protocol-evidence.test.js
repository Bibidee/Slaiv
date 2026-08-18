import { describe,it,expect } from 'vitest';
import { protocolEvidence,validateProtocolRecord } from '../src/protocol-evidence.js';

const record={claim_id:'clm_1',validator:'validator-1',finality:'FINAL',observed_at_ts:10,reference:'https://authority.example/events/1',event_id:'evt-1',network:'studionet'};
describe('protocol evidence adapter boundary',()=>{
  it('normalizes and hashes an authoritative record',async()=>{const e=await protocolEvidence(record,{claimId:'clm_1',validator:'validator-1'});expect(e.content_hash).toMatch(/^[a-f0-9]{64}$/);expect(e.evidence_id).toBe('protocol-evt-1');expect(e.reference).toBe(record.reference)});
  it('rejects mismatched or non-final records',()=>{expect(()=>validateProtocolRecord({...record,finality:'PENDING'},{claimId:'clm_1',validator:'validator-1'})).toThrow('FINAL');expect(()=>validateProtocolRecord(record,{claimId:'clm_2',validator:'validator-1'})).toThrow('claim')});
});
