import {Connection} from '@solana/web3.js';
import {reserveBuy,reserveFullSell} from './order-journal.js';
import {preparePumpCanaryBuy,preparePumpFullSell} from './pump-canary-build.js';
import {executeReservedOrder,reconcileOrder} from './execution-pipeline.js';
import {createPrivySigner} from './privy-signer.js';

// ORDER_CONTEXT is a private service binding, never a URL or user JSON.
// It owns verified account/rule/history/market-cap evidence. Until that
// integration exists this executor cannot accept any buy or sell job.
export async function readOrderContext(env,job,side){
  if(!env.ORDER_CONTEXT?.fetch)throw Error('Verified order context is not connected');
  const response=await env.ORDER_CONTEXT.fetch(new Request('https://context/'+side,{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify(job)}));
  if(!response.ok)throw Error('Order context unavailable');
  const context=await response.json();
  if(context.accountId!==job.accountId||context.signalId!==job.signalId||context.allowed!==true||
    !/^[a-z0-9]{24}$/.test(context.walletId||'')||typeof context.revision!=='string'||!context.revision||context.revision.length>128||!context.evidence)throw Error('Verified order context rejected');
  return context;
}

export async function runAccountOrder({storage,env,job,side,contextReader=readOrderContext,
  connection=new Connection(env.RPC_URL,'confirmed'),prepareBuy=preparePumpCanaryBuy,prepareSell=preparePumpFullSell,
  signerFactory=createPrivySigner,fetcher=fetch}){
  if(env.SCOPE_EXECUTION_ENABLED!=='true'||env.SCOPE_ORDER_KILL_SWITCH!=='false')return {state:'blocked',reason:'execution_disabled'};
  const context=await contextReader(env,job,side),e=context.evidence;
  if(e.accountId!==job.accountId||e.signalId!==job.signalId)throw Error('Evidence identity mismatch');
  // One unresolved transaction per wallet prevents two fresh quotes spending
  // the same balance concurrently, including while an RPC response is lost.
  const prior=await storage.get('active-order');
  if(prior){const outcome=await reconcileOrder({storage,orderId:prior,rpcUrl:env.RPC_URL,fetcher});
    if(!['confirmed','failed'].includes(outcome.state))return {...outcome,reason:'prior_order_unresolved'};
    await storage.delete('active-order');}
  const prepared=side==='buy'?await prepareBuy({connection,wallet:e.wallet,mint:e.mint,budgetLamports:e.maxLamports}):
    await prepareSell({connection,wallet:e.wallet,mint:e.mint,amountRaw:e.rawBalance});
  const common={...e,walletId:context.walletId,executionEnabled:true,killSwitch:false,quoteAt:prepared.quoteAt,
    fullTransactionVerified:true,simulationPassed:true,rpcHealthy:true,balanceLamports:prepared.balanceLamports,
    rentLamports:prepared.reservedRentLamports,maxFeeLamports:'100000',minimumReserveLamports:'500000'};
  const result=side==='buy'?await reserveBuy(storage,{...common,maxLamports:prepared.maximumSpendLamports}):
    await reserveFullSell(storage,{...common,minSolOutLamports:prepared.minimumReceiveLamports});
  if(!result.reserved)return {state:'blocked',reason:result.reason,orderId:result.orderId};
  await storage.put('active-order',result.orderId);
  // Arm reconciliation before signing; restarts retain the order lock.
  await storage.setAlarm(Date.now()+10000);
  const outcome=await executeReservedOrder({storage,orderId:result.orderId,prepared,rpcUrl:env.RPC_URL,fetcher,
    sign:signerFactory(env),authorize:async()=>{
      const fresh=await contextReader(env,job,side);
      if(env.SCOPE_EXECUTION_ENABLED!=='true'||env.SCOPE_ORDER_KILL_SWITCH!=='false'||fresh.walletId!==context.walletId||
        fresh.revision!==context.revision||fresh.evidence.wallet!==e.wallet||fresh.evidence.mint!==e.mint||
        fresh.evidence.ownerVerified!==true||fresh.evidence.consentVerified!==true||fresh.evidence.delegationVerified!==true)return false;
      return await connection.getBlockHeight('confirmed')<=prepared.lastValidBlockHeight;
    }});
  return outcome;
}
