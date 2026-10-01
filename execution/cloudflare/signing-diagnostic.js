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
  const key='signing-diagnostic:'+order.id+(kind==='trade'?':trade-wallet-funding-v5':''),cached=await storage.get(key);
  if(cached)return cached;
  const id=crypto.randomUUID();
  await storage.put(key,{state:'checking',orderId:order.id,at:now()});
  let timer,result,transactionSummary=null;
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
      const wire=VersionedTransaction.deserialize(Buffer.from(transaction,'base64')),keys=wire.message.staticAccountKeys;
      transactionSummary={wallet:order.wallet,mint:order.mint,venue:prepared.venue||'pump-curve',
        programIds:wire.message.compiledInstructions.map(ix=>keys[ix.programIdIndex].toBase58()),systemTransfers:[]};
      for(const ix of wire.message.compiledInstructions)if(keys[ix.programIdIndex].toBase58()==='11111111111111111111111111111111'&&ix.data.length===12&&
        new DataView(ix.data.buffer,ix.data.byteOffset).getUint32(0,true)===2)transactionSummary.systemTransfers.push({
          from:keys[ix.accountKeyIndexes[0]].toBase58(),to:keys[ix.accountKeyIndexes[1]].toBase58(),
          lamports:new DataView(ix.data.buffer,ix.data.byteOffset).getBigUint64(4,true).toString()});
      const walletResponse=await fetch('https://api.privy.io/v1/wallets/'+encodeURIComponent(order.walletId),{
        headers:{authorization:'Basic '+btoa('cmuejmq9g00eg0cla13182nah:'+env.PRIVY_APP_SECRET),'privy-app-id':'cmuejmq9g00eg0cla13182nah'},signal:AbortSignal.timeout(6000)});
      if(walletResponse.ok){const wallet=await walletResponse.json();
        if(wallet.id===order.walletId&&wallet.address===order.wallet){
          transactionSummary.walletPolicyIds=(wallet.policy_ids||[]).filter(id=>/^[a-z0-9]{24}$/.test(id));
          transactionSummary.signerPolicyIds=(wallet.additional_signers?.find(s=>s.signer_id===env.SCOPE_PRIVY_SIGNER_QUORUM_ID)?.override_policy_ids||[]).filter(id=>/^[a-z0-9]{24}$/.test(id));
        }}
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
    result={state:'passed',kind,orderId:order.id,at:now(),transactionSummary};
  }catch(error){result={state:'failed',kind,orderId:order.id,at:now(),reason:/^[a-z_]{1,80}$/.test(error?.code||'')?error.code:'signer_diagnostic_unavailable',
    httpStatus:Number.isInteger(error?.httpStatus)?error.httpStatus:null,providerMessage:typeof error?.providerMessage==='string'?error.providerMessage.slice(0,360):null,transactionSummary};}
  finally{clearTimeout(timer)}
  await storage.put(key,result);return result;
}
