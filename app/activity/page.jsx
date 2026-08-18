'use client';
import Link from 'next/link';
import { Empty, PageHead, Stamp } from '../components';
import { allClaims } from '../lib/genlayer';
import { docket, stampFor, useLive } from '../live-data';
export default function Activity(){const live=useLive(allClaims,[]);return <main className="app-page"><PageHead eyebrow="CONTRACT ACTIVITY" title="Docket movements"><p>Current claim states derived from bounded live contract reads. No synthetic network activity.</p></PageHead><section className="ledger-table"><div className="table-head"><span>DOCKET</span><span>VALIDATOR</span><span>STATE</span></div>{live.data?.map(claim=><Link className="ledger-row" href={`/claims/${claim.claim_id}`} key={claim.claim_id}><code>{docket(claim.claim_id)}</code><span>{claim.validator}</span><Stamp state={stampFor(claim.state)}/></Link>)}{!live.loading&&!live.error&&!live.data?.length?<Empty>No live claim activity yet.</Empty>:null}{live.loading?<p className="loading">Reading activity ledger…</p>:null}{live.error?<div className="read-error">{live.error}</div>:null}</section></main>}
