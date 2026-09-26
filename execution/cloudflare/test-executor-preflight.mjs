import assert from 'node:assert/strict';
import worker,{AccountOrderJournal} from './worker.js';
const hit=(path,method='GET',body)=>worker.fetch(new Request('https://executor.test'+path,{method,body}));
const status=await (await hit('/status')).json();
assert.equal(status.executionEnabled,false);assert.equal(status.ordersSupported,false);assert.equal(status.signerConfigured,false);
for(const path of ['/orders/buy','/orders/sell','/orders/reconcile','/canary']){
  const response=await hit(path,'POST',JSON.stringify({executionEnabled:true,consentVerified:true,amount:'1000000000'}));
  assert.equal(response.status,423,path);
  assert.equal((await response.json()).executionEnabled,false);
}
assert.equal((await hit('/admin')).status,404);
const journal=new AccountOrderJournal({storage:{}});
assert.equal((await journal.fetch(new Request('https://internal/reserve',{method:'POST'}))).status,423);
console.log('Executor bootstrap exposes status and rejects every financial route, including forged admission flags');
