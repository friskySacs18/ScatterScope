import assert from 'node:assert/strict';
import {recordCallerExit} from './caller-loss-alert.js';
import worker from './worker.js';
const caller='11111111111111111111111111111111';
const map=new Map(),txn={get:async key=>map.get(key),put:async(key,value)=>map.set(key,value),delete:async key=>map.delete(key)};
const position={costLamports:'2000000'},buy={caller,receipt:{feeLamports:'5000'}};
for(let i=1;i<=5;i++){
  await recordCallerExit(txn,{position,buy,receipt:{solDeltaLamports:'1900000',rentPaidLamports:'0'},sellOrderId:'sell-'+i,settledAt:i});
  assert.equal(map.get('caller-streak:'+caller).losses,i);
  assert.equal(map.has('caller-alert:'+caller),i>=4);
}
await recordCallerExit(txn,{position,buy,receipt:{solDeltaLamports:'2200000',rentPaidLamports:'0'},sellOrderId:'profit',settledAt:6});
assert.equal(map.get('caller-streak:'+caller).losses,0);
assert.equal(map.has('caller-alert:'+caller),false);
await recordCallerExit(txn,{position,buy:{...buy,caller:undefined},receipt:{solDeltaLamports:'0',rentPaidLamports:'0'},sellOrderId:'unknown',settledAt:7});
assert.equal(map.get('caller-streak:'+caller).losses,0);
const token='private-alert-service-token-32-characters';
const request=authorization=>new Request('https://executor.test/orders/alerts',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({accountId:'did:privy:account12345'})});
assert.equal((await worker.fetch(request('Bearer wrong'),{ORDER_SERVICE_TOKEN:token})).status,401);
let forwarded=false;
const env={ORDER_SERVICE_TOKEN:token,ACCOUNT_ORDERS:{idFromName:x=>x,get:()=>({fetch:async()=>{forwarded=true;return Response.json({alerts:[]})}})}};
assert.equal((await worker.fetch(request('Bearer '+token),env)).status,200);
assert.equal(forwarded,true);
