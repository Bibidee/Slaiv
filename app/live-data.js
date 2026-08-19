'use client';
import { useCallback, useEffect, useState } from 'react';
export function useLive(loader,deps=[]){const [state,setState]=useState({loading:true,data:null,error:''});const refresh=useCallback(async()=>{setState(current=>({...current,loading:true,error:''}));try{setState({loading:false,data:await loader(),error:''})}catch(error){setState({loading:false,data:null,error:error instanceof Error?error.message:'Live contract read failed.'})}},deps);useEffect(()=>{void refresh()},[refresh]);return {...state,refresh}}
export const docket=id=>String(id||'').replace(/^pol_/,'SLV-').replace(/^clm_/,'SLC-').toUpperCase();
export const compactId=(value,head=10,tail=8)=>{const text=String(value||'');return text.length>head+tail+1?`${text.slice(0,head)}…${text.slice(-tail)}`:text};
export function stampFor(state,payout='0'){if(state==='FINAL')return Number(payout)>0?'SETTLED':'DENIED';if(state==='DENIED')return'DENIED';if(['UNDER_REVIEW','APPEALED','UNRESOLVED'].includes(state))return'UNDER REVIEW';return'BOUND'}
export const fmtDate=seconds=>Number(seconds)?new Date(Number(seconds)*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
