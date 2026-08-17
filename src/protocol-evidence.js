const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;

export function validateProtocolRecord(record,{claimId,validator}){
  if(!record||record.claim_id!==claimId||record.validator!==validator||record.finality!=='FINAL')throw Error('Authoritative source does not prove FINAL finality for this claim and validator.');
  if(!Number.isInteger(record.observed_at_ts)||record.observed_at_ts<=0)throw Error('Authoritative source record requires a positive observed_at_ts.');
  if(typeof record.reference!=='string'||!record.reference.startsWith('https://'))throw Error('Authoritative source record requires an HTTPS reference.');
  return stable(record);
}

export async function protocolEvidence(record,context){
  const verified=validateProtocolRecord(record,context);
  const bytes=new TextEncoder().encode(JSON.stringify(verified));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const source_record_sha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return {kind:'PROTOCOL_FACT',protocol:'genlayer',claim_id:context.claimId,validator:context.validator,finality:'FINAL',source:'GENLAYER_STAKING_ADAPTER',reference:verified.reference,observed_at_ts:verified.observed_at_ts,source_record_sha256};
}
