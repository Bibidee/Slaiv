import { createClient } from 'genlayer-js';
import { testnetBradbury, testnetAsimov, studionet, localnet } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';

const networks={testnetBradbury,testnetAsimov,studionet,localnet};
export const config=Object.freeze({network:import.meta.env.VITE_GENLAYER_NETWORK||'',rpcUrl:import.meta.env.VITE_GENLAYER_RPC_URL||'',address:import.meta.env.VITE_SLAIV_CLAIMS_ADDRESS||''});
export function deployment(){const chain=networks[config.network];return {configured:Boolean(chain&&config.address),reason:!chain?'VITE_GENLAYER_NETWORK must be localnet, studionet, testnetAsimov, or testnetBradbury.':!config.address?'VITE_SLAIV_CLAIMS_ADDRESS is not configured.':'' ,chain};}
export function readClient(){const d=deployment();if(!d.configured)throw Error(d.reason);return createClient({chain:d.chain,endpoint:config.rpcUrl||undefined});}
export async function connectWallet(){if(!window.ethereum)throw Error('No EIP-1193 wallet provider detected.');const d=deployment();if(!d.chain)throw Error(d.reason);const [account]=await window.ethereum.request({method:'eth_requestAccounts'});const client=createClient({chain:d.chain,endpoint:config.rpcUrl||undefined,account,provider:window.ethereum});await client.connect(config.network);return {account,client};}
export async function readContract(functionName,args=[]){return readClient().readContract({address:config.address,functionName,args,stateStatus:'accepted'});}
export async function writeContract(client,functionName,args=[]){const hash=await client.writeContract({address:config.address,functionName,args,value:0n});const receipt=await readClient().waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED});if(receipt.txExecutionResultName!==ExecutionResult.FINISHED_WITH_RETURN)throw Error(`Contract execution did not finish successfully: ${receipt.txExecutionResultName}`);return {hash,receipt};}
