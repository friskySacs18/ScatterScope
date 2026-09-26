import {beginSigning} from './order-journal.js';
import {verifySignedTransaction} from './signed-transaction.js';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';
import {broadcastRecordedTransaction,finalizedStatus,finalizedTransaction} from './rpc-transport.js';
import {verifySettlement} from './settlement.js';

// Server-only entry point. The order must already have passed reserveBuy or
// reserveFullSell using independently fetched evidence. Never expose prepared
// or authorize as fields accepted from an HTTP request.
export async function executeReservedOrder({storage,orderId,prepared,authorize,sign,rpcUrl,fetcher=fetch,now=Date.now}){
  const order=await storage.get('order:'+orderId);
  if(!order||order.state!=='reserved')return {state:order?.state||'missing',orderId};
  const side=order.side||'buy';
  if(prepared.wallet!==order.wallet||prepared.mint!==order.mint||prepared.side!==side||
     !Number.isSafeInteger(prepared.quoteAt)||now()-prepared.quoteAt>5000||prepared.quoteAt>now()||
     !Number.isSafeInteger(prepared.lastValidBlockHeight)||prepared.lastValidBlockHeight<1)throw Error('Preparation identity or freshness mismatch');
  if(side==='buy'&&prepared.maximumSpendLamports!==order.amountLamports||side==='sell'&&prepared.tokenAmountRaw!==order.amountRaw)throw Error('Preparation amount mismatch');
  const inspected=inspectPumpV2Transaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,side,
    amountRaw:prepared.tokenAmountRaw,limitLamports:side==='buy'?prepared.maximumSpendLamports:prepared.minimumReceiveLamports});
  if(!inspected.valid)throw Error('Prepared transaction rejected');
  // Recheck revocation, current account controls and block height immediately
  // before the irreversible attempt marker. Exceptions leave it unsigned.
  if(await authorize({order,prepared})!==true)throw Error('Order authorization unavailable or revoked');
  if(now()-prepared.quoteAt>5000)throw Error('Preparation expired during authorization');
  if(!await beginSigning(storage,orderId))return {state:'already_attempted',orderId};
  let signed;
  try{
    signed=await verifySignedTransaction({unsigned:prepared.transaction,signed:await sign({order,transaction:prepared.transaction}),wallet:order.wallet});
  }catch{
    // A signer timeout must never produce an automatic second signing attempt.
    return {state:'signing_unknown',orderId};
  }
  const recorded=await storage.transaction(async txn=>{
    const current=await txn.get('order:'+orderId);
    if(current?.state!=='signing'||current.signature)return false;
    await txn.put('order:'+orderId,{...current,state:'broadcast',...signed,prepared,recordedAt:now()});
    return true;
  });
  if(!recorded)return {state:'recording_conflict',orderId};
  // Durable bytes and signature exist before the first RPC submission.
  const outcome=await broadcastRecordedTransaction({encoded:signed.signedTransaction,recordedSignature:signed.signature,rpcUrl,fetcher});
  return {...outcome,orderId};
}

// Restart-safe: reconcile the recorded signature, never rebuild or re-sign.
export async function reconcileOrder({storage,orderId,rpcUrl,fetcher=fetch,now=Date.now}){
  const order=await storage.get('order:'+orderId);
  if(!order)return {state:'missing',orderId};
  if(order.state!=='broadcast'||!order.signedTransaction)return {state:order.state,orderId};
  const status=await finalizedStatus({signature:order.signature,rpcUrl,fetcher});
  if(!['confirmed','failed'].includes(status.state))return {...status,orderId};
  let receipt;
  try{receipt=verifySettlement(order,await finalizedTransaction({signature:order.signature,rpcUrl,fetcher}))}
  catch{return {state:'reconciliation_pending',orderId,signature:order.signature}}
  if(receipt.state!==status.state)return {state:'reconciliation_pending',orderId};
  await storage.transaction(async txn=>{
    const current=await txn.get('order:'+orderId);
    if(current?.state!=='broadcast'||current.signature!==order.signature)return;
    await txn.put('order:'+orderId,{...current,state:receipt.state,receipt,settledAt:now()});
  });
  return {state:receipt.state,orderId,signature:order.signature,receipt};
}
