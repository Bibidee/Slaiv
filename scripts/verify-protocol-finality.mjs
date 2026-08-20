import { execFileSync } from 'node:child_process';

const arg=name=>{const index=process.argv.indexOf(name);return index<0?'':process.argv[index+1]||''};
const claimId=arg('--claim-id');
const eventId=arg('--event-id');
const suppliedReference=arg('--reference');
const dryRun=process.argv.includes('--dry-run');
if(!claimId||!/^0x[0-9a-fA-F]{64}$/.test(eventId))throw Error('Usage: npm run verify:finality -- --claim-id clm_… --event-id 0x<64 hex> [--reference official-explorer-url] [--dry-run]');
const address=process.env.SLAIV_CLAIMS_ADDRESS||process.env.NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS;
const rpc=process.env.GENLAYER_RPC_URL||process.env.NEXT_PUBLIC_GENLAYER_RPC_URL||'https://studio.genlayer.com/api';
if(!address)throw Error('Set SLAIV_CLAIMS_ADDRESS or NEXT_PUBLIC_SLAIV_CLAIMS_ADDRESS.');
const cli=(args)=>execFileSync('npx',['--yes','genlayer@0.39.2',...args],{encoding:'utf8',stdio:['ignore','pipe','inherit']});
const decode=output=>{const match=output.match(/Result:\s*\n([\s\S]*?)\n\n√/);if(!match)throw Error('Unable to parse GenLayer CLI result.');return JSON.parse(match[1]);};
const claim=JSON.parse(decode(cli(['call',address,'get_claim','--args',claimId,'--rpc',rpc])));
if(!claim?.policy_id)throw Error('Claim was not found on the configured SLAIV contract.');
const policy=JSON.parse(decode(cli(['call',address,'get_policy','--args',claim.policy_id,'--rpc',rpc])));
const explorers={studionet:'https://explorer-studio.genlayer.com/',testnetAsimov:'https://explorer-asimov.genlayer.com/',testnetBradbury:'https://explorer-bradbury.genlayer.com/'};
const base=explorers[policy.subject_network];
if(!base)throw Error(`Unsupported policy network: ${policy.subject_network}`);
const reference=suppliedReference||`${base}tx/${eventId}`;
if(!reference.startsWith(base)||!reference.toLowerCase().includes(eventId.toLowerCase()))throw Error(`Reference must be an official ${policy.subject_network} explorer URL containing the event ID.`);
const candidate={claimId,eventId,reference,policyId:claim.policy_id,validator:policy.validator,network:policy.subject_network};
if(dryRun){console.log(JSON.stringify({...candidate,note:'Dry run only validates the candidate shape. GenLayer consensus verification happens only when the write is submitted.'},null,2));process.exit(0)}
console.log('Submitting permissionless protocol-event candidate. The caller does not attest finality; GenLayer consensus verifies the official source.');
cli(['write',address,'verify_protocol_finality','--args',claimId,eventId,reference,'--rpc',rpc]);
console.log(JSON.stringify(candidate,null,2));
