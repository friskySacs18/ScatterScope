import {evaluateBuy} from './order-controls.js';

// One Durable Object per account serializes admission. Only a server component
// that fetched the evidence itself may call these methods. Never map untrusted
// HTTP JSON directly to this interface.
export async function reserveBuy(storage,evidence,now=Date.now()){
  if(!storage?.transaction)throw Error('Durable account storage required');
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
    const order={id:orderId,accountId:evidence.accountId,signalId:evidence.signalId,mint:evidence.mint,
      amountLamports:amount.toString(),state:'reserved',createdAt:now,signature:null};
    await txn.put('order:'+orderId,order);
    await txn.put(signalKey,orderId);
    await txn.put(mintKey,orderId);
    await txn.put(spentKey,(reserved+amount).toString());
    return {reserved:true,orderId};
  });
}

// Write an irreversible attempt marker before contacting the signer or RPC.
// Unknown outcomes stay locked for explicit reconciliation, not a new buy.
export async function beginSigning(storage,orderId){
  if(!/^[0-9a-f-]{36}$/.test(orderId||''))throw Error('Invalid order ID');
  return storage.transaction(async txn=>{
    const key='order:'+orderId,order=await txn.get(key);
    if(!order||order.state!=='reserved')return false;
    await txn.put(key,{...order,state:'signing'});return true;
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
