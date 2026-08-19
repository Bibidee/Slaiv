export const LEGACY_WALLET_ID='legacy-window-ethereum';

const usefulMessage=value=>typeof value==='string'&&value.trim()&&value.trim()!=='Transaction failed.'?value.trim():'';
export function normalizeProviderError(error,fallback='Wallet request failed.'){
  const code=error&&typeof error==='object'?(error.code??error.cause?.code??error.data?.code??error.data?.originalError?.code):null;
  if(code===4001)return 'Wallet request rejected. Approve the request in the selected wallet and try again.';
  if(code===-32002)return 'A wallet request is already pending. Open the selected wallet and complete it.';
  if(code===4900)return 'The selected wallet provider is disconnected. Reconnect the wallet and try again.';
  if(code===4901)return 'The selected wallet is not connected to Studionet. Switch to GenLayer Studionet and try again.';
  if(code===4902)return 'GenLayer Studionet is not available in the selected wallet. Add or switch to Studionet and try again.';
  const candidates=[
    error?.details,
    error?.data?.details,
    error?.data?.originalError?.message,
    error?.data?.message,
    error?.error?.message,
    error?.cause?.details,
    error?.cause?.data?.message,
    error?.cause?.message,
    error?.shortMessage,
    error?.message,
  ];
  const specific=candidates.map(usefulMessage).find(message=>message&&!/^an unknown rpc error occurred\.?$/i.test(message));
  if(specific)return specific;
  const generic=candidates.map(usefulMessage).find(Boolean);
  if(generic&&code!==null&&code!==undefined)return `${generic} (RPC ${code})`;
  if(code!==null&&code!==undefined)return `${fallback} RPC code: ${code}.`;
  return generic||fallback;
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
