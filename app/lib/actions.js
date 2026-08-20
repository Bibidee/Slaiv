export function allowedActions(state,{isClaimant=false,connected=false,appealDeadlineTs=0,appealResolved=false,nowTs=Math.floor(Date.now()/1000)}={}){
  if(state==='FINAL')return [];
  const actions=[];
  if(state==='AWAITING_FINALITY'){
    if(isClaimant)actions.push('APPEND_EVIDENCE');
    if(connected)actions.push('VERIFY_FINALITY');
  }
  if(state==='UNDER_REVIEW'&&connected)actions.push('REVIEW');
  const appealable=['DENIED','PARTIALLY_APPROVED','UNRESOLVED'].includes(state);
  if(appealable&&isClaimant&&(!appealDeadlineTs||nowTs<=Number(appealDeadlineTs)))actions.push('APPEAL');
  if(state==='APPEALED'&&connected)actions.push('REVIEW_APPEAL');
  if(connected&&state==='APPROVED')actions.push('FINALIZE');
  if(connected&&['DENIED','PARTIALLY_APPROVED'].includes(state)&&(isClaimant||appealResolved||nowTs>Number(appealDeadlineTs||0)))actions.push('FINALIZE');
  return actions;
}
