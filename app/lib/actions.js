export function allowedActions(state,{isClaimant=false,connected=false}={}){
  if(state==='FINAL')return [];
  const actions=[];
  if(state==='AWAITING_FINALITY'&&isClaimant)actions.push('APPEND_EVIDENCE');
  if(state==='UNDER_REVIEW'&&connected)actions.push('REVIEW');
  if(['APPROVED','PARTIALLY_APPROVED','DENIED'].includes(state)&&isClaimant)actions.push('FINALIZE');
  if(['DENIED','PARTIALLY_APPROVED','UNRESOLVED'].includes(state)&&isClaimant)actions.push('APPEAL');
  if(state==='APPEALED'&&connected)actions.push('REVIEW_APPEAL');
  return actions;
}
