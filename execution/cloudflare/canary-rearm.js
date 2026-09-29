// Re-arm only a fully reconciled, closed test. Permanent order and mint
// reservations are never removed; an unknown signature keeps the test locked.
export async function armCanary(storage,accountId,now=Date.now()){
  return storage.transaction(async txn=>{
    if(await txn.get('active-order'))return {state:'blocked',reason:'prior_order_unresolved'};
    const prior=await txn.get('canary-attempt');
    if(prior){
      const buy=await txn.get('order:'+prior),position=buy?.mint?await txn.get('position:'+buy.mint):null;
      const sellId=buy?.mint?await txn.get('sell:'+buy.mint):null;
      const sell=sellId?await txn.get('order:'+sellId):null;
      if(buy?.canary!==true||buy?.state!=='confirmed'||buy?.receipt?.state!=='confirmed'||buy.accountId!==accountId||
        position?.canary!==true||position?.state!=='closed'||position.buyOrderId!==prior||position.accountId!==accountId||
        position.wallet!==buy.wallet||position.mint!==buy.mint||
        sell?.side!=='sell'||sell?.state!=='confirmed'||sell.receipt?.state!=='confirmed'||sell.accountId!==accountId||
        sell.buyOrderId!==prior||sell.wallet!==buy.wallet||sell.mint!==buy.mint)
        return {state:'blocked',reason:'previous_test_not_fully_closed'};
      await txn.put('canary-history:'+prior,{buyOrderId:prior,sellOrderId:sellId,mint:buy.mint,completedAt:sell.settledAt||now});
      await txn.delete('canary-attempt');
    }else{
      const existing=await txn.get('canary-arm');
      if(existing&&existing.expiresAt>now){
        if(existing.accountId!==accountId)return {state:'blocked',reason:'test_account_mismatch'};
        return {state:'armed',expiresAt:existing.expiresAt};
      }
    }
    const arm={accountId,armedAt:now,expiresAt:now+600000};
    await txn.put('canary-arm',arm);return {state:'armed',expiresAt:arm.expiresAt};
  });
}
