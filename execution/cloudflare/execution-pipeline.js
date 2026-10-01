import {beginSigning} from './order-journal.js';
import {verifySignedTransaction} from './signed-transaction.js';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';
import {inspectPumpAmmSellTransaction,inspectPumpAmmBuyTransaction} from './inspect-pump-amm.js';
import {broadcastRecordedTransaction,finalizedStatus,finalizedTransaction,recordedTransactionExpiry} from './rpc-transport.js';
import {verifySettlement} from './settlement.js';
import {confirmedPosition} from './position-exit.js';
import {recordCallerExit} from './caller-loss-alert.js';

export const TERMINAL_ORDER_STATES=['confirmed','failed','expired','not_submitted'];
const UNSUBMITTED_STATES=['reserved','signing','signing_unknown'];
const SIGNING_DEADLINE_MS=25000;
const STALLED_UNSIGNED_MS=60000;
const SIGNER_CODES=new Set(['signer_timeout','signer_unavailable','wallet_owner_mismatch','wallet_delegation_revoked',
  'signer_quorum_mismatch','signing_policy_unavailable','signer_request_rejected','invalid_signer_response',
  'signer_connection_failed','signer_rate_limited','signer_service_unavailable','signer_authentication_failed',
  'signer_policy_denied','signer_authorization_rejected','signer_request_expired','signer_transaction_rejected',
  'signer_request_conflict','signer_local_error']);

// This is safe only before the durable broadcast marker. Signing is a sign-only
// operation: the pipeline is the sole sender and records bytes BEFORE any RPC.
// Keep signal/mint locks so closing an unsigned attempt cannot duplicate a buy.
async function markNotSubmitted(storage,orderId,reason,now,httpStatus=null){
  return storage.transaction(async txn=>{
    const key='order:'+orderId,current=await txn.get(key);
    if(!current||!UNSUBMITTED_STATES.includes(current.state)||current.signature||current.signedTransaction||current.recordedAt!=null)return false;
    await txn.put(key,{...current,state:'not_submitted',failureReason:reason,failureHttpStatus:httpStatus,settledAt:now});
    if(await txn.get('active-order')===orderId)await txn.delete('active-order');
    const latest=await txn.get('buy-last-check');
    if(current.side!=='sell'&&current.signalId&&latest?.signalId===current.signalId)
      await txn.put('buy-last-check',{...latest,at:now,state:'not_submitted',reason,httpStatus});
    if(current.side==='sell'&&await txn.get('sell:'+current.mint)===orderId){
      await txn.delete('sell:'+current.mint);
      const failuresKey='sell-failures:'+current.mint;
      await txn.put(failuresKey,Math.min(3,Number(await txn.get(failuresKey)||0)+1));
    }
    return true;
  });
}

async function signingDeadline(operation,timeoutMs){
  let timer;
  try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Object.assign(Error('Signing deadline exceeded'),{code:'signer_timeout'})),timeoutMs);
  })])}finally{clearTimeout(timer)}
}

// Server-only entry point. The order must already have passed reserveBuy or
// reserveFullSell using independently fetched evidence. Never expose prepared
// or authorize as fields accepted from an HTTP request.
export async function executeReservedOrder({storage,orderId,prepared,authorize,sign,rpcUrl,fetcher=fetch,now=Date.now,signingTimeoutMs=SIGNING_DEADLINE_MS}){
  const order=await storage.get('order:'+orderId);
  if(!order||order.state!=='reserved')return {state:order?.state||'missing',orderId};
  const side=order.side||'buy';
  let preparationFailure='preparation_verification_failed';
  try{
    if(prepared.wallet!==order.wallet||prepared.mint!==order.mint||prepared.side!==side||
       !Number.isSafeInteger(prepared.quoteAt)||now()-prepared.quoteAt>5000||prepared.quoteAt>now()||
       !Number.isSafeInteger(prepared.lastValidBlockHeight)||prepared.lastValidBlockHeight<1)throw Error('Preparation identity or freshness mismatch');
    if(side==='buy'&&prepared.maximumSpendLamports!==order.amountLamports||side==='sell'&&prepared.tokenAmountRaw!==order.amountRaw)throw Error('Preparation amount mismatch');
    const inspected=prepared.venue==='pump-amm'?(side==='sell'?
      inspectPumpAmmSellTransaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,
        amountRaw:prepared.tokenAmountRaw,limitLamports:prepared.minimumReceiveLamports}):
      inspectPumpAmmBuyTransaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,
        amountRaw:prepared.tokenAmountRaw,limitLamports:prepared.maximumSpendLamports,
        tokenProgram:prepared.tokenProgram})):
      inspectPumpV2Transaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,side,
        amountRaw:prepared.tokenAmountRaw,limitLamports:side==='buy'?prepared.maximumSpendLamports:prepared.minimumReceiveLamports});
    if(!inspected.valid)throw Error('Prepared transaction rejected');
    // Recheck revocation, current account controls and block height immediately
    // before the irreversible attempt marker. Exceptions leave it unsigned.
    preparationFailure='order_authorization_unavailable';
    if(await authorize({order,prepared})!==true)throw Error('Order authorization unavailable or revoked');
    preparationFailure='preparation_expired';
    if(now()-prepared.quoteAt>5000)throw Error('Preparation expired during authorization');
  }catch(error){await markNotSubmitted(storage,orderId,preparationFailure,now());throw error}
  if(!await beginSigning(storage,orderId,now()))return {state:'already_attempted',orderId};
  let signed;
  try{
    signed=await signingDeadline(async()=>{
      const encoded=await sign({order,transaction:prepared.transaction});
      try{return await verifySignedTransaction({unsigned:prepared.transaction,signed:encoded,wallet:order.wallet})}
      catch{throw Object.assign(Error('Invalid signer response'),{code:'invalid_signer_response'})}
    },signingTimeoutMs);
  }catch(error){
    const reason=SIGNER_CODES.has(error?.code)?error.code:'signer_unavailable';
    const httpStatus=Number.isInteger(error?.httpStatus)&&error.httpStatus>=400&&error.httpStatus<=599?error.httpStatus:null;
    const closed=await markNotSubmitted(storage,orderId,reason,now(),httpStatus);
    console.warn('Order signing failed',JSON.stringify({orderId,reason,httpStatus}));
    return {state:closed?'not_submitted':(await storage.get('order:'+orderId))?.state||'missing',reason,httpStatus,orderId};
  }
  const recorded=await storage.transaction(async txn=>{
    const current=await txn.get('order:'+orderId);
    if(current?.state!=='signing'||current.signature||current.signedTransaction||current.recordedAt!=null)return false;
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
  const started=order.signingStartedAt??order.createdAt;
  if(UNSUBMITTED_STATES.includes(order.state)&&Number.isSafeInteger(started)&&now()-started>=STALLED_UNSIGNED_MS){
    if(await markNotSubmitted(storage,orderId,'signing_interrupted',now()))return {state:'not_submitted',reason:'signing_interrupted',orderId};
  }
  if(order.state!=='broadcast'||!order.signedTransaction)return {state:order.state,orderId};
  const status=await finalizedStatus({signature:order.signature,rpcUrl,fetcher});
  if(!['confirmed','failed'].includes(status.state)){
    if(status.state==='pending'){
      const proof=await recordedTransactionExpiry({signature:order.signature,encoded:order.signedTransaction,
        lastValidBlockHeight:order.prepared?.lastValidBlockHeight,rpcUrl,fetcher});
      if(proof){
        const expired=await storage.transaction(async txn=>{
          const current=await txn.get('order:'+orderId);
          if(current?.state!=='broadcast'||current.signature!==order.signature)return false;
          await txn.put('order:'+orderId,{...current,state:'expired',expiryProof:proof,settledAt:now()});
          if(current.side==='sell'&&await txn.get('sell:'+current.mint)===orderId){
            await txn.delete('sell:'+current.mint);
            const key='sell-failures:'+current.mint;
            await txn.put(key,Math.min(3,Number(await txn.get(key)||0)+1));
          }
          return true;
        });
        if(expired)return {state:'expired',orderId,signature:order.signature};
        return {state:'reconciliation_pending',orderId};
      }
      // Retry exactly the recorded bytes, never rebuild/re-sign while unknown.
      await broadcastRecordedTransaction({encoded:order.signedTransaction,recordedSignature:order.signature,rpcUrl,fetcher});
    }
    return {...status,orderId};
  }
  let receipt;
  try{receipt=verifySettlement(order,await finalizedTransaction({signature:order.signature,rpcUrl,fetcher}))}
  catch{return {state:'reconciliation_pending',orderId,signature:order.signature}}
  if(receipt.state!==status.state)return {state:'reconciliation_pending',orderId};
  await storage.transaction(async txn=>{
    const current=await txn.get('order:'+orderId);
    if(current?.state!=='broadcast'||current.signature!==order.signature)return;
    const settledAt=now(),settled={...current,state:receipt.state,receipt,settledAt};
    if((current.side||'buy')==='buy'&&receipt.state==='confirmed'){
      // A confirmed buy and its position must be recorded atomically. A bad
      // rules snapshot leaves the order unresolved instead of opening a trade
      // the exit loop cannot manage.
      const position=confirmedPosition({buyOrder:settled,rules:current.exitRules,now:settledAt});
      await txn.put('position:'+current.mint,position);
    }
    if(current.side==='sell'&&receipt.state==='confirmed'){
      const key='position:'+current.mint,position=await txn.get(key);
      if(!position||position.state!=='open'||position.buyOrderId!==current.buyOrderId||
        position.amountRaw!==current.amountRaw)throw Error('Settled sell position mismatch');
      const buy=await txn.get('order:'+current.buyOrderId);
      if(!buy||buy.state!=='confirmed')throw Error('Confirmed buy missing for exit');
      await recordCallerExit(txn,{position,buy,receipt,sellOrderId:orderId,settledAt});
      await txn.put(key,{...position,state:'closed',closedAt:settledAt,sellOrderId:orderId});
    }
    if(current.side==='sell'&&receipt.state==='failed'){
      // Only a finalized, on-chain failure is safe to retry. Unknown or
      // pending signatures retain the reservation and signed bytes.
      const sellKey='sell:'+current.mint;
      if(await txn.get(sellKey)===orderId)await txn.delete(sellKey);
      const failuresKey='sell-failures:'+current.mint;
      const prior=Number(await txn.get(failuresKey)||0);
      await txn.put(failuresKey,Math.min(3,prior+1));
    }
    await txn.put('order:'+orderId,settled);
  });
  return {state:receipt.state,orderId,signature:order.signature,receipt};
}
