import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import worker,{AccountOrderJournal} from './worker.js';
import {readOrderContext,runAccountOrder} from './account-executor.js';
import {serviceConfiguration} from './service-config.js';
const token='service-test-token-that-is-not-a-real-secret';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const base={RPC_URL:'https://api.mainnet-beta.solana.com/',ORDER_SERVICE_TOKEN:token,PRIVY_APP_SECRET:'test',SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM:privateKey.export({format:'der',type:'pkcs8'}).toString('base64'),SCOPE_PRIVY_SIGNER_QUORUM_ID:'igsys5hz5fmsly8v2q242jgo',SCOPE_PRIVY_POLICY_ID:'qhtl0rqr7553234g6zb7dna2',SCOPE_AUTOMATION_PILOT_ACCOUNT:'did:privy:account123',SCOPE_EXECUTION_ENABLED:'true',SCOPE_ORDER_KILL_SWITCH:'false'};
let forwarded=0;
const ACCOUNT_ORDERS={idFromName:id=>id,get:()=>({fetch:async request=>{forwarded++;return Response.json({received:await request.json()})}})};
const ORDER_CONTEXT={fetch:async()=>Response.json({})};
const request=body=>new Request('https://executor.test/orders/buy',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});
assert.equal((await worker.fetch(request({accountId:'did:privy:account123',signalId:'call-1'}),{...base,ACCOUNT_ORDERS})).status,503,'Cannot trade without private context');
assert.equal((await worker.fetch(request({accountId:'did:privy:account123',signalId:'call-1',consentVerified:true}),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,400,'Forged client evidence is rejected');
assert.equal(forwarded,0);
assert.equal((await worker.fetch(request({accountId:'did:privy:account123',signalId:'call-1'}),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT,SCOPE_ORDER_KILL_SWITCH:'true'})).status,503);
assert.equal(forwarded,0);
assert.equal((await worker.fetch(request({accountId:'did:privy:account123',signalId:'call-1'}),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,200);
assert.equal(forwarded,1);
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT}).executionEnabled,true);
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT}).canaryAvailable,true);
const canaryRequest=(headers,body)=>new Request('https://executor.test/orders/canary/buy',{
  method:'POST',headers,body:JSON.stringify(body)});
const validCanary={accountId:'did:privy:account123',signalId:'callout-12345'};
assert.equal((await worker.fetch(canaryRequest({'content-type':'application/json'},validCanary),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,401);
assert.equal((await worker.fetch(canaryRequest({authorization:'Bearer '+token},{...validCanary,maxLamports:'999999999'}),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,400);
assert.equal(forwarded,1);
assert.equal((await worker.fetch(canaryRequest({authorization:'Bearer '+token},validCanary),{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,200);
assert.equal(forwarded,2,'One-shot route reaches only the private per-account journal');
const armRequest=new Request('https://executor.test/orders/canary/arm',{
  method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({accountId:validCanary.accountId})});
assert.equal((await worker.fetch(armRequest,{...base,ACCOUNT_ORDERS,ORDER_CONTEXT})).status,200);
assert.equal(forwarded,3,'Arming routes only to the private per-account journal');
const durable=new Map();let alarmAt=null;
const storage={get:async key=>durable.get(key),put:async(key,value)=>durable.set(key,value),
  getAlarm:async()=>alarmAt,setAlarm:async at=>{alarmAt=at}};
const journal=new AccountOrderJournal({storage},{...base,ACCOUNT_ORDERS,ORDER_CONTEXT});
const armed=await journal.fetch(new Request('https://internal/canary/arm',{
  method:'POST',body:JSON.stringify({accountId:validCanary.accountId})}));
assert.equal((await armed.json()).state,'armed');
assert.ok(alarmAt>Date.now());
assert.equal((await (await journal.fetch(new Request('https://internal/canary/status',{
  method:'POST',body:'{}'}))).json()).state,'armed');
durable.set('canary-attempt','a-prior-attempt');
assert.equal((await journal.fetch(new Request('https://internal/canary/arm',{
  method:'POST',body:JSON.stringify({accountId:validCanary.accountId})}))).status,409);
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT}).exitPathVerified,true);
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT,SCOPE_AUTOMATION_PILOT_ACCOUNT:''}).executionEnabled,false);
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT,RPC_URL:'https://untrusted.example/'}).executionEnabled,false);
const contextToken='private-context-credential-just-for-this-test';
assert.equal(serviceConfiguration({...base,ACCOUNT_ORDERS,ORDER_CONTEXT_TOKEN:contextToken}).contextConfigured,true);
let calledUrl='';
await assert.rejects(readOrderContext({ORDER_CONTEXT_TOKEN:contextToken},{accountId:'did:privy:account123',signalId:'call-1'},'buy',async(url,options)=>{
  calledUrl=url;assert.deepEqual(JSON.parse(options.body),{accountId:'did:privy:account123',signalId:'call-1',side:'buy'});
  assert.equal(options.headers.authorization,'Bearer '+contextToken);
  return Response.json({allowed:false,blockers:['mint_already_reserved_for_account']});
}),/rejected/);
assert.equal(calledUrl,'https://scopetrade.live/api/automation/order-context');
await assert.rejects(readOrderContext({}, {accountId:'did:privy:account123',signalId:'call-1'},'buy'),/not connected/);
await assert.rejects(readOrderContext({ORDER_CONTEXT:{fetch:async()=>Response.json({allowed:true,accountId:'did:privy:someoneelse',signalId:'call-1',walletId:'a'.repeat(24),revision:'1',evidence:{}})}},{accountId:'did:privy:account123',signalId:'call-1'},'buy'),/rejected/);
await assert.rejects(readOrderContext({ORDER_CONTEXT:{fetch:async request=>{
  assert.equal(new URL(request.url).pathname,'/api/automation/order-context');
  assert.deepEqual(await request.json(),{accountId:'did:privy:account123',signalId:'call-1',side:'sell'});
  return Response.json({allowed:false});
}}},{accountId:'did:privy:account123',signalId:'call-1'},'sell'),/rejected/);
assert.equal((await runAccountOrder({env:{...base,SCOPE_EXECUTION_ENABLED:'false'},job:{},side:'buy',connection:{},storage:{}})).reason,'execution_disabled');
await assert.rejects(runAccountOrder({env:{...base,SCOPE_EXECUTION_ENABLED:'false',SCOPE_ORDER_KILL_SWITCH:'true'},
  job:validCanary,side:'buy',canary:true,connection:{},storage:{get:async()=>undefined},
  contextReader:async()=>({walletId:'a'.repeat(24),revision:'r',evidence:{accountId:validCanary.accountId,
    signalId:validCanary.signalId,canary:true,maxLamports:'3000000'}})}),/Canary context rejected/);
const exitJob={accountId:'did:privy:account123',signalId:'callout-12345'};
const exitEvidence={accountId:exitJob.accountId,signalId:exitJob.signalId,wallet:'11111111111111111111111111111111',mint:'So11111111111111111111111111111111111111112'};
const exitContext={walletId:'a'.repeat(24),revision:'exit-revision',evidence:exitEvidence};
const open={state:'open',accountId:exitJob.accountId,signalId:exitJob.signalId,wallet:exitEvidence.wallet,mint:exitEvidence.mint,
  buyOrderId:crypto.randomUUID(),amountRaw:'1000',costLamports:'2000000',rules:{profitPercent:25,stopPercent:25}};
const intent={state:'pending-verification',buyOrderId:open.buyOrderId,mint:open.mint,wallet:open.wallet};
const exitStore={get:async key=>key==='position:'+open.mint?open:key==='exit-intent:'+open.mint?intent:undefined};
let quoteCalls=0;
const exitArgs={env:base,job:exitJob,side:'sell',storage:exitStore,connection:{},contextReader:async()=>exitContext,
  quoteSell:async()=>{quoteCalls++;return {wallet:open.wallet,mint:open.mint,amountRaw:'1000',observedAt:Date.now(),expectedSolOutLamports:'2200000'}}};
assert.equal((await runAccountOrder(exitArgs)).reason,'exit_target_not_currently_met');
assert.equal(quoteCalls,1);
let canarySellPrepared=0;
await assert.rejects(runAccountOrder({...exitArgs,canary:true,
  storage:{get:async key=>key==='position:'+open.mint?{...open,canary:true}:key==='exit-intent:'+open.mint?intent:undefined},
  contextReader:async()=>({...exitContext,evidence:{...exitEvidence,canary:true}}),
  prepareSell:async()=>{canarySellPrepared++;throw Error('canary_sell_builder_reached')}}),/canary_sell_builder_reached/);
assert.equal(canarySellPrepared,1,'Confirmed canary may exit immediately without waiting for profit or stop');
assert.equal((await runAccountOrder({...exitArgs,storage:{get:async key=>key.startsWith('position:')?{...open,accountId:'did:privy:other-account'}:intent}})).reason,'verified_exit_intent_required');
assert.equal(quoteCalls,2,'No quote or transaction builder runs for another account');
assert.equal((await runAccountOrder({...exitArgs,storage:{get:async key=>key.startsWith('position:')?open:undefined}})).reason,'verified_exit_intent_required');
assert.equal(quoteCalls,2,'A browser sell cannot bypass the recorded exit intent');
console.log('PASS: service auth, kill switch, context binding, strict request fields, private account routing, cross-account context rejection');


const unarmed={env:base,job:{accountId:'did:privy:other12345',signalId:'callout-12345'},side:'buy',storage:{},connection:{},contextReader:async()=>{throw Error('must not read context')}};
assert.equal((await runAccountOrder(unarmed)).reason,'account_pilot_required');
assert.equal((await runAccountOrder({...unarmed,job:exitJob,contextReader:async()=>({...exitContext,evidence:{...exitEvidence,maxLamports:'3000000'}})})).reason,'pilot_buy_limit_exceeded');
const migration={...unarmed,job:exitJob,storage:{get:async()=>undefined},contextReader:async()=>({...exitContext,evidence:{...exitEvidence,maxLamports:'2000000'}}),prepareBuy:async()=>{throw Error('migrated_pool_requires_pumpswap_buy')},prepareAmmBuy:async()=>{throw Error('must not prepare a migrated pilot buy')}};
assert.equal((await runAccountOrder(migration)).reason,'pilot_requires_bonding_curve');
console.log('PASS: pilot account restriction, independent spend cap, migrated buy rejection');
