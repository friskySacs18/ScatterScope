import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import worker from '../worker/index.js';

const caller='11111111111111111111111111111111',mint='So11111111111111111111111111111111111111112';
const secret='private-monitor-test-secret-1234567890';
const observations=new Map(),states=new Map(),history=new Map();
const db={prepare(sql){return {bind(...args){return {
  async all(){if(sql.startsWith('SELECT callers_json'))return {results:[{callers:JSON.stringify([{wallet:caller}])}]};return {results:[]}},
  async run(){let changes=1;if(sql.startsWith('INSERT OR IGNORE INTO monitored_callouts')){if(observations.has(args[0]))changes=0;else observations.set(args[0],args)}if(sql.startsWith('INSERT INTO caller_mint_history')){const earlier=history.get(args[0]);if(!earlier||args[4]<earlier[4])history.set(args[0],args)}if(sql.startsWith('INSERT INTO callout_ingest_state'))states.set(args[0],args);return {meta:{changes}}}
}},async all(){return {results:[{callers:JSON.stringify([{wallet:caller}])}]}}}},async batch(statements){return Promise.all(statements.map(statement=>statement.run()))}};
const env={SCOPE_MONITOR_SECRET:secret,DB:db};
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  assert.match(String(url),/callout\/list\/1111/);
  return new Response(JSON.stringify({callouts:[{calloutId:'4e1cf86c-a6db-459a-9e8a-39cd381fa4b1',userId:caller,coinMint:mint,createdAt:Date.now()-8000},{calloutId:'5e1cf86c-a6db-459a-9e8a-39cd381fa4b1',userId:caller,coinMint:mint,createdAt:Date.now()-6000}]}),{status:200});
};
async function call(timestamp=Date.now(),bad=false){const body='{}',signed=createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');return worker.fetch(new Request('https://site.test/api/automation/monitor-tick',{method:'POST',headers:{'content-type':'application/json','x-scope-timestamp':String(timestamp),'x-scope-signature':bad?'0'.repeat(64):signed},body}),env)}
try{
  assert.equal((await call(Date.now()-30000)).status,401);
  assert.equal((await call(Date.now(),true)).status,401);
  assert.equal(observations.size,0);
  const success=await call();assert.equal(success.status,200);const first=await success.json();assert.equal(first.executionEnabled,false);assert.equal(first.newlyObserved,2);
  assert.equal(observations.size,2);assert.ok(states.has('pump-monitor'));
  assert.equal(history.size,1);assert.equal(history.get(caller+':'+mint)[3],'4e1cf86c-a6db-459a-9e8a-39cd381fa4b1');
  const repeat=await call();assert.equal(repeat.status,200);assert.equal((await repeat.json()).newlyObserved,0);assert.equal(observations.size,2);assert.equal(states.get('pump-monitor')[2],null);
}finally{globalThis.fetch=originalFetch}
console.log('Authenticated monitor tick, stale request rejection, observation persistence and dedup verified');
