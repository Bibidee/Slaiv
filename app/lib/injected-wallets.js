export const LEGACY_WALLET_ID='legacy-window-ethereum';

export function normalizeProviderError(error,fallback='Wallet request failed.'){
  const code=error&&typeof error==='object'?error.code:null;
  if(code===4001)return 'Wallet request rejected. Approve the request in the selected wallet and try again.';
  if(code===-32002)return 'A wallet request is already pending. Open the selected wallet and complete it.';
  const candidates=[error?.shortMessage,error?.data?.message,error?.error?.message,error?.cause?.message,error?.message];
  const message=candidates.find(value=>typeof value==='string'&&value.trim()&&value.trim()!=='Transaction failed.');
  return message?.trim()||fallback;
}

export function announcedWallet(detail){
  if(!detail?.provider||typeof detail.provider.request!=='function'||!detail.info?.uuid)return null;
  return {id:detail.info.uuid,name:detail.info.name||'Injected wallet',icon:detail.info.icon||'',rdns:detail.info.rdns||'',provider:detail.provider,legacy:false};
}

export function legacyWallet(provider){
  if(!provider||typeof provider.request!=='function')return null;
  return {id:LEGACY_WALLET_ID,name:'Legacy injected wallet',icon:'',rdns:'',provider,legacy:true};
}

export function upsertWallet(wallets,wallet){
  if(!wallet)return wallets;
  const index=wallets.findIndex(item=>item.id===wallet.id);
  if(index<0)return [...wallets,wallet];
  const next=[...wallets];next[index]=wallet;return next;
}

export const selectWallet=(wallets,id)=>wallets.find(wallet=>wallet.id===id)||null;
