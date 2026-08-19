'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { injectedClient } from './lib/genlayer';
import { announcedWallet, legacyWallet, normalizeProviderError, selectWallet, upsertWallet } from './lib/injected-wallets';

const WalletContext=createContext(null);
const first=value=>Array.isArray(value)&&typeof value[0]==='string'?value[0]:null;
export const disconnectedWallet=()=>({address:null,status:'disconnected',error:''});
export const connectedWallet=address=>({address,status:'connected',error:''});
export const failedWallet=error=>({address:null,status:'disconnected',error});
export const walletFromAccounts=value=>{const account=first(value);return account?connectedWallet(account):disconnectedWallet()};

export function WalletProvider({children}){
  const [wallet,setWallet]=useState(disconnectedWallet);
  const [providers,setProviders]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const providersRef=useRef(new Map());
  const selectedIdRef=useRef('');
  const operation=useRef(0);
  const disconnect=useCallback(()=>{operation.current+=1;setWallet(disconnectedWallet())},[]);
  const sync=useCallback(async()=>{
    const current=++operation.current;
    const provider=providersRef.current.get(selectedIdRef.current)?.provider;
    if(!provider){if(current===operation.current)setWallet(disconnectedWallet());return}
    try{
      const next=walletFromAccounts(await provider.request({method:'eth_accounts'}));
      if(current===operation.current)setWallet(next);
    }catch(e){
      if(current===operation.current)setWallet(failedWallet(normalizeProviderError(e,'Unable to read the selected injected wallet.')));
    }
  },[]);
  const connect=useCallback(async()=>{
    const current=++operation.current;
    setWallet(previous=>({...previous,status:'connecting',error:''}));
    try{
      const provider=providersRef.current.get(selectedIdRef.current)?.provider;
      if(!provider)throw new Error('No injected wallet discovered. Unlock a compatible wallet, then try again.');
      const account=first(await provider.request({method:'eth_requestAccounts'}));
      if(!account)throw new Error('Wallet returned no account. Unlock it and approve the connection.');
      await injectedClient(account,provider);
      if(current===operation.current)setWallet(connectedWallet(account));
    }catch(e){
      if(current===operation.current)setWallet(failedWallet(normalizeProviderError(e,'Wallet connection failed. Check the selected wallet and Studionet connection.')));
    }
  },[]);
  const chooseWallet=useCallback(id=>{const selected=providersRef.current.get(id);if(!selected)return;operation.current+=1;selectedIdRef.current=id;setSelectedId(id);setWallet(disconnectedWallet())},[]);
  const getWriteClient=useCallback(async()=>{if(!wallet.address)throw new Error('Connect the injected wallet before signing.');const provider=providersRef.current.get(selectedIdRef.current)?.provider;if(!provider)throw new Error('The connected wallet provider is no longer available. Select it and reconnect.');return injectedClient(wallet.address,provider)},[wallet.address]);
  useEffect(()=>{
    const announce=event=>{const entry=announcedWallet(event.detail);if(!entry)return;providersRef.current.delete('legacy-window-ethereum');providersRef.current.set(entry.id,entry);setProviders(current=>upsertWallet(current.filter(item=>!item.legacy),entry));if(!selectedIdRef.current||selectedIdRef.current==='legacy-window-ethereum'){selectedIdRef.current=entry.id;setSelectedId(entry.id)}};
    window.addEventListener('eip6963:announceProvider',announce);
    window.dispatchEvent(new window.Event('eip6963:requestProvider'));
    const fallback=window.setTimeout(()=>{if(providersRef.current.size)return;const entry=legacyWallet(window.ethereum);if(!entry)return;providersRef.current.set(entry.id,entry);setProviders([entry]);selectedIdRef.current=entry.id;setSelectedId(entry.id)},150);
    return()=>{window.clearTimeout(fallback);window.removeEventListener('eip6963:announceProvider',announce)};
  },[]);
  useEffect(()=>{
    const provider=providersRef.current.get(selectedId)?.provider;if(!provider)return;
    void sync();
    const accountsChanged=value=>{operation.current+=1;setWallet(walletFromAccounts(value))};
    const disconnected=()=>disconnect();
    const chainChanged=()=>void sync();
    provider.on?.('accountsChanged',accountsChanged);provider.on?.('disconnect',disconnected);provider.on?.('chainChanged',chainChanged);
    const visible=()=>{if(document.visibilityState==='visible')void sync()};
    window.addEventListener('focus',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',visible);
    return()=>{provider.removeListener?.('accountsChanged',accountsChanged);provider.removeListener?.('disconnect',disconnected);provider.removeListener?.('chainChanged',chainChanged);window.removeEventListener('focus',sync);window.removeEventListener('pageshow',sync);document.removeEventListener('visibilitychange',visible)};
  },[disconnect,selectedId,sync]);
  const selected=selectWallet(providers,selectedId);
  const publicProviders=providers.map(({provider:_provider,...info})=>info);
  const value=useMemo(()=>({...wallet,providers:publicProviders,selectedWalletId:selectedId,selectedWalletName:selected?.name||'',selectWallet:chooseWallet,connect,disconnect,getWriteClient,refresh:sync}),[wallet,publicProviders,selectedId,selected,chooseWallet,connect,disconnect,getWriteClient,sync]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export function useWallet(){const wallet=useContext(WalletContext);if(!wallet)throw new Error('WalletProvider missing.');return wallet}
