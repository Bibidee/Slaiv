'use client';
import { PageHead } from '../components';
import { CONTRACT_ADDRESS, NETWORK } from '../lib/genlayer';
import { useWallet } from '../wallet-provider';
export default function Account(){const wallet=useWallet();return <main className="app-page narrow"><PageHead eyebrow="ACCOUNT" title="Connection and notices"/><section className="account-panel"><div><span>Injected wallet</span><code>{wallet.address||'Not connected'}</code></div><div><span>Network</span><code>{NETWORK}</code></div><div><span>SLAIV contract</span><code>{CONTRACT_ADDRESS||'Not configured'}</code></div>{wallet.error?<p className="read-error">{wallet.error}</p>:null}{wallet.address?<button className="button neutral" onClick={wallet.disconnect}>Disconnect</button>:<button className="button" onClick={()=>void wallet.connect()}>Connect injected wallet</button>}</section></main>}
