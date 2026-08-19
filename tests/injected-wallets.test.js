import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  announcedWallet,
  legacyWallet,
  normalizeProviderError,
  selectWallet,
  upsertWallet,
} from '../app/lib/injected-wallets.js';

const provider=name=>({name,request:async()=>[]});
const announcement=(uuid,name,rdns,injected)=>({info:{uuid,name,rdns},provider:injected});

describe('EIP-6963 injected wallet discovery',()=>{
  it('retains multiple announced providers and selects Rabby instead of MetaMask',()=>{
    const metamask=provider('metamask');
    const rabby=provider('rabby');
    const wallets=[
      announcedWallet(announcement('metamask-id','MetaMask','io.metamask',metamask)),
      announcedWallet(announcement('rabby-id','Rabby Wallet','io.rabby',rabby)),
    ].reduce(upsertWallet,[]);

    expect(wallets).toHaveLength(2);
    expect(selectWallet(wallets,'rabby-id')).toMatchObject({name:'Rabby Wallet',rdns:'io.rabby'});
    expect(selectWallet(wallets,'rabby-id').provider).toBe(rabby);
    expect(selectWallet(wallets,'rabby-id').provider).not.toBe(metamask);
  });

  it('updates a repeated EIP-6963 announcement without duplicating the wallet',()=>{
    const first=announcedWallet(announcement('rabby-id','Rabby','io.rabby',provider('old')));
    const latestProvider=provider('latest');
    const latest=announcedWallet(announcement('rabby-id','Rabby Wallet','io.rabby',latestProvider));
    const wallets=upsertWallet(upsertWallet([],first),latest);

    expect(wallets).toHaveLength(1);
    expect(wallets[0].provider).toBe(latestProvider);
  });

  it('keeps window.ethereum as an explicitly marked legacy fallback',()=>{
    const injected=provider('legacy');
    expect(legacyWallet(injected)).toMatchObject({legacy:true,name:'Legacy injected wallet',provider:injected});
  });

  it('rejects malformed announcements',()=>{
    expect(announcedWallet({info:{uuid:'missing-provider'}})).toBeNull();
    expect(announcedWallet({provider:provider('missing-info')})).toBeNull();
  });
});

describe('injected provider errors',()=>{
  it('turns rejection and pending-request errors into actionable messages',()=>{
    expect(normalizeProviderError({code:4001})).toContain('rejected');
    expect(normalizeProviderError({code:-32002})).toContain('already pending');
  });

  it('preserves a useful nested provider error and replaces generic failures',()=>{
    expect(normalizeProviderError({data:{message:'Studionet RPC rejected the write'}})).toBe('Studionet RPC rejected the write');
    expect(normalizeProviderError(new Error('Transaction failed.'),'Check the selected wallet.')).toBe('Check the selected wallet.');
  });
});

describe('selected provider integration',()=>{
  it('passes the retained provider to genlayer-js and never reads window.ethereum there',()=>{
    const source=readFileSync(new URL('../app/lib/genlayer.js',import.meta.url),'utf8');
    expect(source).not.toContain('window.ethereum');
    expect(source).toContain('provider});');
    expect(source).toContain('client.connect(NETWORK)');
  });
});
