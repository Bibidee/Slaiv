'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { injectedClient } from './lib/genlayer';

const WalletContext=createContext(null);
const first=value=>Array.isArray(value)&&typeof value[0]==='string'?value[0]:null;
export const disconnectedWallet=()=>({address:null,status:'disconnected',error:''});
export const connectedWallet=address=>({address,status:'connected',error:''});
export const failedWallet=error=>({address:null,status:'disconnected',error});
export const walletFromAccounts=value=>{const account=first(value);return account?connectedWallet(account):disconnectedWallet()};

export function WalletProvider({children}){
  const [wallet,setWallet]=useState(disconnectedWallet);
  const operation=useRef(0);
  const disconnect=useCallback(()=>{operation.current+=1;setWallet(disconnectedWallet())},[]);
  const sync=useCallback(async()=>{
    const current=++operation.current;
    if(!window.ethereum){if(current===operation.current)setWallet(disconnectedWallet());return}
    try{
      const next=walletFromAccounts(await window.ethereum.request({method:'eth_accounts'}));
      if(current===operation.current)setWallet(next);
    }catch(e){
      if(current===operation.current)setWallet(failedWallet(e instanceof Error?e.message:'Unable to read injected wallet.'));
    }
  },[]);
  const connect=useCallback(async()=>{
    const current=++operation.current;
    setWallet(previous=>({...previous,status:'connecting',error:''}));
    try{
      if(!window.ethereum)throw new Error('No injected wallet found. Open SLAIV inside your wallet browser or install and unlock a compatible wallet.');
      const account=first(await window.ethereum.request({method:'eth_requestAccounts'}));
      if(!account)throw new Error('Wallet returned no account. Unlock it and approve the connection.');
      await injectedClient(account);
      if(current===operation.current)setWallet(connectedWallet(account));
    }catch(e){
      if(current===operation.current)setWallet(failedWallet(e instanceof Error?e.message:'Wallet connection failed.'));
    }
  },[]);
  const getWriteClient=useCallback(async()=>{if(!wallet.address)throw new Error('Connect the injected wallet before signing.');return injectedClient(wallet.address)},[wallet.address]);
  useEffect(()=>{
    void sync();
    const provider=window.ethereum;if(!provider)return;
    const accountsChanged=value=>{operation.current+=1;setWallet(walletFromAccounts(value))};
    const disconnected=()=>disconnect();
    const chainChanged=()=>void sync();
    provider.on?.('accountsChanged',accountsChanged);provider.on?.('disconnect',disconnected);provider.on?.('chainChanged',chainChanged);
    const visible=()=>{if(document.visibilityState==='visible')void sync()};
    window.addEventListener('focus',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',visible);
    return()=>{provider.removeListener?.('accountsChanged',accountsChanged);provider.removeListener?.('disconnect',disconnected);provider.removeListener?.('chainChanged',chainChanged);window.removeEventListener('focus',sync);window.removeEventListener('pageshow',sync);document.removeEventListener('visibilitychange',visible)};
  },[disconnect,sync]);
  const value=useMemo(()=>({...wallet,connect,disconnect,getWriteClient,refresh:sync}),[wallet,connect,disconnect,getWriteClient,sync]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export function useWallet(){const wallet=useContext(WalletContext);if(!wallet)throw new Error('WalletProvider missing.');return wallet}
