import {Connection} from '@solana/web3.js';
import {quotePumpFullSell} from './pump-canary-build.js';
import {fullExitTrigger} from './position-exit.js';

// Read-only observation. A triggered threshold records an intent for review;
// it never signs, broadcasts, or reserves a sell transaction.
export async function inspectOpenPositions({storage,rpcUrl,quote=quotePumpFullSell,
  connectionFactory=url=>new Connection(url,'confirmed'),now=Date.now}={}){
  if(!storage?.list||!storage?.put||typeof rpcUrl!=='string'||!/^https:\/\//.test(rpcUrl))
    throw Error('Position monitoring unavailable');
  const positions=await storage.list({prefix:'position:'});
  if(!positions.size)return {checked:0,triggered:0};
  const connection=connectionFactory(rpcUrl);
  let checked=0,triggered=0;
  for(const [key,position] of positions){
    if(position?.state!=='open')continue;
    checked++;
    const mint=key.slice('position:'.length);
    try{
      if(mint!==position.mint)throw Error('position_identity_mismatch');
      const snapshot=await quote({connection,wallet:position.wallet,mint,amountRaw:position.amountRaw,now});
      const decision=fullExitTrigger(position,snapshot,{now:now()});
      await storage.put('exit-observation:'+mint,{checkedAt:now(),expectedSolOutLamports:snapshot.expectedSolOutLamports,
        venue:snapshot.venue,reason:decision.reason});
      if(decision.triggered){
        const intentKey='exit-intent:'+mint;
        if(!await storage.get(intentKey))await storage.put(intentKey,{state:'pending-verification',buyOrderId:position.buyOrderId,
          mint,wallet:position.wallet,reason:decision.reason,observedAt:snapshot.observedAt,
          expectedSolOutLamports:snapshot.expectedSolOutLamports});
        triggered++;
      }
    }catch(error){
      const reason=error?.message==='migrated_pool_requires_pumpswap_exit'?'migrated_pool_requires_pumpswap_exit':'quote_unavailable';
      await storage.put('exit-observation:'+mint,{checkedAt:now(),reason});
    }
  }
  return {checked,triggered};
}
