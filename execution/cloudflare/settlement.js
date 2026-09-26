import {decodeTransaction} from './signed-transaction.js';

function rawTokenTotal(entries,wallet,mint){
  if(!Array.isArray(entries))throw Error('Missing token balance evidence');
  let total=0n;const seen=new Set();
  for(const entry of entries){
    if(entry.mint!==mint)continue;
    if(typeof entry.owner!=='string')throw Error('Missing token owner');
    if(entry.owner!==wallet)continue;
    if(!Number.isSafeInteger(entry.accountIndex)||seen.has(entry.accountIndex)||!/^(0|[1-9]\d*)$/.test(entry.uiTokenAmount?.amount))throw Error('Invalid token balance evidence');
    seen.add(entry.accountIndex);total+=BigInt(entry.uiTokenAmount.amount);
  }
  return total;
}

export function verifySettlement(order,result){
  if(!result||!Number.isSafeInteger(result.slot)||result.slot<1||!result.meta||!Object.hasOwn(result.meta,'err')||
    !Array.isArray(result.transaction)||result.transaction[1]!=='base64'||result.transaction[0]!==order.signedTransaction)throw Error('Transaction receipt mismatch');
  const tx=decodeTransaction(result.transaction[0]),meta=result.meta;
  if(tx.message.staticAccountKeys[0]?.toBase58()!==order.wallet||!Number.isSafeInteger(meta.fee)||meta.fee<0||
    !Number.isSafeInteger(meta.preBalances?.[0])||!Number.isSafeInteger(meta.postBalances?.[0])||meta.preBalances[0]<0||meta.postBalances[0]<0)throw Error('Invalid payer settlement');
  if(meta.err!==null)return {state:'failed',slot:result.slot,feeLamports:String(meta.fee)};
  const tokenDelta=rawTokenTotal(meta.postTokenBalances,order.wallet,order.mint)-rawTokenTotal(meta.preTokenBalances,order.wallet,order.mint);
  const solDelta=BigInt(meta.postBalances[0])-BigInt(meta.preBalances[0]);
  const prepared=order.prepared;
  if((order.side||'buy')==='buy'){
    if(tokenDelta!==BigInt(prepared.tokenAmountRaw)||solDelta>0n||-solDelta>BigInt(prepared.maximumSpendLamports)+BigInt(prepared.reservedRentLamports)+BigInt(meta.fee))throw Error('Buy settlement exceeds expected amounts');
  }else if(tokenDelta!==-BigInt(order.amountRaw)||solDelta+BigInt(meta.fee)<BigInt(prepared.minimumReceiveLamports))throw Error('Sell settlement does not meet expected amounts');
  return {state:'confirmed',slot:result.slot,feeLamports:String(meta.fee),tokenDeltaRaw:tokenDelta.toString(),solDeltaLamports:solDelta.toString()};
}
