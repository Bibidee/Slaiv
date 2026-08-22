export async function sha256(value){const bytes=new TextEncoder().encode(value);const result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
export const newId=prefix=>`${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,24)}`;
export async function evidenceFrom(form,claimId,kind='CLAIMANT_ASSERTION'){
  const data=new FormData(form);
  const reference=String(data.get('reference')||'');
  const isClaimant=kind==='CLAIMANT_ASSERTION';
  // Claimant assertions are stored as real bounded text in contract state so
  // judgment can inspect them. Public-source evidence carries no content
  // field at all -- the contract retrieves the reference URL itself; there
  // is nothing here to hash except the reference, used only to bind the
  // commitment fields together.
  const content=isClaimant?String(data.get('content')||''):'';
  return {
    claim_id:claimId,
    evidence_id:data.get('evidenceId')||newId('evd'),
    kind,
    source:data.get('source'),
    reference,
    content:isClaimant?content:undefined,
    content_hash:await sha256(isClaimant?content:reference),
    submitted_at:Math.floor(Date.now()/1000),
  };
}
