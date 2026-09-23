import assert from 'node:assert/strict';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import worker from '../dist/server/index.js';

const wallet=Keypair.generate().publicKey.toBase58(),mint=Keypair.generate().publicKey.toBase58();
const message=new TransactionMessage({payerKey:new PublicKey(wallet),recentBlockhash:Keypair.generate().publicKey.toBase58(),instructions:[new TransactionInstruction({programId:new PublicKey('11111111111111111111111111111111'),keys:[{pubkey:new PublicKey(mint),isSigner:false,isWritable:false}],data:Buffer.from([1])})]}).compileToV0Message();
const bytes=new VersionedTransaction(message).serialize();
let calls=[];
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});
  if(url.includes('pumpportal'))return new Response(bytes,{status:200});
  return Response.json({jsonrpc:'2.0',id:1,result:{value:{err:null}}});
};
async function post(body){return worker.fetch(new Request('https://scope.example/api/manual-trade/build',{method:'POST',headers:{'content-type':'application/json','origin':'https://scope.example'},body:JSON.stringify(body)}),{SOLANA_RPC_URL:'https://rpc.example'});}
try{
  let r=await post({wallet,mint,action:'buy',amount:5.01,slippage:2});assert.equal(r.status,400);assert.equal(calls.length,0);
  r=await post({wallet,mint,action:'sell',amount:101,slippage:2});assert.equal(r.status,400);assert.equal(calls.length,0);
  r=await post({wallet,mint,action:'buy',amount:.01,slippage:2});assert.equal(r.status,200);
  const built=await r.json();assert.equal(built.preflight,true);assert.equal(built.wallet,wallet);assert.equal(built.pool,'pump');assert.equal(calls.length,2);assert.equal(calls[0].body.publicKey,wallet);assert.equal(calls[0].body.amount,.01);assert.equal(calls[1].body.method,'simulateTransaction');
  globalThis.fetch=async url=>url.includes('pumpportal')?new Response(bytes,{status:200}):Response.json({jsonrpc:'2.0',result:{value:{err:{InstructionError:[0,'Custom']}}}});
  r=await post({wallet,mint,action:'buy',amount:.01,slippage:2});assert.equal(r.status,422);assert.match((await r.json()).error,/preflight failed/);
  console.log('Manual trade validation and preflight tests passed');
}finally{globalThis.fetch=original}
