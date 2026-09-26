import bs58 from 'bs58';
import {VersionedTransaction} from '@solana/web3.js';

const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
export function rpcEndpoint(input){
  const url=new URL(input);
  const publicHost=['api.mainnet-beta.solana.com','api.mainnet.solana.com','solana-rpc.publicnode.com'].includes(url.hostname);
  const heliusHost=url.hostname==='mainnet.helius-rpc.com';
  const heliusKey=url.searchParams.get('api-key');
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port||url.pathname!=='/'||
    !(publicHost&&!url.search||heliusHost&&url.searchParams.size===1&&
      typeof heliusKey==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(heliusKey)))
    throw Error('Unapproved Solana RPC endpoint');
  return url.href;
}
function signedIdentity(encoded){
  if(typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Invalid signed transaction');
  const bytes=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
  if(bytes.length<100||bytes.length>1232)throw Error('Invalid signed transaction');
  const tx=VersionedTransaction.deserialize(bytes);
  const signature=tx.signatures?.[0];
  if(!signature||signature.length!==64||signature.every(byte=>byte===0))throw Error('Missing transaction signature');
  return bs58.encode(signature);
}
async function callRpc(url,request,fetcher){
  const response=await fetcher(rpcEndpoint(url),{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,...request}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('RPC HTTP '+response.status);
  const raw=await response.text();
  if(raw.length>32000)throw Error('Oversized RPC response');
  const body=JSON.parse(raw);
  if(body?.jsonrpc!=='2.0'||body.id!==1||body.error)throw Error('RPC rejected request');
  return body.result;
}

// This check runs before asking the owner to sign. The transaction must have
// exactly one empty signature; simulation is evidence, not authorization.
export async function simulateUnsignedTrade({encoded,rpcUrl,fetcher=fetch}){
  rpcEndpoint(rpcUrl);
  if(typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Invalid unsigned transaction');
  const bytes=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
  if(bytes.length<100||bytes.length>1232)throw Error('Invalid unsigned transaction');
  const tx=VersionedTransaction.deserialize(bytes);
  if(tx.signatures.length!==1||tx.signatures[0].length!==64||!tx.signatures[0].every(x=>x===0))
    throw Error('Simulation requires exactly one unsigned wallet signature');
  const result=await callRpc(rpcUrl,{method:'simulateTransaction',params:[encoded,
    {encoding:'base64',sigVerify:false,replaceRecentBlockhash:false,commitment:'confirmed'}]},fetcher);
  if(!result?.value||!Object.hasOwn(result.value,'err')||
     !Number.isSafeInteger(result.value.unitsConsumed)||result.value.unitsConsumed<0)
    throw Error('Incomplete trade simulation');
  if(result.value.err!==null)return {passed:false,reason:'on_chain_simulation_failed'};
  return {passed:true,unitsConsumed:result.value.unitsConsumed};
}

// Call only after an order journal has recorded the exact signature and its
// irreversible broadcast state. Unknown responses must be reconciled before
// any further action; never create another signed transaction for this order.
export async function broadcastRecordedTransaction({encoded,recordedSignature,rpcUrl,fetcher=fetch}){
  rpcEndpoint(rpcUrl);
  if(!ADDRESS.test(recordedSignature||'')||signedIdentity(encoded)!==recordedSignature)throw Error('Recorded signature mismatch');
  try{
    const result=await callRpc(rpcUrl,{method:'sendTransaction',params:[encoded,
      {encoding:'base64',skipPreflight:false,preflightCommitment:'confirmed',maxRetries:0}]},fetcher);
    if(result!==recordedSignature)return {state:'unknown',reason:'rpc_signature_mismatch',signature:recordedSignature};
    return {state:'submitted',signature:recordedSignature};
  }catch{return {state:'unknown',reason:'rpc_outcome_unverified',signature:recordedSignature}}
}
export async function finalizedStatus({signature,rpcUrl,fetcher=fetch}){
  rpcEndpoint(rpcUrl);
  if(!ADDRESS.test(signature||''))throw Error('Invalid transaction signature');
  try{
    const result=await callRpc(rpcUrl,{method:'getSignatureStatuses',params:[[signature],{searchTransactionHistory:true}]},fetcher);
    if(!Array.isArray(result?.value)||result.value.length!==1)return {state:'unknown'};
    const value=result.value[0];
    if(value===null)return {state:'pending'};
    if(value.confirmationStatus!=='finalized'||!Object.hasOwn(value,'err'))return {state:'pending'};
    return {state:value.err===null?'confirmed':'failed',status:value};
  }catch{return {state:'unknown'}}
}

export async function finalizedTransaction({signature,rpcUrl,fetcher=fetch}){
  if(!ADDRESS.test(signature||''))throw Error('Invalid transaction signature');
  return callRpc(rpcUrl,{method:'getTransaction',params:[signature,
    {encoding:'base64',commitment:'finalized',maxSupportedTransactionVersion:0}]},fetcher);
}
