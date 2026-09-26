import assert from 'node:assert/strict';
import {loadPaginatedCallerHistory} from './history-backfill.js';

const wallet='11111111111111111111111111111111';
const mint='So11111111111111111111111111111111111111112';
const other='11111111111111111111111111111111';
const now=Date.now();
const row=(id,createdAt,coinMint=mint)=>({id,wallet,coinMint,createdAt});
let called=0;
const pages=[{items:[row('new',now-1000),row('middle',now-2000,other)],hasMore:true,nextBefore:'cursor-1'},
  {items:[row('old',now-3000)],hasMore:false,nextBefore:null}];
const fetcher=async (url,options)=>{
  assert.match(url,/^https:\/\/api\.fomoscan\.sh\/v2\/pump\/thesis\/wallet\//);
  assert.equal(options.headers.authorization,'Bearer test-provider-key-123456');
  assert.equal(new URL(url).searchParams.get('before'),called===0?null:'cursor-1');
  return Response.json({data:pages[called++]});
};
const result=await loadPaginatedCallerHistory(wallet,{apiKey:'test-provider-key-123456',fetcher});
assert.equal(called,2);assert.equal(result.paginationExhausted,true);assert.equal(result.callCount,3);
assert.equal(result.firstByMint[mint].id,'old');
assert.equal(result.oldestAt,now-3000);
const one=page=>loadPaginatedCallerHistory(wallet,{apiKey:'test-provider-key-123456',fetcher:async()=>Response.json({data:page})});
await assert.rejects(one({items:[row('same',now-1000),row('same',now-2000)],hasMore:false}),/Inconsistent/);
await assert.rejects(one({items:[{...row('wrong',now-1000),wallet:mint}],hasMore:false}),/Inconsistent/);
await assert.rejects(one({items:[row('new',now-1000)],hasMore:true,nextBefore:null}),/cursor/);
await assert.rejects(loadPaginatedCallerHistory(wallet,{apiKey:'test-provider-key-123456',maxPages:1,
  fetcher:async()=>Response.json({data:pages[0]})}),/page limit reached/);
await assert.rejects(loadPaginatedCallerHistory(wallet,{apiKey:'test-provider-key-123456',
  fetcher:async()=>Response.json({error:'quota'},{status:402})}),/HTTP 402/);
console.log('Paginated history candidate rejects gaps, duplicates, foreign wallets and provider failure');
