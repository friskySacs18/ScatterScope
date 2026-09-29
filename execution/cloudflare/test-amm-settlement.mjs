import assert from 'node:assert/strict';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';
import {verifySettlement} from './settlement.js';

const user=Keypair.generate(),mint=Keypair.generate().publicKey,pool=canonicalPumpPoolPda(mint);
const ix=new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:[
  {pubkey:pool,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:false}],data:Buffer.alloc(8)});
const tx=new VersionedTransaction(new TransactionMessage({payerKey:user.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58(),instructions:[ix]}).compileToV0Message());
tx.sign([user]);const signed=Buffer.from(tx.serialize()).toString('base64');
const keys=tx.message.staticAccountKeys,owner=user.publicKey.toBase58(),mintText=mint.toBase58();
const poolIndex=keys.findIndex(x=>x.toBase58()===pool.toBase58());assert.ok(poolIndex>0);
const receipt=(order,tokenBefore,tokenAfter,solDelta)=>{
  const pre=keys.map(()=>0),post=keys.map(()=>0);pre[0]=10000000;post[0]=10000000+solDelta;
  pre[poolIndex]=1000000;post[poolIndex]=1100000;
  return verifySettlement(order,{slot:123,transaction:[signed,'base64'],meta:{err:null,fee:5000,
    preBalances:pre,postBalances:post,preTokenBalances:[{mint:mintText,owner,accountIndex:2,uiTokenAmount:{amount:String(tokenBefore)}}],
    postTokenBalances:[{mint:mintText,owner,accountIndex:2,uiTokenAmount:{amount:String(tokenAfter)}}]}});
};
const base={wallet:owner,mint:mintText,signedTransaction:signed};
const buy=receipt({...base,prepared:{venue:'pump-amm',tokenAmountRaw:'1000',reservedRentLamports:'100000',maximumSpendLamports:'2000000'}},0,1000,-2105000);
assert.equal(buy.tradeCostLamports,'2000000');assert.equal(buy.rentPaidLamports,'100000');
const sell=receipt({...base,side:'sell',amountRaw:'1000',prepared:{venue:'pump-amm',reservedRentLamports:'100000',minimumReceiveLamports:'1900000'}},1000,0,1795000);
assert.equal(sell.state,'confirmed');
assert.throws(()=>receipt({...base,side:'sell',amountRaw:'1000',prepared:{venue:'pump-amm',reservedRentLamports:'100000',minimumReceiveLamports:'1900001'}},1000,0,1795000),/expected amounts/);
assert.throws(()=>receipt({...base,side:'sell',amountRaw:'1000',prepared:{venue:'pump-amm',reservedRentLamports:'0',minimumReceiveLamports:'1900000'}},1000,0,1795000),/expected amounts/);
console.log('PumpSwap pool extension rent is excluded from buy cost and sell minimum reconciliation');
