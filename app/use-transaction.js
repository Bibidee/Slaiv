'use client';
import { useState } from 'react';
import { write } from './lib/genlayer';
import { useWallet } from './wallet-provider';
export function useTransaction(){const wallet=useWallet(),[tx,setTx]=useState({stage:''});const fail=error=>setTx(current=>({stage:'ERROR',hash:current.hash,error:error instanceof Error?error.message:'Transaction failed.'}));const execute=async(method,args,value=0n)=>{setTx({stage:'SIGNING'});try{const client=await wallet.getWriteClient();const result=await write(client,method,args,value,(stage,hash)=>setTx({stage,hash}));return result}catch(error){fail(error);throw error}};return {tx,execute,fail,reset:()=>setTx({stage:''})}}
