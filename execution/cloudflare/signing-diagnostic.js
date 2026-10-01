import {ComputeBudgetProgram,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {createPrivySigner} from './privy-signer.js';
import {verifySignedTransaction} from './signed-transaction.js';
import {preparePumpCanaryBuy} from './pump-canary-build.js';
import {preparePumpAmmBuy} from './pump-amm-build.js';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';
import {inspectPumpAmmBuyTransaction} from './inspect-pump-amm.js';

// Check compute-only signing first, then the rejected buy's verified builder.
// Signed bytes are never stored, returned or submitted to an RPC.
export async function diagnoseSigning({storage,env,accountId,connection,signerFactory=createPrivySigner,now=Date.now,
  kind='compute',prepareBuy=preparePumpCanaryBuy,prepareAmmBuy=preparePumpAmmBuy}){
  const orders=await storage.list({prefix:'order:',limit:100});
  const order=[...orders.values()].filter(o=>o.accountId===accountId&&o.side!=='sell'&&o.state==='not_submitted'&&o.failureHttpStatus===400)
    .sort((a,b)=>b.createdAt-a.createdAt)[0];
  if(!order)return {state:'not_needed'};
  if(!['compute','trade'].includes(kind))throw Error('Invalid diagnostic kind');
  const key='signing-diagnostic:'+order.id+(kind==='trade'?':trade':''),cached=await storage.get(key);
  if(cached)return cached;
  const id=crypto.randomUUID();
  await storage.put(key,{state:'checking',orderId:order.id,at:now()});
  let timer,result;
  try{
    let transaction;
    if(kind==='trade'){
      let prepared;
      try{prepared=await prepareBuy({connection,wallet:order.wallet,mint:order.mint,budgetLamports:order.amountLamports})}
      catch(error){if(error?.message!=='migrated_pool_requires_pumpswap_buy')throw error;
        prepared=await prepareAmmBuy({connection,wallet:order.wallet,mint:order.mint,budgetLamports:order.amountLamports});}
      if(prepared.wallet!==order.wallet||prepared.mint!==order.mint||prepared.side!=='buy'||
        !/^[1-9]\d{0,19}$/.test(prepared.maximumSpendLamports||'')||BigInt(prepared.maximumSpendLamports)>BigInt(order.amountLamports))
        throw Error('Diagnostic preparation mismatch');
      const inspected=prepared.venue==='pump-amm'?inspectPumpAmmBuyTransaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,
        amountRaw:prepared.tokenAmountRaw,limitLamports:prepared.maximumSpendLamports,tokenProgram:prepared.tokenProgram}):
        inspectPumpV2Transaction(prepared.transaction,{wallet:order.wallet,mint:order.mint,side:'buy',amountRaw:prepared.tokenAmountRaw,limitLamports:prepared.maximumSpendLamports});
      if(!inspected.valid)throw Error('Diagnostic preparation rejected');
      transaction=prepared.transaction;
    }else{
      const blockhash=await connection.getLatestBlockhash('confirmed');
      const wire=new VersionedTransaction(new TransactionMessage({payerKey:new PublicKey(order.wallet),recentBlockhash:blockhash.blockhash,
        instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1000})]}).compileToV0Message());
      transaction=Buffer.from(wire.serialize()).toString('base64');
    }
    const sign=signerFactory(env);
    const signed=await Promise.race([sign({order:{...order,id},transaction}),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Object.assign(Error('Diagnostic timeout'),{code:'signer_timeout'})),18000);
    })]);
    await verifySignedTransaction({unsigned:transaction,signed,wallet:order.wallet});
    result={state:'passed',kind,orderId:order.id,at:now()};
  }catch(error){result={state:'failed',kind,orderId:order.id,at:now(),reason:/^[a-z_]{1,80}$/.test(error?.code||'')?error.code:'signer_diagnostic_unavailable',
    httpStatus:Number.isInteger(error?.httpStatus)?error.httpStatus:null,providerMessage:typeof error?.providerMessage==='string'?error.providerMessage.slice(0,360):null};}
  finally{clearTimeout(timer)}
  await storage.put(key,result);return result;
}
