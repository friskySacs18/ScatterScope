import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import worker from '../dist/server/index.js';

const secret='long-test-only-ingestion-secret-32-characters';
const caller='8y83ZUQH8gsbYa9qEyYF6Wdqw3so7L9ThsWREuCVXWTr';
const mint='So11111111111111111111111111111111111111112';
const rows=new Map(),state={lastSeenAt:0};
const db={prepare(sql){return{bind(...args){return{
  async first(){return state.lastSeenAt?{lastSeenAt:state.lastSeenAt}:null},
  async all(){return{results:[...rows.values()].map(x=>({id:x.id,calloutId:x.calloutId,caller:x.caller,mint:x.mint,publishedAt:x.publishedAt,observedAt:x.observedAt}))}},
  async run(){
    if(sql.startsWith('INSERT OR IGNORE')){const [id,calloutId,caller,mint,publishedAt,observedAt]=args;if(rows.has(id))return{meta:{changes:0}};rows.set(id,{id,calloutId,caller,mint,publishedAt,observedAt});return{meta:{changes:1}}}
    state.lastSeenAt=args[1];return{meta:{changes:1}};
  }
}}}}};
const env={DB:db,CALLOUT_INGEST_SECRET:secret};
async function post(data,{tamper=false}={}){
  const body=JSON.stringify(data),signature=createHmac('sha256',secret).update(body).digest('hex');
  return worker.fetch(new Request('https://scope.example/api/callouts/ingest',{method:'POST',headers:{'content-type':'application/json','x-scope-signature':tamper?'0'.repeat(64):signature},body}),env);
}
const now=Date.now(),call={type:'callout',id:'callout.event-123',calloutId:'9ab3177c-7b35-4d99-9cca-8b426f74a270',caller,mint,publishedAt:now-5000,observedAt:now};
assert.equal((await post(call,{tamper:true})).status,401);
assert.equal((await post({...call,observedAt:now-60000})).status,400);
assert.equal((await post({...call,mint:'invalid'})).status,400);
assert.equal((await post(call)).status,200);
assert.equal((await(await post(call)).json()).duplicate,true);
let response=await worker.fetch(new Request('https://scope.example/api/callouts/recent'),env);
assert.equal(response.status,200);
assert.deepEqual((await response.json()).callouts,[{id:call.id,calloutId:call.calloutId,caller,mint,publishedAt:call.publishedAt,observedAt:now}]);
state.lastSeenAt=now-60000;
assert.equal((await worker.fetch(new Request('https://scope.example/api/callouts/recent'),env)).status,503);
assert.equal((await post({type:'heartbeat',observedAt:Date.now()})).status,200);
assert.equal((await worker.fetch(new Request('https://scope.example/api/callouts/recent'),env)).status,200);
assert.equal((await worker.fetch(new Request('https://scope.example/api/execution-status'),env)).status,200);
assert.equal((await(await worker.fetch(new Request('https://scope.example/api/execution-status'),env)).json()).spendCapSol,0);
const readiness=await(await worker.fetch(new Request('https://scope.example/api/automation/readiness'),env)).json();
assert.equal(readiness.sourceLive,true);
assert.equal(readiness.orderExecutionEnabled,false);
console.log('PASS: authenticated intake, deduplication, stale detection and zero-spend interlock');
