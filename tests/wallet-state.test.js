import { describe, expect, it } from 'vitest';
import { connectedWallet, disconnectedWallet, failedWallet, walletFromAccounts } from '../app/wallet-provider.jsx';

describe('injected wallet state transitions',()=>{
  it('clears a failed attempt after a later successful connection',()=>{
    expect(failedWallet('Wallet connection failed.').error).toBeTruthy();
    expect(connectedWallet('0xabc')).toEqual({address:'0xabc',status:'connected',error:''});
  });
  it('clears stale errors on successful account sync',()=>{
    expect(walletFromAccounts(['0xsync'])).toEqual({address:'0xsync',status:'connected',error:''});
  });
  it('connects without a stale error when accountsChanged supplies a valid account',()=>{
    expect(walletFromAccounts(['0xchanged'])).toEqual({address:'0xchanged',status:'connected',error:''});
  });
  it('disconnects and clears errors',()=>{
    expect(disconnectedWallet()).toEqual({address:null,status:'disconnected',error:''});
    expect(walletFromAccounts([])).toEqual(disconnectedWallet());
  });
  it('keeps a genuine current failure visible while disconnected',()=>{
    expect(failedWallet('Wrong GenLayer network.')).toEqual({address:null,status:'disconnected',error:'Wrong GenLayer network.'});
  });
});
