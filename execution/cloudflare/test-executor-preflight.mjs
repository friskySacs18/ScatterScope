import assert from 'node:assert/strict';
import worker,{AccountOrderJournal} from './worker.js';
const hit=(path,method='GET',body)=>worker.fetch(new Request('https://executor.test'+path,{method,body}));
const status=await (await hit('/status')).json();
assert.equal(status.executionEnabled,false);assert.equal(status.ordersSupported,false);assert.equal(status.signerConfigured,false);
assert.equal(status.canaryPreparationConfigured,false);
assert.equal((await hit('/canary/prepare','POST',JSON.stringify({wallet:'x',mint:'y'}))).status,401);
const token='canary-test-secret-with-at-least-32-characters';
const preflight=await worker.fetch(new Request('https://executor.test/canary/prepare',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({wallet:'x',mint:'y'})}),{CANARY_PREPARE_TOKEN:token});
assert.equal(preflight.status,503);
for(const path of ['/orders/buy','/orders/sell','/orders/reconcile','/canary']){
  const response=await hit(path,'POST',JSON.stringify({executionEnabled:true,consentVerified:true,amount:'1000000000'}));
  assert.equal(response.status,423,path);
  assert.equal((await response.json()).executionEnabled,false);
}
assert.equal((await hit('/admin')).status,404);
const journal=new AccountOrderJournal({storage:{}});
assert.equal((await journal.fetch(new Request('https://internal/reserve',{method:'POST'}))).status,423);
console.log('Executor bootstrap exposes status and rejects every financial route, including forged admission flags');
