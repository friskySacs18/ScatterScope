import {evaluateBuy} from './order-controls.js';
import {fullExitRules} from './position-exit.js';
import {reviewMatches} from './manual-sell-review.js';
const MAX_U64=18446744073709551615n;

// One Durable Object per account serializes admission. Only a server component
// that fetched the evidence itself may call these methods. Never map untrusted
// HTTP JSON directly to this interface.
export async function reserveBuy(storage,evidence,now=Date.now()){
  if(!storage?.transaction)throw Error('Durable account storage required');
  let exitRules;
  try{exitRules=fullExitRules(evidence.exitRules)}catch{return {reserved:false,reason:'full_exit_rules_required'}}
  const check=evaluateBuy(evidence,now);
  if(!check.allowed)return {reserved:false,reason:check.reason};
  return storage.transaction(async txn=>{
    const signalKey='signal:'+evidence.signalId+':buy';
    const mintKey='mint:'+evidence.mint;
    const prior=await txn.get(signalKey);
    if(prior)return {reserved:false,reason:'duplicate_signal',orderId:prior};
    if(await txn.get(mintKey))return {reserved:false,reason:'duplicate_mint'};
    const day=new Date(now).toISOString().slice(0,10);
    const spentKey='daily:'+day;
    const reserved=BigInt((await txn.get(spentKey))||'0');
    const amount=BigInt(check.reservationLamports);
    if(reserved+amount>BigInt(evidence.dailyCapLamports))return {reserved:false,reason:'daily_budget_exceeded'};
    const orderId=crypto.randomUUID();
    const order={id:orderId,accountId:evidence.accountId,signalId:evidence.signalId,mint:evidence.mint,caller:evidence.caller,wallet:evidence.wallet,walletId:evidence.walletId||null,canary:evidence.canary===true,
      amountLamports:amount.toString(),exitRules,state:'reserved',createdAt:now,signature:null};
    await txn.put('order:'+orderId,order);
    await txn.put(signalKey,orderId);
    await txn.put(mintKey,orderId);
    await txn.put(spentKey,(reserved+amount).toString());
    return {reserved:true,orderId};
  });
}

// Write an irreversible attempt marker before contacting the signer or RPC.
// Broadcast outcomes stay locked for chain reconciliation. Unsubmitted signing
// failures may close the account lock while retaining permanent buy locks.
export async function beginSigning(storage,orderId,now=Date.now()){
  if(!/^[0-9a-f-]{36}$/.test(orderId||''))throw Error('Invalid order ID');
  return storage.transaction(async txn=>{
    const key='order:'+orderId,order=await txn.get(key);
    if(!order||order.state!=='reserved')return false;
    await txn.put(key,{...order,state:'signing',signingStartedAt:now});return true;
  });
}
export async function markBroadcast(storage,orderId,signature){
  if(!/^[0-9a-f-]{36}$/.test(orderId||'')||!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature||''))throw Error('Invalid broadcast identity');
  return storage.transaction(async txn=>{
    const key='order:'+orderId,order=await txn.get(key);
    if(!order||order.state!=='signing'||order.signature)return false;
    await txn.put(key,{...order,state:'broadcast',signature});return true;
  });
}
export async function markFinalized(storage,orderId,signature,status){
  if(!/^[0-9a-f-]{36}$/.test(orderId||'')||!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature||''))throw Error('Invalid reconciliation identity');
  if(status?.confirmationStatus!=='finalized'||!Object.hasOwn(status,'err'))return false;
  return storage.transaction(async txn=>{
    const key='order:'+orderId,order=await txn.get(key);
    if(!order||order.state!=='broadcast'||order.signature!==signature)return false;
    await txn.put(key,{...order,state:status.err===null?'confirmed':'failed'});return true;
  });
}

// A full-balance exit is the only sell shape admitted for the first canary.
// The caller must obtain the token account balance and transaction evidence
// independently; this reservation only serializes the account state.
export async function reserveFullSell(storage,{accountId,mint,buyOrderId,rawBalance,verifiedBalance,ownerVerified,
  consentVerified,signerPolicyVerified,fullTransactionVerified,simulationPassed,quoteAt,minSolOutLamports,
  executionEnabled,killSwitch,manualReviewId=null},now=Date.now()){
  if(!storage?.transaction)throw Error('Durable account storage required');
  if(!/^[A-Za-z0-9:_-]{1,128}$/.test(accountId||'')||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint||'')||
    !/^[0-9a-f-]{36}$/.test(buyOrderId||'')||
    !/^[1-9]\d{0,38}$/.test(rawBalance||'')||
    !/^[1-9]\d{0,19}$/.test(minSolOutLamports||'')||
    verifiedBalance!==true||ownerVerified!==true||consentVerified!==true||
    signerPolicyVerified!==true||fullTransactionVerified!==true||simulationPassed!==true||
    executionEnabled!==true||killSwitch!==false||
    !Number.isSafeInteger(quoteAt)||quoteAt>now||now-quoteAt>5000||
    !Number.isSafeInteger(now)||now<1||BigInt(minSolOutLamports)>MAX_U64||BigInt(rawBalance)>MAX_U64)
    return {reserved:false,reason:'sell_evidence_unverified'};
  return storage.transaction(async txn=>{
    const buy=await txn.get('order:'+buyOrderId);
    if(!buy||buy.accountId!==accountId||buy.mint!==mint||buy.state!=='confirmed')
      return {reserved:false,reason:'settled_buy_required'};
    const key='sell:'+mint;
    if(await txn.get(key))return {reserved:false,reason:'sell_already_reserved'};
    const orderId=crypto.randomUUID();
    if(!buy.receipt||buy.receipt.state!=='confirmed'||buy.receipt.tokenDeltaRaw!==rawBalance)
      return {reserved:false,reason:'verified_buy_receipt_required'};
    if(manualReviewId){
      const review=await txn.get('manual-sell-review:'+mint),position=await txn.get('position:'+mint);
      if(!reviewMatches(review,position,accountId,manualReviewId,now)||review.usedOrderId||
        review.wallet!==buy.wallet||review.amountRaw!==rawBalance||BigInt(minSolOutLamports)<BigInt(review.minimumReceiveLamports))
        return {reserved:false,reason:'manual_sell_review_expired'};
      await txn.put('manual-sell-review:'+mint,{...review,usedOrderId:orderId});
    }
    await txn.put('order:'+orderId,{id:orderId,accountId,mint,wallet:buy.wallet,walletId:buy.walletId||null,buyOrderId,amountRaw:rawBalance,
      side:'sell',manual:Boolean(manualReviewId),state:'reserved',createdAt:now,signature:null});
    await txn.put(key,orderId);
    return {reserved:true,orderId};
  });
}
