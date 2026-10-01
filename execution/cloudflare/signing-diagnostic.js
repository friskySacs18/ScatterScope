import {ComputeBudgetProgram,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {createPrivySigner} from './privy-signer.js';
import {verifySignedTransaction} from './signed-transaction.js';

// A signing-only health check has one Compute Budget instruction, no transfer
// or trade. Signed bytes are never stored, returned or submitted to an RPC.
export async function diagnoseSigning({storage,env,accountId,connection,signerFactory=createPrivySigner,now=Date.now}){
  const orders=await storage.list({prefix:'order:',limit:100});
  const order=[...orders.values()].filter(o=>o.accountId===accountId&&o.state==='not_submitted'&&o.failureHttpStatus===400)
    .sort((a,b)=>b.createdAt-a.createdAt)[0];
  if(!order)return {state:'not_needed'};
  const key='signing-diagnostic:'+order.id,cached=await storage.get(key);
  if(cached)return cached;
  const id=crypto.randomUUID();
  await storage.put(key,{state:'checking',orderId:order.id,at:now()});
  let timer,result;
  try{
    const blockhash=await connection.getLatestBlockhash('confirmed');
    const wire=new VersionedTransaction(new TransactionMessage({payerKey:new PublicKey(order.wallet),recentBlockhash:blockhash.blockhash,
      instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1000})]}).compileToV0Message());
    const transaction=Buffer.from(wire.serialize()).toString('base64');
    const sign=signerFactory(env);
    const signed=await Promise.race([sign({order:{...order,id},transaction}),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Object.assign(Error('Diagnostic timeout'),{code:'signer_timeout'})),18000);
    })]);
    await verifySignedTransaction({unsigned:transaction,signed,wallet:order.wallet});
    result={state:'passed',orderId:order.id,at:now()};
  }catch(error){result={state:'failed',orderId:order.id,at:now(),reason:/^[a-z_]{1,80}$/.test(error?.code||'')?error.code:'signer_diagnostic_unavailable',
    httpStatus:Number.isInteger(error?.httpStatus)?error.httpStatus:null,providerMessage:typeof error?.providerMessage==='string'?error.providerMessage.slice(0,360):null};}
  finally{clearTimeout(timer)}
  await storage.put(key,result);return result;
}
