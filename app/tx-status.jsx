'use client';
const copy={SIGNING:'Confirm this transaction in your injected wallet.',FINALIZING:'Signed. Waiting for GenLayer consensus and finality.',VERIFYING:'Finalized. Verifying GenVM execution result.',CONFIRMED:'GenVM execution verified. Contract state refreshed.'};
export function TxStatus({tx}){if(!tx?.stage)return null;return <div className={`tx-status ${tx.stage==='ERROR'?'error':''}`} role="status"><b>{tx.stage==='ERROR'?'Transaction failed':copy[tx.stage]}</b>{tx.hash?<code>{tx.hash}</code>:null}{tx.error?<p>{tx.error}</p>:null}</div>}
