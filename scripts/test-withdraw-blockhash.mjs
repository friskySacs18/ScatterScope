import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const original=globalThis.fetch;
const calls=[];
const valid='8y83ZUQH8gsbYa9qEyYF6Wdqw3so7L9ThsWREuCVXWTr';
globalThis.fetch=async(url,options)=>{
  calls.push(url);
  assert.equal(JSON.parse(options.body).method,'getLatestBlockhash');
  if(url==='https://rpc.example')throw Error('primary unavailable');
  return Response.json({jsonrpc:'2.0',result:{value:{blockhash:valid,lastValidBlockHeight:100}}});
};
try{
  const response=await worker.fetch(new Request('https://scope.example/api/account/blockhash'),{SOLANA_RPC_URL:'https://rpc.example'});
  assert.equal(response.status,200);
  assert.equal((await response.json()).blockhash,valid);
  assert.deepEqual(calls,['https://rpc.example','https://solana-rpc.publicnode.com']);
  console.log('Withdrawal blockhash falls back after primary RPC failure.');
}finally{globalThis.fetch=original}
