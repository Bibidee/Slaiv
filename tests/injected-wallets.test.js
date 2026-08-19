import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ensureInjectedNetwork } from '../app/lib/genlayer.js';
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
  it('retains multiple announced providers and selects the exact requested wallet',()=>{
    const metamask=provider('metamask');
    const rabby=provider('rabby');
    const trust=provider('trust');
    const wallets=[
      announcedWallet(announcement('metamask-id','MetaMask','io.metamask',metamask)),
      announcedWallet(announcement('rabby-id','Rabby Wallet','io.rabby',rabby)),
      announcedWallet(announcement('trust-id','Trust Wallet','com.trustwallet.app',trust)),
    ].reduce(upsertWallet,[]);

    expect(wallets).toHaveLength(3);
    expect(selectWallet(wallets,'rabby-id')).toMatchObject({name:'Rabby Wallet',rdns:'io.rabby'});
    expect(selectWallet(wallets,'rabby-id').provider).toBe(rabby);
    expect(selectWallet(wallets,'metamask-id').provider).toBe(metamask);
    expect(selectWallet(wallets,'trust-id').provider).toBe(trust);
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

describe('generic injected network handling',()=>{
  it('uses the selected provider directly and never invokes MetaMask Snap RPC methods',()=>{
    const source=readFileSync(new URL('../app/lib/genlayer.js',import.meta.url),'utf8');
    expect(source).not.toContain('window.ethereum');
    expect(source).not.toContain('client.connect(');
    expect(source).not.toContain('wallet_getSnaps');
    expect(source).not.toContain('wallet_requestSnaps');
    expect(source).toContain('createClient({chain:CHAIN,endpoint:ENDPOINT,account:address,provider})');
  });

  it('does nothing when the selected wallet is already on Studionet',async()=>{
    const calls=[];
    const injected={request:async request=>{calls.push(request);if(request.method==='eth_chainId')return '0xf22f';throw new Error(`unexpected ${request.method}`)}};
    await expect(ensureInjectedNetwork(injected)).resolves.toBe('0xf22f');
    expect(calls.map(call=>call.method)).toEqual(['eth_chainId']);
  });

  it('switches a standards-compatible wallet to Studionet',async()=>{
    const calls=[];
    let chain='0x1';
    const injected={request:async request=>{
      calls.push(request);
      if(request.method==='eth_chainId')return chain;
      if(request.method==='wallet_switchEthereumChain'){chain=request.params[0].chainId;return null}
      throw new Error(`unexpected ${request.method}`);
    }};
    await expect(ensureInjectedNetwork(injected)).resolves.toBe('0xf22f');
    expect(calls.map(call=>call.method)).toEqual(['eth_chainId','wallet_switchEthereumChain','eth_chainId']);
  });

  it('adds Studionet when the wallet reports the chain is unknown, then switches',async()=>{
    const calls=[];
    let chain='0x1',known=false;
    const injected={request:async request=>{
      calls.push(request);
      if(request.method==='eth_chainId')return chain;
      if(request.method==='wallet_switchEthereumChain'){
        if(!known){const error=new Error('Unknown chain');error.code=4902;throw error}
        chain=request.params[0].chainId;return null;
      }
      if(request.method==='wallet_addEthereumChain'){known=true;return null}
      throw new Error(`unexpected ${request.method}`);
    }};
    await expect(ensureInjectedNetwork(injected)).resolves.toBe('0xf22f');
    expect(calls.map(call=>call.method)).toEqual(['eth_chainId','wallet_switchEthereumChain','wallet_addEthereumChain','wallet_switchEthereumChain','eth_chainId']);
  });
});
