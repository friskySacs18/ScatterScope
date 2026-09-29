// Only finalized full exits change the streak. This runs inside the same
// durable transaction that closes the position, so reconciliation is idempotent.
export async function recordCallerExit(txn,{position,buy,receipt,sellOrderId,settledAt}){
  const caller=buy?.caller;
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(caller||''))return;
  if(!/^\d+$/.test(position.costLamports||'')||!/^\d+$/.test(buy.receipt?.feeLamports||'')||
    !/^-?\d+$/.test(receipt.solDeltaLamports||'')||!/^\d+$/.test(receipt.rentPaidLamports||''))
    throw Error('Incomplete realized trade receipt');
  const net=BigInt(receipt.solDeltaLamports)-BigInt(receipt.rentPaidLamports)-
    BigInt(position.costLamports)-BigInt(buy.receipt.feeLamports);
  const key='caller-streak:'+caller,previous=await txn.get(key);
  const losses=net<0n?(previous?.losses||0)+1:0;
  const result={caller,losses,lastOrderId:sellOrderId,updatedAt:settledAt};
  await txn.put(key,result);
  if(losses>=4){
    await txn.put('caller-alert:'+caller,{...result,kind:'consecutive_losses',
      message:`This caller has ${losses} consecutive losing closed trades. Review their results.`});
  }else if(net>=0n){await txn.delete('caller-alert:'+caller)}
}
