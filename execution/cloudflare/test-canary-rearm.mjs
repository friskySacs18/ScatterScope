import assert from 'node:assert/strict';
import {armCanary} from './canary-rearm.js';
const accountId='did:privy:account12345',data=new Map(),now=1000000;
const storage={transaction:async fn=>fn({get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),delete:async k=>data.delete(k)})};
assert.deepEqual(await armCanary(storage,accountId,now),{state:'armed',expiresAt:now+600000});
assert.equal((await armCanary(storage,accountId,now+1)).expiresAt,now+600000,'Double click does not extend an existing arm');
data.set('canary-attempt','buy-1');
assert.equal((await armCanary(storage,accountId,now+2)).state,'blocked','Missing receipt stays locked');
const buy={canary:true,state:'confirmed',receipt:{state:'confirmed'},accountId,wallet:'wallet',mint:'mint',id:'buy-1'};
const position={canary:true,state:'closed',buyOrderId:'buy-1',accountId,wallet:'wallet',mint:'mint'};
const sell={side:'sell',state:'confirmed',receipt:{state:'confirmed'},accountId,wallet:'wallet',mint:'mint',buyOrderId:'buy-1'};
data.set('order:buy-1',buy);data.set('position:mint',position);data.set('sell:mint','sell-1');data.set('order:sell-1',sell);
for(const [key,value] of [['order:buy-1',{...buy,state:'broadcast'}],['position:mint',{...position,state:'open'}],['order:sell-1',{...sell,state:'signing_unknown'}],['order:sell-1',{...sell,receipt:null}],['order:sell-1',{...sell,accountId:'did:privy:another12345'}]]){
  const previous=data.get(key);data.set(key,value);
  assert.equal((await armCanary(storage,accountId,now+3)).state,'blocked');assert.equal(data.get('canary-attempt'),'buy-1');
  data.set(key,previous);
}
data.set('active-order','uncertain-order');
assert.equal((await armCanary(storage,accountId,now+4)).reason,'prior_order_unresolved');data.delete('active-order');
data.set('mint:mint','buy-1');data.set('signal:old-signal:buy','buy-1');
assert.equal((await armCanary(storage,accountId,now+5)).state,'armed');
assert.equal(data.has('canary-attempt'),false);
assert.equal(data.get('mint:mint'),'buy-1');assert.equal(data.get('signal:old-signal:buy'),'buy-1');
assert.equal(data.get('canary-history:buy-1').sellOrderId,'sell-1');
assert.equal(data.get('canary-arm').armedAt,now+5);
console.log('PASS: completed-only repeat test, double-click idempotency, uncertain orders and cross-account records locked, permanent mint and signal locks retained');
