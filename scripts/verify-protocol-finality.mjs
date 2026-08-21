import { execFileSync } from 'node:child_process';
import { createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const arg=name=>{const index=process.argv.indexOf(name);return index<0?'':process.argv[index+1]||''};
const claimId=arg('--claim-id');
const eventId=arg('--event-id');
const dryRun=process.argv.includes('--dry-run');
if(!claimId||!/^0x[0-9a-fA-F]{64}$/.test(eventId))throw Error('Usage: npm run verify:finality -- --claim-id clm_… --event-id 0x<64 hex transaction hash> [--dry-run]');
const address=process.env.SLAIV_CLAIMS_ADDRESS||process.env.NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS;
const rpc=process.env.GENLAYER_RPC_URL||process.env.NEXT_PUBLIC_GENLAYER_RPC_URL||'https://studio.genlayer.com/api';
if(!address)throw Error('Set SLAIV_CLAIMS_ADDRESS or NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS.');
const npxBin=process.platform==='win32'?'npx.cmd':'npx';
const cli=(args)=>execFileSync(npxBin,['--yes','genlayer@0.39.2',...args],{encoding:'utf8',stdio:['ignore','pipe','inherit'],shell:process.platform==='win32'});
const decode=output=>{const match=output.match(/Result:\s*\n([\s\S]*?)\n\n/);if(!match)throw Error('Unable to parse GenLayer CLI result.');return JSON.parse(match[1]);};
// get_claim/get_policy args (claim_id, policy_id) are never hex-shaped, so the
// CLI's positional --args parser is safe for these read-only calls.
const claim=decode(cli(['call',address,'get_claim','--args',claimId,'--rpc',rpc]));
if(!claim?.policy_id)throw Error('Claim was not found on the configured SLAIV contract.');
const policy=decode(cli(['call',address,'get_policy','--args',claim.policy_id,'--rpc',rpc]));
// Networks the contract has a verified, official eth_getTransactionByHash
// RPC mapping for. Kept in sync with RPC_ENDPOINTS in contracts/SlaivClaims.py --
// verify_protocol_finality itself fails closed for any other network, this
// check just avoids a wasted round trip / clearer local error message.
const verifiedNetworks={studionet:'https://studio.genlayer.com/api'};
if(!verifiedNetworks[policy.subject_network])throw Error(`No verified official RPC source for network ${policy.subject_network} yet; verify_protocol_finality will fail closed.`);
const candidate={claimId,eventId,policyId:claim.policy_id,validator:policy.validator,network:policy.subject_network};
if(dryRun){console.log(JSON.stringify({...candidate,note:'Dry run only validates the candidate shape. GenLayer consensus verification happens only when the write is submitted; SLAIV queries the official RPC for the policy network itself.'},null,2));process.exit(0)}
console.log('Submitting permissionless protocol-event candidate (transaction hash only). The caller does not attest finality, validator identity, or incident class; GenLayer consensus queries the official RPC and verifies those facts independently.');
// The write step deliberately does NOT go through `genlayer write --args`:
// that CLI's positional-argument parser (genlayer@0.39.2,
// src/commands/contracts/index.ts parseScalar/HEX_RE) coerces ANY bare
// "0x"-prefixed hex string that isn't exactly a 40-hex-char address into a
// BigInt, silently corrupting a 32-byte transaction hash into a decimal
// integer before it ever reaches the contract. That breaks this exact call,
// since event_id is a str parameter -- see the confirmed live reproduction
// in docs/DEPLOYMENT.md (tx 0x956f6a0f...). genlayer-js's own
// `writeContract` has no such heuristic: it encodes native JS values by
// their actual type, so calling it directly (as the frontend already does)
// avoids the bug entirely.
const privateKey=process.env.SLAIV_SIGNER_PRIVATE_KEY;
if(!privateKey||!/^0x[0-9a-fA-F]{64}$/.test(privateKey))throw Error('Set SLAIV_SIGNER_PRIVATE_KEY to a funded Studionet account private key (0x + 64 hex chars) to submit the write. This script never logs it. Export your own key locally via `genlayer account export`, or use `genlayer account unlock` plus your own signing setup -- do not paste a key into chat with an AI assistant.');
const client=createClient({chain:studionet,endpoint:rpc,account:createAccount(privateKey)});
const hash=await client.writeContract({address,functionName:'verify_protocol_finality',args:[claimId,eventId],value:0n});
console.log('Write Transaction Hash:',hash);
const receipt=await client.waitForTransactionReceipt({hash,retries:100,interval:5000});
console.log(JSON.stringify({...candidate,hash,status:receipt?.status_name||receipt?.statusName},null,2));
