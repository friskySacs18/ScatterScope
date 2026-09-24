import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const original=globalThis.fetch;
const wallet='8y83ZUQH8gsbYa9qEyYF6Wdqw3so7L9ThsWREuCVXWTr';
globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.mainnet-beta.solana.com');
  const call=JSON.parse(options.body);
  const results={1:{value:2500000000},2:{value:[{account:{data:{parsed:{info:{mint:wallet,tokenAmount:{amount:'12345',decimals:4,uiAmountString:'1.2345'}}}}}}]},3:{value:[]}};
  return new Response(JSON.stringify({id:call.id,result:results[call.id]}),{headers:{'content-type':'application/json'}});
};
try{
  const response=await worker.fetch(new Request('https://scope.test/api/portfolio?wallet='+wallet),{});
  assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.sol,2.5);assert.deepEqual(data.tokens,[{mint:wallet,uiAmount:'1.2345'}]);
  assert.equal((await worker.fetch(new Request('https://scope.test/api/portfolio?wallet=not-a-wallet'),{})).status,400);
  assert.equal((await worker.fetch(new Request('https://scope.test/portfolio'),{})).status,200);
  assert.match(await (await worker.fetch(new Request('https://scope.test/portfolio'),{})).text(),/Automatic callout snipes use a separate Scope account/);
  console.log('PASS: read-only Phantom portfolio route, RPC parsing and invalid address rejection');
}finally{globalThis.fetch=original}
