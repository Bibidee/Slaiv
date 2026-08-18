const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;

export function validateProtocolRecord(record,{claimId,validator}){
  if(!record||record.claim_id!==claimId||record.validator!==validator||record.finality!=='FINAL')throw Error('Authoritative source does not prove FINAL finality for this claim and validator.');
  if(!Number.isInteger(record.observed_at_ts)||record.observed_at_ts<=0)throw Error('Authoritative source record requires a positive observed_at_ts.');
  if(typeof record.event_id!=='string'||record.event_id.length<1)throw Error('Authoritative source record requires an event_id.');
  if(!['studionet','testnetAsimov','testnetBradbury'].includes(record.network))throw Error('Authoritative source record requires a supported network.');
  if(typeof record.reference!=='string'||!record.reference.startsWith('https://'))throw Error('Authoritative source record requires an HTTPS reference.');
  return stable(record);
}

export async function protocolEvidence(record,context){
  const verified=validateProtocolRecord(record,context);
  const bytes=new TextEncoder().encode(JSON.stringify(verified));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const source_record_sha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return {kind:'PROTOCOL_FACT',protocol:'genlayer',claim_id:context.claimId,evidence_id:`protocol-${verified.event_id}`,validator:context.validator,finality:'FINAL',source:'GENLAYER_STAKING_ADAPTER',reference:verified.reference,network:verified.network,event_id:verified.event_id,submitted_at:verified.observed_at_ts,content_hash:source_record_sha256};
}
